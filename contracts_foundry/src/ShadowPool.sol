// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IPriceFeed {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
    function getPrice(address token) external view returns (uint256);
}

/**
 * @title ShadowPool
 * @notice Confidential Batch Auction DEX with MEV protection + Instant Swap
 * @dev Orders are encrypted using iExec DataProtector before submission
 *      Also supports instant swaps using price feed for testing
 */
contract ShadowPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Order status enum
    enum OrderStatus {
        Pending,
        Executed,
        Cancelled,
        Expired
    }

    // Order structure
    struct Order {
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 limitPrice;      // For limit orders (0 = market order)
        uint256 expiry;          // Expiration timestamp (0 = no expiry)
        bytes32 datasetAddress;  // iExec DataProtector dataset address
        bytes encryptedData;     // Encrypted order details
        OrderStatus status;
        uint256 batchId;
        uint256 timestamp;
    }

    // State variables
    uint256 public currentBatchId;
    uint256 public batchInterval;
    uint256 public lastBatchTimestamp;
    
    // Price feed for instant swaps
    IPriceFeed public priceFeed;
    
    // Liquidity for instant swaps (token => balance)
    mapping(address => uint256) public liquidity;
    
    // Order storage
    mapping(bytes32 => Order) public orders;
    bytes32[] public pendingOrderIds;
    mapping(address => bytes32[]) public userOrders;
    
    // Batch history
    mapping(uint256 => bytes32[]) public batchOrders;

    // Events
    event OrderSubmitted(
        bytes32 indexed orderId,
        address indexed owner,
        uint256 indexed batchId,
        address tokenIn,
        uint256 amountIn
    );
    
    event OrderCancelled(
        bytes32 indexed orderId,
        address indexed owner
    );
    
    event BatchTriggered(
        uint256 indexed batchId,
        uint256 orderCount,
        uint256 timestamp
    );
    
    event BatchSettled(
        uint256 indexed batchId,
        uint256 matchCount
    );
    
    event InstantSwap(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );
    
    event LiquidityAdded(
        address indexed token,
        uint256 amount
    );
    
    event PriceFeedUpdated(
        address indexed newPriceFeed
    );
    
    event LimitOrderExecuted(
        bytes32 indexed orderId,
        address indexed owner,
        uint256 amountIn,
        uint256 amountOut,
        uint256 executionPrice
    );
    
    event OrderExpired(
        bytes32 indexed orderId,
        address indexed owner
    );

    // Constructor
    constructor(uint256 _batchInterval) Ownable(msg.sender) {
        batchInterval = _batchInterval;
        lastBatchTimestamp = block.timestamp;
        currentBatchId = 1;
    }
    
    /**
     * @notice Set the price feed contract
     * @param _priceFeed Address of the price feed contract
     */
    function setPriceFeed(address _priceFeed) external onlyOwner {
        priceFeed = IPriceFeed(_priceFeed);
        emit PriceFeedUpdated(_priceFeed);
    }
    
    /**
     * @notice Add liquidity for instant swaps
     * @param token Token address
     * @param amount Amount to add
     */
    function addLiquidity(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        liquidity[token] += amount;
        emit LiquidityAdded(token, amount);
    }
    
    /**
     * @notice Withdraw liquidity (owner only)
     * @param token Token address
     * @param amount Amount to withdraw
     */
    function withdrawLiquidity(address token, uint256 amount) external onlyOwner {
        require(liquidity[token] >= amount, "Insufficient liquidity");
        liquidity[token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    /**
     * @notice Execute instant swap at current price
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @param minAmountOut Minimum output amount (slippage protection)
     * @return amountOut Actual output amount
     */
    function instantSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(address(priceFeed) != address(0), "Price feed not set");
        require(amountIn > 0, "Amount must be > 0");
        require(tokenIn != tokenOut, "Same token");
        
        // Calculate output amount from price feed
        amountOut = priceFeed.getAmountOut(tokenIn, tokenOut, amountIn);
        require(amountOut >= minAmountOut, "Slippage exceeded");
        require(liquidity[tokenOut] >= amountOut, "Insufficient liquidity");
        
        // Transfer input tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        liquidity[tokenIn] += amountIn;
        
        // Transfer output tokens to user
        liquidity[tokenOut] -= amountOut;
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        emit InstantSwap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
        
        return amountOut;
    }
    
    /**
     * @notice Get quote for instant swap (view only)
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount of input token
     * @return amountOut Expected output amount
     */
    function getSwapQuote(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        require(address(priceFeed) != address(0), "Price feed not set");
        return priceFeed.getAmountOut(tokenIn, tokenOut, amountIn);
    }

    /**
     * @notice Submit a market order with encrypted data
     */
    function submitOrder(
        bytes calldata encryptedData,
        bytes32 datasetAddress,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external nonReentrant returns (bytes32 orderId) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token address");

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Generate unique order ID
        orderId = keccak256(
            abi.encodePacked(
                msg.sender,
                tokenIn,
                tokenOut,
                amountIn,
                block.timestamp,
                pendingOrderIds.length
            )
        );

        // Create order
        orders[orderId] = Order({
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOutMin: 0,
            limitPrice: 0,
            expiry: 0,
            datasetAddress: datasetAddress,
            encryptedData: encryptedData,
            status: OrderStatus.Pending,
            batchId: currentBatchId,
            timestamp: block.timestamp
        });

        _recordOrder(orderId);
        emit OrderSubmitted(orderId, msg.sender, currentBatchId, tokenIn, amountIn);

        return orderId;
    }

    /**
     * @notice Submit a limit order with encrypted data
     */
    function submitLimitOrder(
        bytes calldata encryptedData,
        bytes32 datasetAddress,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 limitPrice,
        uint256 expiry
    ) external nonReentrant returns (bytes32 orderId) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(tokenIn != tokenOut, "Tokens must be different");
        require(limitPrice > 0, "Limit price must be greater than 0");
        require(expiry == 0 || expiry > block.timestamp, "Invalid expiry");

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Generate unique order ID
        orderId = keccak256(
            abi.encodePacked(
                msg.sender,
                tokenIn,
                tokenOut,
                amountIn,
                limitPrice,
                block.timestamp,
                pendingOrderIds.length
            )
        );

        // Create order
        orders[orderId] = Order({
            owner: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountOutMin: 0,
            limitPrice: limitPrice,
            expiry: expiry,
            datasetAddress: datasetAddress,
            encryptedData: encryptedData,
            status: OrderStatus.Pending,
            batchId: currentBatchId,
            timestamp: block.timestamp
        });

        _recordOrder(orderId);
        emit OrderSubmitted(orderId, msg.sender, currentBatchId, tokenIn, amountIn);

        return orderId;
    }

    function _recordOrder(bytes32 orderId) internal {
        pendingOrderIds.push(orderId);
        userOrders[msg.sender].push(orderId);
        batchOrders[currentBatchId].push(orderId);
    }

    /**
     * @notice Cancel a pending order
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.owner == msg.sender, "Not order owner");
        require(order.status == OrderStatus.Pending, "Order not pending");

        // Update status
        order.status = OrderStatus.Cancelled;

        // Refund tokens
        IERC20(order.tokenIn).safeTransfer(msg.sender, order.amountIn);

        // Remove from pending orders
        _removeFromPending(orderId);

        emit OrderCancelled(orderId, msg.sender);
    }

    /**
     * @notice Trigger batch execution
     */
    function triggerBatch() external {
        require(
            block.timestamp >= lastBatchTimestamp + batchInterval,
            "Batch interval not reached"
        );
        _triggerBatch();
    }
    
    /**
     * @notice Execute a limit order if price condition is met
     * @param orderId The order ID to execute
     * @return success Whether the order was executed
     */
    function executeLimitOrder(bytes32 orderId) external nonReentrant returns (bool success) {
        Order storage order = orders[orderId];
        
        require(order.owner != address(0), "Order does not exist");
        require(order.status == OrderStatus.Pending, "Order not pending");
        require(order.limitPrice > 0, "Not a limit order");
        
        // Check expiry
        if (order.expiry > 0 && block.timestamp > order.expiry) {
            // Order expired - refund tokens
            order.status = OrderStatus.Expired;
            IERC20(order.tokenIn).safeTransfer(order.owner, order.amountIn);
            _removeFromPending(orderId);
            emit OrderExpired(orderId, order.owner);
            return false;
        }
        
        // Check if price condition is met
        require(address(priceFeed) != address(0), "Price feed not set");
        
        uint256 currentPrice = priceFeed.getPrice(order.tokenIn);
        uint256 targetPrice = order.limitPrice;
        
        // For sell orders: execute when current price >= limit price
        // limitPrice is stored as tokenOut per tokenIn (e.g., 3000 USDC per ETH)
        require(currentPrice >= targetPrice, "Price condition not met");
        
        // Calculate output amount
        uint256 amountOut = priceFeed.getAmountOut(order.tokenIn, order.tokenOut, order.amountIn);
        require(liquidity[order.tokenOut] >= amountOut, "Insufficient liquidity");
        
        // Execute the swap
        liquidity[order.tokenIn] += order.amountIn;
        liquidity[order.tokenOut] -= amountOut;
        
        // Transfer output tokens to user
        IERC20(order.tokenOut).safeTransfer(order.owner, amountOut);
        
        // Update order status
        order.status = OrderStatus.Executed;
        _removeFromPending(orderId);
        
        emit LimitOrderExecuted(orderId, order.owner, order.amountIn, amountOut, currentPrice);
        
        return true;
    }
    
    /**
     * @notice Check if a limit order can be executed at current price
     * @param orderId The order ID to check
     * @return canExecute Whether the order can be executed
     * @return currentPrice Current price from price feed
     * @return targetPrice Target limit price
     */
    function canExecuteLimitOrder(bytes32 orderId) external view returns (
        bool canExecute,
        uint256 currentPrice,
        uint256 targetPrice
    ) {
        Order storage order = orders[orderId];
        
        if (order.owner == address(0) || order.status != OrderStatus.Pending || order.limitPrice == 0) {
            return (false, 0, 0);
        }
        
        // Check expiry
        if (order.expiry > 0 && block.timestamp > order.expiry) {
            return (false, 0, order.limitPrice);
        }
        
        if (address(priceFeed) == address(0)) {
            return (false, 0, order.limitPrice);
        }
        
        currentPrice = priceFeed.getPrice(order.tokenIn);
        targetPrice = order.limitPrice;
        canExecute = currentPrice >= targetPrice;
        
        return (canExecute, currentPrice, targetPrice);
    }
    
    /**
     * @notice Get detailed order information including limit price
     * @param orderId The order ID
     */
    function getOrderDetails(bytes32 orderId) external view returns (
        address owner,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 limitPrice,
        uint256 expiry,
        uint8 status,
        uint256 batchId,
        uint256 timestamp
    ) {
        Order storage order = orders[orderId];
        return (
            order.owner,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            order.limitPrice,
            order.expiry,
            uint8(order.status),
            order.batchId,
            order.timestamp
        );
    }

    // Internal functions

    function _triggerBatch() internal {
        uint256 orderCount = pendingOrderIds.length;
        
        emit BatchTriggered(currentBatchId, orderCount, block.timestamp);

        // Try to execute limit orders that meet price conditions
        uint256 executedCount = 0;
        for (uint256 i = 0; i < pendingOrderIds.length; ) {
            bytes32 orderId = pendingOrderIds[i];
            Order storage order = orders[orderId];
            
            // Skip if not a limit order or already processed
            if (order.limitPrice == 0 || order.status != OrderStatus.Pending) {
                i++;
                continue;
            }
            
            // Check expiry
            if (order.expiry > 0 && block.timestamp > order.expiry) {
                order.status = OrderStatus.Expired;
                IERC20(order.tokenIn).safeTransfer(order.owner, order.amountIn);
                emit OrderExpired(orderId, order.owner);
                // Remove from array by swapping with last element
                pendingOrderIds[i] = pendingOrderIds[pendingOrderIds.length - 1];
                pendingOrderIds.pop();
                continue;
            }
            
            // Try to execute if price feed is set
            if (address(priceFeed) != address(0)) {
                uint256 currentPrice = priceFeed.getPrice(order.tokenIn);
                
                if (currentPrice >= order.limitPrice) {
                    uint256 amountOut = priceFeed.getAmountOut(order.tokenIn, order.tokenOut, order.amountIn);
                    
                    if (liquidity[order.tokenOut] >= amountOut) {
                        // Execute the swap
                        liquidity[order.tokenIn] += order.amountIn;
                        liquidity[order.tokenOut] -= amountOut;
                        IERC20(order.tokenOut).safeTransfer(order.owner, amountOut);
                        
                        order.status = OrderStatus.Executed;
                        executedCount++;
                        
                        emit LimitOrderExecuted(orderId, order.owner, order.amountIn, amountOut, currentPrice);
                        
                        // Remove from array
                        pendingOrderIds[i] = pendingOrderIds[pendingOrderIds.length - 1];
                        pendingOrderIds.pop();
                        continue;
                    }
                }
            }
            
            i++;
        }
        
        // Prepare for next batch
        lastBatchTimestamp = block.timestamp;
        currentBatchId++;
        
        emit BatchSettled(currentBatchId - 1, executedCount);
    }

    function _removeFromPending(bytes32 orderId) internal {
        uint256 length = pendingOrderIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (pendingOrderIds[i] == orderId) {
                pendingOrderIds[i] = pendingOrderIds[length - 1];
                pendingOrderIds.pop();
                break;
            }
        }
    }

    // View functions
    function getPendingOrderCount() external view returns (uint256) {
        return pendingOrderIds.length;
    }

    function getOrder(bytes32 orderId) external view returns (
        address owner,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint8 status,
        uint256 batchId
    ) {
        Order storage order = orders[orderId];
        return (
            order.owner,
            order.tokenIn,
            order.tokenOut,
            order.amountIn,
            uint8(order.status),
            order.batchId
        );
    }
}

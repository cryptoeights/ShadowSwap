// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShadowPool
 * @notice Confidential Batch Auction DEX with MEV protection
 * @dev Orders are encrypted using iExec DataProtector before submission
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
        uint256 cowMatches,
        uint256 uniswapSwaps
    );

    // Constructor
    constructor(uint256 _batchInterval) Ownable(msg.sender) {
        batchInterval = _batchInterval;
        lastBatchTimestamp = block.timestamp;
        currentBatchId = 1;
    }

    /**
     * @notice Submit a market order with encrypted data
     * @param encryptedData Encrypted order details from iExec DataProtector
     * @param datasetAddress iExec dataset address containing encrypted data
     * @param tokenIn Token to sell
     * @param tokenOut Token to buy
     * @param amountIn Amount of tokenIn to sell
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

        // Add to pending orders
        pendingOrderIds.push(orderId);
        userOrders[msg.sender].push(orderId);
        batchOrders[currentBatchId].push(orderId);

        emit OrderSubmitted(orderId, msg.sender, currentBatchId, tokenIn, amountIn);

        // Check if batch should be triggered
        if (block.timestamp >= lastBatchTimestamp + batchInterval) {
            _triggerBatch();
        }

        return orderId;
    }

    /**
     * @notice Submit a limit order with encrypted data
     * @param encryptedData Encrypted order details from iExec DataProtector
     * @param datasetAddress iExec dataset address containing encrypted data
     * @param tokenIn Token to sell
     * @param tokenOut Token to buy
     * @param amountIn Amount of tokenIn to sell
     * @param limitPrice Minimum price for execution (with 18 decimals)
     * @param expiry Order expiration timestamp
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

        // Add to pending orders
        pendingOrderIds.push(orderId);
        userOrders[msg.sender].push(orderId);
        batchOrders[currentBatchId].push(orderId);

        emit OrderSubmitted(orderId, msg.sender, currentBatchId, tokenIn, amountIn);

        return orderId;
    }

    /**
     * @notice Cancel a pending order
     * @param orderId Order ID to cancel
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
     * @notice Trigger batch execution (can be called by anyone after interval)
     */
    function triggerBatch() external {
        require(
            block.timestamp >= lastBatchTimestamp + batchInterval,
            "Batch interval not reached"
        );
        _triggerBatch();
    }

    /**
     * @notice Get order details
     */
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

    /**
     * @notice Get all order IDs for a user
     */
    function getUserOrders(address user) external view returns (bytes32[] memory) {
        return userOrders[user];
    }

    /**
     * @notice Get pending order count
     */
    function getPendingOrderCount() external view returns (uint256) {
        return pendingOrderIds.length;
    }

    /**
     * @notice Get batch order IDs
     */
    function getBatchOrders(uint256 batchId) external view returns (bytes32[] memory) {
        return batchOrders[batchId];
    }

    /**
     * @notice Update batch interval (owner only)
     */
    function setBatchInterval(uint256 newInterval) external onlyOwner {
        batchInterval = newInterval;
    }

    // Internal functions

    function _triggerBatch() internal {
        uint256 orderCount = pendingOrderIds.length;
        
        emit BatchTriggered(currentBatchId, orderCount, block.timestamp);

        // In production, this would trigger iExec TEE execution
        // For demo purposes, we just increment the batch
        
        // Clear pending orders for next batch
        delete pendingOrderIds;
        
        // Update batch state
        lastBatchTimestamp = block.timestamp;
        currentBatchId++;

        // Emit settlement event (simulated)
        emit BatchSettled(currentBatchId - 1, orderCount / 2, orderCount - orderCount / 2);
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

    /**
     * @notice Emergency withdraw (owner only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
}

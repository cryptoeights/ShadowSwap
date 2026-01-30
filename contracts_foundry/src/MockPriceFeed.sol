// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPriceFeed
 * @notice Simple price oracle for testing - allows anyone to set prices
 * @dev In production, use Chainlink or another oracle
 *      For testing, anyone can update prices to enable real-time price sync
 */
contract MockPriceFeed is Ownable {
    // Price storage: token address => price in USD (18 decimals)
    mapping(address => uint256) public prices;
    
    // Last update timestamp
    mapping(address => uint256) public lastUpdated;
    
    // Allow open price updates (for testing)
    bool public openPriceUpdates = true;
    
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Toggle open price updates
     * @param _open Whether anyone can update prices
     */
    function setOpenPriceUpdates(bool _open) external onlyOwner {
        openPriceUpdates = _open;
    }
    
    /**
     * @notice Set price for a token (anyone can call if openPriceUpdates is true)
     * @param token Token address
     * @param priceUsd Price in USD with 18 decimals (e.g., 3200e18 for $3200)
     */
    function setPrice(address token, uint256 priceUsd) external {
        require(openPriceUpdates || msg.sender == owner(), "Not authorized");
        prices[token] = priceUsd;
        lastUpdated[token] = block.timestamp;
        emit PriceUpdated(token, priceUsd, block.timestamp);
    }
    
    /**
     * @notice Set prices for multiple tokens (anyone can call if openPriceUpdates is true)
     * @param tokens Array of token addresses
     * @param pricesUsd Array of prices in USD with 18 decimals
     */
    function setPrices(address[] calldata tokens, uint256[] calldata pricesUsd) external {
        require(openPriceUpdates || msg.sender == owner(), "Not authorized");
        require(tokens.length == pricesUsd.length, "Length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[tokens[i]] = pricesUsd[i];
            lastUpdated[tokens[i]] = block.timestamp;
            emit PriceUpdated(tokens[i], pricesUsd[i], block.timestamp);
        }
    }
    
    /**
     * @notice Get price for a token
     * @param token Token address
     * @return price Price in USD with 18 decimals
     */
    function getPrice(address token) external view returns (uint256 price) {
        price = prices[token];
        require(price > 0, "Price not set");
    }
    
    /**
     * @notice Get exchange rate between two tokens
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return rate Exchange rate (tokenIn per tokenOut) with 18 decimals
     */
    function getExchangeRate(address tokenIn, address tokenOut) external view returns (uint256 rate) {
        uint256 priceIn = prices[tokenIn];
        uint256 priceOut = prices[tokenOut];
        require(priceIn > 0 && priceOut > 0, "Price not set");
        
        // rate = priceIn / priceOut (with 18 decimal precision)
        rate = (priceIn * 1e18) / priceOut;
    }
    
    /**
     * @notice Calculate output amount for a swap
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Input amount
     * @return amountOut Output amount
     */
    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        uint256 priceIn = prices[tokenIn];
        uint256 priceOut = prices[tokenOut];
        require(priceIn > 0 && priceOut > 0, "Price not set");
        
        // amountOut = amountIn * priceIn / priceOut
        amountOut = (amountIn * priceIn) / priceOut;
    }
}

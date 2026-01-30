// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockETH
 * @notice Mock ETH token for testing swaps
 * @dev ERC20 token that tracks real ETH price for limit order testing
 *      This allows testing mETH <-> mWETH swaps with real price volatility
 */
contract MockETH is ERC20, Ownable {
    constructor() ERC20("Mock Ether", "mETH") Ownable(msg.sender) {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    /**
     * @notice Mint tokens for testing (faucet)
     * @param to Address to mint to
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @notice Returns 18 decimals (same as ETH)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

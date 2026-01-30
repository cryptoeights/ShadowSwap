// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockWETH
 * @notice Mock Wrapped ETH for testing - mimics WETH9 behavior
 * @dev Allows deposit (wrap) and withdraw (unwrap) of ETH
 *      Also has mint function for testing faucet
 */
contract MockWETH is ERC20, Ownable {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Mock Wrapped Ether", "mWETH") Ownable(msg.sender) {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10 ** 18);
    }

    /**
     * @notice Deposit ETH and receive mWETH (wrap)
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH by burning mWETH (unwrap)
     * @param wad Amount to withdraw
     */
    function withdraw(uint256 wad) public {
        require(balanceOf(msg.sender) >= wad, "MockWETH: insufficient balance");
        _burn(msg.sender, wad);
        (bool success, ) = payable(msg.sender).call{value: wad}("");
        require(success, "MockWETH: ETH transfer failed");
        emit Withdrawal(msg.sender, wad);
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

    /**
     * @notice Receive ETH and auto-wrap
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Fallback for direct ETH transfers
     */
    fallback() external payable {
        deposit();
    }
}

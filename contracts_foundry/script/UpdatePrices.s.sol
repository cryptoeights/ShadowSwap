// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockPriceFeed.sol";

/**
 * @notice Update prices on MockPriceFeed
 * @dev Run with: forge script script/UpdatePrices.s.sol:UpdatePricesScript --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast
 *      Set ETH_PRICE env var to the current ETH price (e.g., ETH_PRICE=2730)
 */
contract UpdatePricesScript is Script {
    // Deployed contract addresses
    address constant PRICE_FEED = 0xd371a1b9DCC0C6657FCE940bCea759a8dcb005d9;
    address constant METH = 0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2;
    address constant MWETH = 0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c;
    address constant MUSDC = 0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e;
    address constant MDAI = 0xda222533d71C37A9370C6b5a26BcB4C07EcB0454;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Get ETH price from environment (default to 2730 if not set)
        uint256 ethPrice = vm.envOr("ETH_PRICE", uint256(2730));
        
        console.log("Updating prices...");
        console.log("ETH Price:", ethPrice);
        
        vm.startBroadcast(deployerPrivateKey);

        MockPriceFeed priceFeed = MockPriceFeed(PRICE_FEED);
        
        // Set prices (18 decimals)
        priceFeed.setPrice(METH, ethPrice * 1e18);
        priceFeed.setPrice(MWETH, ethPrice * 1e18);
        priceFeed.setPrice(MUSDC, 1e18); // $1
        priceFeed.setPrice(MDAI, 1e18);   // $1
        
        console.log("Prices updated successfully!");
        console.log("mETH/mWETH:", ethPrice, "USD");
        console.log("mUSDC/mDAI: 1 USD");

        vm.stopBroadcast();
    }
}

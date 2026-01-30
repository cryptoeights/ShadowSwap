// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockPriceFeed.sol";
import "../src/ShadowPool.sol";

/**
 * @notice Deploy new price feed with open updates and configure ShadowPool
 */
contract DeployNewPriceFeedScript is Script {
    // Existing addresses
    address constant SHADOW_POOL = 0xfe8722f1eb898851b9D14f40084A57E3e27Dd7A8;
    address constant METH = 0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2;
    address constant MWETH = 0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c;
    address constant MUSDC = 0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e;
    address constant MDAI = 0xda222533d71C37A9370C6b5a26BcB4C07EcB0454;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new price feed with open updates
        MockPriceFeed priceFeed = new MockPriceFeed();
        console.log("New MockPriceFeed deployed at:", address(priceFeed));

        // 2. Set initial prices (ETH ~$2728)
        priceFeed.setPrice(METH, 2728e18);
        priceFeed.setPrice(MWETH, 2728e18);
        priceFeed.setPrice(MUSDC, 1e18);
        priceFeed.setPrice(MDAI, 1e18);
        console.log("Initial prices set");

        // 3. Configure ShadowPool to use new price feed
        ShadowPool(SHADOW_POOL).setPriceFeed(address(priceFeed));
        console.log("ShadowPool configured with new price feed");

        vm.stopBroadcast();
    }
}

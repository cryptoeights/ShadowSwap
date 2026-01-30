// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShadowPool.sol";
import "../src/MockERC20.sol";
import "../src/MockETH.sol";
import "../src/MockWETH.sol";

/**
 * @notice Deploy upgraded ShadowPool with limit order execution
 */
contract UpgradeShadowPoolScript is Script {
    // Existing token addresses
    address constant METH = 0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2;
    address payable constant MWETH = payable(0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c);
    address constant MUSDC = 0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e;
    address constant MDAI = 0xda222533d71C37A9370C6b5a26BcB4C07EcB0454;
    address constant PRICE_FEED = 0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new ShadowPool with limit order execution
        ShadowPool shadowPool = new ShadowPool(300); // 5 min batch interval
        console.log("New ShadowPool deployed at:", address(shadowPool));

        // 2. Configure price feed
        shadowPool.setPriceFeed(PRICE_FEED);
        console.log("Price feed configured");

        // 3. Mint tokens for liquidity
        uint256 liquidityAmount = 100_000_000e18; // 100M tokens
        
        MockERC20(MUSDC).mint(deployer, liquidityAmount);
        MockERC20(MDAI).mint(deployer, liquidityAmount);
        MockETH(METH).mint(deployer, liquidityAmount);
        MockWETH(MWETH).mint(deployer, liquidityAmount);
        console.log("Minted tokens for liquidity");

        // 4. Add liquidity
        MockERC20(MUSDC).approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(MUSDC, liquidityAmount);
        
        MockERC20(MDAI).approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(MDAI, liquidityAmount);
        
        MockETH(METH).approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(METH, liquidityAmount);
        
        MockWETH(MWETH).approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(MWETH, liquidityAmount);
        
        console.log("Liquidity added: 100M each token");

        vm.stopBroadcast();
    }
}

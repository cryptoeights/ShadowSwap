// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ShadowPool.sol";
import "../src/MockERC20.sol";
import "../src/MockETH.sol";
import "../src/MockWETH.sol";
import "../src/MockPriceFeed.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Stablecoins
        MockERC20 musdc = new MockERC20("Mock USDC", "mUSDC", 18);
        console.log("mUSDC deployed at:", address(musdc));

        MockERC20 mdai = new MockERC20("Mock DAI", "mDAI", 18);
        console.log("mDAI deployed at:", address(mdai));

        // 2. Deploy Mock ETH tokens (for ETH/WETH price testing)
        MockETH meth = new MockETH();
        console.log("mETH deployed at:", address(meth));

        MockWETH mweth = new MockWETH();
        console.log("mWETH deployed at:", address(mweth));

        // 3. Deploy Price Feed
        MockPriceFeed priceFeed = new MockPriceFeed();
        console.log("MockPriceFeed deployed at:", address(priceFeed));

        // 4. Deploy ShadowPool
        // Batch interval: 5 minutes (300 seconds)
        ShadowPool shadowPool = new ShadowPool(300);
        console.log("ShadowPool deployed at:", address(shadowPool));

        // 5. Configure ShadowPool with price feed
        shadowPool.setPriceFeed(address(priceFeed));

        // 6. Set initial prices (18 decimals)
        // ETH = $3200, USDC = $1, DAI = $1
        priceFeed.setPrice(address(meth), 3200e18);
        priceFeed.setPrice(address(mweth), 3200e18);
        priceFeed.setPrice(address(musdc), 1e18);
        priceFeed.setPrice(address(mdai), 1e18);

        // 7. Mint additional tokens for liquidity
        uint256 liquidityAmount = 100_000_000e18; // 100M tokens each
        address deployer = vm.addr(deployerPrivateKey);
        
        musdc.mint(deployer, liquidityAmount);
        mdai.mint(deployer, liquidityAmount);
        meth.mint(deployer, liquidityAmount);
        mweth.mint(deployer, liquidityAmount);
        
        // 8. Add initial liquidity for instant swaps
        musdc.approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(address(musdc), liquidityAmount);
        
        mdai.approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(address(mdai), liquidityAmount);
        
        meth.approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(address(meth), liquidityAmount);
        
        mweth.approve(address(shadowPool), liquidityAmount);
        shadowPool.addLiquidity(address(mweth), liquidityAmount);

        console.log("Liquidity added for all tokens: 100M each");

        vm.stopBroadcast();
    }
}

/**
 * @notice Deploy only the new ETH mock tokens (for updating existing deployment)
 */
contract DeployMockETHScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Mock ETH tokens (for ETH/WETH price testing)
        MockETH meth = new MockETH();
        console.log("mETH deployed at:", address(meth));

        MockWETH mweth = new MockWETH();
        console.log("mWETH deployed at:", address(mweth));

        vm.stopBroadcast();
    }
}

/**
 * @notice Deploy price feed and configure existing ShadowPool for instant swaps
 */
contract SetupInstantSwapScript is Script {
    // Existing deployed addresses
    address constant SHADOW_POOL = 0x202AA8cD101fDe37D9c203f2Ca321752BB2Cd040;
    address constant MUSDC = 0xd57Fdc89283c15860E35f12bD1D291760309452A;
    address constant MDAI = 0xaAF9Ad49928A7EA4073E09e93aB44be7438951bb;
    address constant METH = 0xA270162c70f7107F0960139DE0bC13E9d870FD3E;
    address payable constant MWETH = payable(0x3eD186BF2807866179De0D6EEFd1D62Efe2AbD5e);

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Price Feed
        MockPriceFeed priceFeed = new MockPriceFeed();
        console.log("MockPriceFeed deployed at:", address(priceFeed));

        // 2. Set prices (18 decimals)
        // ETH = $3200, USDC = $1, DAI = $1
        priceFeed.setPrice(METH, 3200e18);
        priceFeed.setPrice(MWETH, 3200e18);
        priceFeed.setPrice(MUSDC, 1e18);
        priceFeed.setPrice(MDAI, 1e18);
        console.log("Prices set: mETH=$3200, mWETH=$3200, mUSDC=$1, mDAI=$1");

        // 3. Configure ShadowPool (requires upgraded contract)
        // ShadowPool(SHADOW_POOL).setPriceFeed(address(priceFeed));
        
        // 4. Add liquidity (mint tokens first, then add)
        uint256 liquidityAmount = 10_000_000e18; // 10M tokens
        
        // Mint to deployer
        MockERC20(MUSDC).mint(msg.sender, liquidityAmount);
        MockERC20(MDAI).mint(msg.sender, liquidityAmount);
        MockETH(METH).mint(msg.sender, liquidityAmount);
        MockWETH(MWETH).mint(msg.sender, liquidityAmount);
        console.log("Minted 10M of each token");

        vm.stopBroadcast();
    }
}

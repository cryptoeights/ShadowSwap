const hre = require("hardhat");

async function main() {
    console.log("Deploying Mock Tokens to Arbitrum Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

    // Deploy mUSDC
    console.log("Deploying mUSDC...");
    const musdc = await MockERC20.deploy("Mock USDC", "mUSDC");
    await musdc.waitForDeployment();
    const musdcAddress = await musdc.getAddress();
    console.log("✅ mUSDC deployed at:", musdcAddress);

    // Deploy mDAI
    console.log("Deploying mDAI...");
    const mdai = await MockERC20.deploy("Mock DAI", "mDAI");
    await mdai.waitForDeployment();
    const mdaiAddress = await mdai.getAddress();
    console.log("✅ mDAI deployed at:", mdaiAddress);

    console.log("\nPlease update 'frontend/src/lib/tokens.ts' with these addresses.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

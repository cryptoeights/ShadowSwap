const hre = require("hardhat");

async function main() {
    console.log("Deploying ShadowPool to Arbitrum Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Deploy ShadowPool with 5 minute batch interval (300 seconds)
    const batchInterval = 300; // 5 minutes

    const ShadowPool = await hre.ethers.getContractFactory("ShadowPool");
    const shadowPool = await ShadowPool.deploy(batchInterval);

    await shadowPool.waitForDeployment();

    const contractAddress = await shadowPool.getAddress();

    console.log("✅ ShadowPool deployed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Contract Address:", contractAddress);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nAdd this to your frontend .env.local:");
    console.log(`NEXT_PUBLIC_SHADOW_POOL_ADDRESS=${contractAddress}`);
    console.log("\nView on Arbiscan:");
    console.log(`https://sepolia.arbiscan.io/address/${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

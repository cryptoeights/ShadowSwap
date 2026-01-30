const { ethers } = require("hardhat");

const SHADOW_POOL = "0xe7E3B69452320E9DC9c7f59bDb027D3E86E11A0A";
const MUSDC = "0x1c4F6D15B1B4E45Bb0C58FC819d1f88f6192F3dF";
const MDAI = "0x678f6E64b585CE2513c1872C7a989DaE8Cc94356";

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    const erc20Abi = [
        "function approve(address,uint256) returns (bool)",
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
    ];

    const shadowAbi = [
        "function submitOrder(bytes,bytes32,address,address,uint256) returns (bytes32)",
        "function currentBatchId() view returns (uint256)",
        "function getPendingOrderCount() view returns (uint256)",
    ];

    const musdc = new ethers.Contract(MUSDC, erc20Abi, signer);
    const shadow = new ethers.Contract(SHADOW_POOL, shadowAbi, signer);

    // 1. Check balance
    const balance = await musdc.balanceOf(signer.address);
    console.log(`\nmUSDC balance: ${ethers.formatUnits(balance, 18)}`);

    // 2. Check allowance for NEW contract
    const allowance = await musdc.allowance(signer.address, SHADOW_POOL);
    console.log(`Allowance for new ShadowPool: ${ethers.formatUnits(allowance, 18)}`);

    // 3. Approve if needed
    if (allowance < ethers.parseUnits("100", 18)) {
        console.log("\nApproving mUSDC for new ShadowPool...");
        const approveTx = await musdc.approve(SHADOW_POOL, ethers.MaxUint256);
        await approveTx.wait();
        console.log("Approved! Tx:", approveTx.hash);
    }

    // 4. Submit order
    console.log("\nSubmitting order: 100 mUSDC -> mDAI...");
    const amount = ethers.parseUnits("100", 18);
    const encryptedData = ethers.randomBytes(32);
    const datasetAddress = ethers.randomBytes(32);

    try {
        const tx = await shadow.submitOrder(
            encryptedData,
            datasetAddress,
            MUSDC,
            MDAI,
            amount
        );
        console.log("Tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log(`\n✅ SUCCESS! Gas used: ${receipt.gasUsed}`);
        console.log(`Block: ${receipt.blockNumber}`);

        // 5. Verify
        const batchId = await shadow.currentBatchId();
        const pending = await shadow.getPendingOrderCount();
        console.log(`\nBatch ID: ${batchId}, Pending orders: ${pending}`);
    } catch (e) {
        console.error("\n❌ FAILED:", e.message);
        if (e.data) console.error("Revert data:", e.data);
    }
}

main().catch(console.error);

const { ethers } = require("hardhat");

// Addresses from deployment
const SHADOW_POOL = "0x53cf16D4824522ad9650DCe4f9504798D523140f";
const MUSDC = "0x1c4F6D15B1B4E45Bb0C58FC819d1f88f6192F3dF";
const MDAI = "0x678f6E64b585CE2513c1872C7a989DaE8Cc94356";
const USER = "0x77D1BB07E6F487f47C8f481dFF80DE5c27821D09";

async function main() {
    const provider = new ethers.JsonRpcProvider("https://sepolia-rollup.arbitrum.io/rpc");

    console.log("=== DEBUG: ShadowPool submitOrder ===\n");

    // 1. Check if contract exists
    const code = await provider.getCode(SHADOW_POOL);
    console.log(`1. ShadowPool contract code length: ${code.length}`);
    console.log(`   Contract exists: ${code !== "0x"}\n`);

    // 2. Check mUSDC contract
    const musdcCode = await provider.getCode(MUSDC);
    console.log(`2. mUSDC contract code length: ${musdcCode.length}`);
    console.log(`   Contract exists: ${musdcCode !== "0x"}\n`);

    // 3. Check mDAI contract
    const mdaiCode = await provider.getCode(MDAI);
    console.log(`3. mDAI contract code length: ${mdaiCode.length}`);
    console.log(`   Contract exists: ${mdaiCode !== "0x"}\n`);

    // 4. Check balances
    const erc20Abi = [
        "function balanceOf(address) view returns (uint256)",
        "function allowance(address,address) view returns (uint256)",
        "function decimals() view returns (uint8)",
    ];

    const musdc = new ethers.Contract(MUSDC, erc20Abi, provider);
    const mdai = new ethers.Contract(MDAI, erc20Abi, provider);

    const musdcBalance = await musdc.balanceOf(USER);
    const mdaiBalance = await mdai.balanceOf(USER);
    console.log(`4. User ${USER} balances:`);
    console.log(`   mUSDC: ${ethers.formatUnits(musdcBalance, 18)} (raw: ${musdcBalance})`);
    console.log(`   mDAI:  ${ethers.formatUnits(mdaiBalance, 18)} (raw: ${mdaiBalance})\n`);

    // 5. Check allowances for ShadowPool
    const musdcAllowance = await musdc.allowance(USER, SHADOW_POOL);
    const mdaiAllowance = await mdai.allowance(USER, SHADOW_POOL);
    console.log(`5. Allowances for ShadowPool (${SHADOW_POOL}):`);
    console.log(`   mUSDC: ${ethers.formatUnits(musdcAllowance, 18)} (raw: ${musdcAllowance})`);
    console.log(`   mDAI:  ${ethers.formatUnits(mdaiAllowance, 18)} (raw: ${mdaiAllowance})\n`);

    // 6. Check ShadowPool state
    const shadowAbi = [
        "function currentBatchId() view returns (uint256)",
        "function batchInterval() view returns (uint256)",
        "function lastBatchTimestamp() view returns (uint256)",
        "function getPendingOrderCount() view returns (uint256)",
        "function owner() view returns (address)",
    ];
    const shadow = new ethers.Contract(SHADOW_POOL, shadowAbi, provider);

    try {
        const batchId = await shadow.currentBatchId();
        const interval = await shadow.batchInterval();
        const lastTs = await shadow.lastBatchTimestamp();
        const pendingCount = await shadow.getPendingOrderCount();
        const owner = await shadow.owner();

        const now = Math.floor(Date.now() / 1000);
        const nextBatch = Number(lastTs) + Number(interval);

        console.log(`6. ShadowPool state:`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Current batch: ${batchId}`);
        console.log(`   Batch interval: ${interval}s`);
        console.log(`   Last batch timestamp: ${lastTs}`);
        console.log(`   Now: ${now}`);
        console.log(`   Batch overdue: ${now >= nextBatch} (next: ${nextBatch})`);
        console.log(`   Pending orders: ${pendingCount}\n`);
    } catch (e) {
        console.log(`6. ERROR reading ShadowPool state: ${e.message}\n`);
    }

    // 7. Try to simulate submitOrder call (static call)
    console.log(`7. Simulating submitOrder...`);
    const shadowFull = new ethers.Contract(SHADOW_POOL, [
        "function submitOrder(bytes,bytes32,address,address,uint256) payable returns (bytes32)",
    ], provider);

    const testAmount = ethers.parseUnits("100", 18);
    const fakeEncrypted = ethers.randomBytes(32);
    const fakeDataset = ethers.randomBytes(32);

    try {
        const result = await shadowFull.submitOrder.staticCall(
            fakeEncrypted,
            fakeDataset,
            MUSDC,
            MDAI,
            testAmount,
            { from: USER }
        );
        console.log(`   SUCCESS! Order ID would be: ${result}\n`);
    } catch (e) {
        console.log(`   FAILED: ${e.message}\n`);

        // Try to decode revert reason
        if (e.data) {
            console.log(`   Revert data: ${e.data}`);
        }
        if (e.reason) {
            console.log(`   Revert reason: ${e.reason}`);
        }
    }

    // 8. Check if amount 100 <= balance and allowance
    console.log(`8. Feasibility check for 100 mUSDC:`);
    console.log(`   Balance >= 100: ${musdcBalance >= testAmount}`);
    console.log(`   Allowance >= 100: ${musdcAllowance >= testAmount}`);
}

main().catch(console.error);

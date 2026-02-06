import fsPromises from "fs/promises";

const main = async () => {
  console.log("========================================");
  console.log("  ShadowSwap iApp - Order Processor");
  console.log("  Running in Trusted Execution Env (TEE)");
  console.log("========================================\n");

  const iexecOut = process.env.IEXEC_OUT;

  // --- Read protected data (encrypted order from DataProtector) ---
  let orderData = null;
  try {
    const protectedDataFile = process.env.IEXEC_DATASET_FILENAME;
    if (protectedDataFile) {
      const dataPath = `${process.env.IEXEC_IN}/${protectedDataFile}`;
      const raw = await fsPromises.readFile(dataPath, "utf8");
      orderData = JSON.parse(raw);
      console.log("[ShadowSwap] Decrypted protected order data in TEE");
    }
  } catch (e) {
    console.log("[ShadowSwap] No protected data file, checking args...");
  }

  // --- Read input arguments ---
  const args = process.argv.length > 2 ? process.argv.slice(2).join(" ") : "";
  if (!orderData && args) {
    try {
      orderData = JSON.parse(args);
    } catch {
      orderData = null;
    }
  }

  // --- Process order ---
  let result;
  if (orderData && orderData.orderType) {
    console.log(`[ShadowSwap] Processing ${orderData.orderType} order...`);
    console.log(`  Token In:  ${orderData.tokenIn}`);
    console.log(`  Token Out: ${orderData.tokenOut}`);
    console.log(`  Amount:    ${orderData.amountIn}`);
    if (orderData.orderType === "limit") {
      console.log(`  Limit:     ${orderData.limitPrice}`);
    }

    const valid =
      orderData.tokenIn &&
      orderData.tokenOut &&
      orderData.amountIn &&
      /^0x[a-fA-F0-9]{40}$/.test(orderData.tokenIn) &&
      /^0x[a-fA-F0-9]{40}$/.test(orderData.tokenOut);

    result = {
      appName: "ShadowSwap Order Processor",
      version: "1.0.0",
      mode: "single-order",
      timestamp: new Date().toISOString(),
      order: valid
        ? {
            status: "validated",
            orderType: orderData.orderType,
            tokenIn: orderData.tokenIn,
            tokenOut: orderData.tokenOut,
            amountIn: orderData.amountIn,
            amountOutMin: orderData.amountOutMin || "0",
            limitPrice: orderData.limitPrice || "0",
            owner: orderData.owner || "unknown",
          }
        : { status: "rejected", reason: "Invalid order parameters" },
    };
  } else {
    console.log("[ShadowSwap] No order data - returning app info");
    result = {
      appName: "ShadowSwap Order Processor",
      version: "1.0.0",
      description:
        "Processes encrypted DEX orders in TEE for MEV protection using iExec DataProtector",
      capabilities: [
        "Order validation and processing",
        "Batch matching at uniform clearing price",
        "Protected data decryption via iExec DataProtector",
        "MEV protection through confidential computing",
      ],
      greeting: args || "Hello from ShadowSwap iApp!",
      timestamp: new Date().toISOString(),
    };
  }

  // --- Write output ---
  const resultText = JSON.stringify(result, null, 2);
  console.log("\n[ShadowSwap] Result:");
  console.log(resultText);

  await fsPromises.writeFile(`${iexecOut}/result.txt`, resultText);
  await fsPromises.writeFile(
    `${iexecOut}/computed.json`,
    JSON.stringify({ "deterministic-output-path": `${iexecOut}/result.txt` })
  );

  console.log("\n[ShadowSwap] Processing complete!");
};

main();

/**
 * ShadowSwap iExec iApp - Order Processor
 *
 * This iApp runs inside a Trusted Execution Environment (TEE) to:
 * 1. Receive encrypted order data via iExec DataProtector
 * 2. Decrypt order details (token pair, amount, price) securely
 * 3. Validate order parameters
 * 4. Process batch matching at uniform clearing price
 * 5. Output settlement results
 *
 * Privacy guarantees:
 * - Order data is only decrypted inside the TEE enclave
 * - No external party can observe order details
 * - Prevents MEV attacks (front-running, sandwich attacks)
 */

const fs = require('fs');
const path = require('path');

// iExec TEE environment paths
const IEXEC_IN = process.env.IEXEC_IN || '/iexec_in';
const IEXEC_OUT = process.env.IEXEC_OUT || '/iexec_out';
const IEXEC_DATASET_FILENAME = process.env.IEXEC_DATASET_FILENAME || '';

/**
 * Read protected data from iExec DataProtector
 * In TEE, the decrypted data is available at IEXEC_IN/IEXEC_DATASET_FILENAME
 */
function readProtectedData() {
    const datasetPath = path.join(IEXEC_IN, IEXEC_DATASET_FILENAME);

    if (!fs.existsSync(datasetPath)) {
        console.log('[ShadowSwap iApp] No protected data found, using args input');
        return null;
    }

    try {
        const rawData = fs.readFileSync(datasetPath, 'utf8');
        const orderData = JSON.parse(rawData);
        console.log('[ShadowSwap iApp] Successfully decrypted protected order data');
        return orderData;
    } catch (error) {
        console.error('[ShadowSwap iApp] Error reading protected data:', error.message);
        return null;
    }
}

/**
 * Read input arguments passed to the iApp
 */
function readArgs() {
    const args = process.argv.slice(2).join(' ');
    if (!args) return null;

    try {
        return JSON.parse(args);
    } catch {
        return { raw: args };
    }
}

/**
 * Validate order data structure
 */
function validateOrder(order) {
    const requiredFields = ['orderType', 'tokenIn', 'tokenOut', 'amountIn'];
    const missingFields = requiredFields.filter(field => !order[field]);

    if (missingFields.length > 0) {
        return {
            valid: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        };
    }

    // Validate token addresses
    if (!isValidAddress(order.tokenIn) || !isValidAddress(order.tokenOut)) {
        return { valid: false, error: 'Invalid token address format' };
    }

    // Validate amount
    if (isNaN(Number(order.amountIn)) || Number(order.amountIn) <= 0) {
        return { valid: false, error: 'Invalid amount' };
    }

    // Validate limit price for limit orders
    if (order.orderType === 'limit') {
        if (!order.limitPrice || isNaN(Number(order.limitPrice)) || Number(order.limitPrice) <= 0) {
            return { valid: false, error: 'Invalid limit price for limit order' };
        }
    }

    // Check expiry
    if (order.expiry && Number(order.expiry) > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (Number(order.expiry) < now) {
            return { valid: false, error: 'Order has expired' };
        }
    }

    return { valid: true };
}

/**
 * Check if string is valid Ethereum address
 */
function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Process a single order - validate and prepare for settlement
 */
function processOrder(order) {
    console.log(`[ShadowSwap iApp] Processing ${order.orderType} order...`);
    console.log(`  Token In:  ${order.tokenIn}`);
    console.log(`  Token Out: ${order.tokenOut}`);
    console.log(`  Amount:    ${order.amountIn}`);

    if (order.orderType === 'limit') {
        console.log(`  Limit Price: ${order.limitPrice}`);
        console.log(`  Expiry:      ${order.expiry || 'none'}`);
    }

    const validation = validateOrder(order);
    if (!validation.valid) {
        return {
            status: 'rejected',
            reason: validation.error,
            orderId: order.nonce || 'unknown'
        };
    }

    return {
        status: 'validated',
        orderType: order.orderType,
        tokenIn: order.tokenIn,
        tokenOut: order.tokenOut,
        amountIn: order.amountIn,
        amountOutMin: order.amountOutMin || '0',
        limitPrice: order.limitPrice || '0',
        expiry: order.expiry || '0',
        owner: order.owner || '0x0000000000000000000000000000000000000000',
        timestamp: order.timestamp || Date.now().toString(),
        nonce: order.nonce || generateNonce(),
    };
}

/**
 * Match orders in a batch for uniform clearing price
 * This is the core batch auction logic running in TEE
 */
function matchBatchOrders(orders) {
    console.log(`[ShadowSwap iApp] Matching ${orders.length} orders in batch...`);

    // Group orders by token pair
    const pairs = {};
    for (const order of orders) {
        const pairKey = `${order.tokenIn}-${order.tokenOut}`;
        const reversePairKey = `${order.tokenOut}-${order.tokenIn}`;

        if (!pairs[pairKey]) pairs[pairKey] = { buys: [], sells: [] };
        if (!pairs[reversePairKey]) pairs[reversePairKey] = { buys: [], sells: [] };

        // Orders selling tokenIn for tokenOut
        pairs[pairKey].sells.push(order);
        // These are buys for the reverse pair
        pairs[reversePairKey].buys.push(order);
    }

    const settlements = [];

    for (const [pair, { buys, sells }] of Object.entries(pairs)) {
        if (buys.length === 0 || sells.length === 0) continue;

        // Calculate clearing price based on supply/demand
        const totalBuyVolume = buys.reduce((sum, o) => sum + Number(o.amountIn), 0);
        const totalSellVolume = sells.reduce((sum, o) => sum + Number(o.amountIn), 0);

        if (totalBuyVolume > 0 && totalSellVolume > 0) {
            const clearingPrice = totalBuyVolume / totalSellVolume;

            settlements.push({
                pair,
                clearingPrice: clearingPrice.toString(),
                matchedBuys: buys.length,
                matchedSells: sells.length,
                totalVolume: (totalBuyVolume + totalSellVolume).toString(),
            });
        }
    }

    return settlements;
}

/**
 * Generate random nonce
 */
function generateNonce() {
    return '0x' + Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
    ).join('');
}

/**
 * Write output to iExec output directory
 */
function writeOutput(result) {
    const outputPath = path.join(IEXEC_OUT, 'result.json');

    // Ensure output directory exists
    if (!fs.existsSync(IEXEC_OUT)) {
        fs.mkdirSync(IEXEC_OUT, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`[ShadowSwap iApp] Result written to ${outputPath}`);

    // Write computed.json for iExec callback
    const computedPath = path.join(IEXEC_OUT, 'computed.json');
    fs.writeFileSync(computedPath, JSON.stringify({
        'deterministic-output-path': outputPath,
    }));
}

/**
 * Main execution
 */
async function main() {
    console.log('========================================');
    console.log('  ShadowSwap iApp - Order Processor');
    console.log('  Running in Trusted Execution Env (TEE)');
    console.log('========================================');
    console.log('');

    // Read inputs
    const protectedData = readProtectedData();
    const args = readArgs();

    let result;

    if (protectedData) {
        // Process single protected order from DataProtector
        console.log('[ShadowSwap iApp] Processing protected order data...');

        const processedOrder = processOrder(protectedData);
        result = {
            appName: 'ShadowSwap Order Processor',
            version: '1.0.0',
            mode: 'single-order',
            timestamp: new Date().toISOString(),
            order: processedOrder,
        };

    } else if (args && args.orders) {
        // Process batch of orders
        console.log(`[ShadowSwap iApp] Processing batch of ${args.orders.length} orders...`);

        const processedOrders = args.orders.map(order => processOrder(order));
        const validOrders = processedOrders.filter(o => o.status === 'validated');
        const settlements = matchBatchOrders(validOrders);

        result = {
            appName: 'ShadowSwap Batch Processor',
            version: '1.0.0',
            mode: 'batch',
            timestamp: new Date().toISOString(),
            totalOrders: args.orders.length,
            validOrders: validOrders.length,
            rejectedOrders: processedOrders.filter(o => o.status === 'rejected').length,
            orders: processedOrders,
            settlements,
        };

    } else if (args) {
        // Process single order from args
        console.log('[ShadowSwap iApp] Processing order from arguments...');

        const processedOrder = processOrder(args);
        result = {
            appName: 'ShadowSwap Order Processor',
            version: '1.0.0',
            mode: 'single-order',
            timestamp: new Date().toISOString(),
            order: processedOrder,
        };

    } else {
        // No input - return info
        console.log('[ShadowSwap iApp] No order data provided, returning app info');
        result = {
            appName: 'ShadowSwap Order Processor',
            version: '1.0.0',
            description: 'Processes encrypted DEX orders in TEE for MEV protection',
            capabilities: [
                'Order validation and processing',
                'Batch order matching at uniform clearing price',
                'Protected data decryption via iExec DataProtector',
                'MEV protection through confidential computing',
            ],
            supportedOrderTypes: ['market', 'limit'],
            timestamp: new Date().toISOString(),
        };
    }

    // Write output
    writeOutput(result);

    console.log('');
    console.log('[ShadowSwap iApp] Processing complete!');
    console.log(JSON.stringify(result, null, 2));
}

// Run
main().catch(error => {
    console.error('[ShadowSwap iApp] Fatal error:', error);
    writeOutput({
        error: error.message,
        timestamp: new Date().toISOString(),
    });
    process.exit(1);
});

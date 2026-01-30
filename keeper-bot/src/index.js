import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';
import dotenv from 'dotenv';

dotenv.config();

// ============== CONFIGURATION ==============
const CONFIG = {
    // How often to check prices (in milliseconds)
    PRICE_CHECK_INTERVAL: 10000, // 10 seconds
    
    // How often to check orders (in milliseconds)
    ORDER_CHECK_INTERVAL: 15000, // 15 seconds
    
    // Minimum price change % to trigger on-chain update
    MIN_PRICE_CHANGE_PERCENT: 0.5, // 0.5%
    
    // RPC URL
    RPC_URL: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    
    // Private key for bot wallet
    PRIVATE_KEY: process.env.PRIVATE_KEY,
};

// ============== CONTRACT ADDRESSES ==============
const CONTRACTS = {
    SHADOW_POOL: '0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09',
    PRICE_FEED: '0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006',
    METH: '0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2',
    MWETH: '0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c',
    MUSDC: '0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e',
    MDAI: '0xda222533d71C37A9370C6b5a26BcB4C07EcB0454',
};

// ============== ABIs ==============
const SHADOW_POOL_ABI = [
    {
        type: 'function',
        name: 'getPendingOrderCount',
        inputs: [],
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'pendingOrderIds',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [{ type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getOrderDetails',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [
            { name: 'owner', type: 'address' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'limitPrice', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
            { name: 'status', type: 'uint8' },
            { name: 'batchId', type: 'uint256' },
            { name: 'timestamp', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'canExecuteLimitOrder',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [
            { name: 'canExecute', type: 'bool' },
            { name: 'currentPrice', type: 'uint256' },
            { name: 'targetPrice', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'executeLimitOrder',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [{ name: 'success', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
];

const PRICE_FEED_ABI = [
    {
        type: 'function',
        name: 'setPrices',
        inputs: [
            { name: 'tokens', type: 'address[]' },
            { name: 'pricesUsd', type: 'uint256[]' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getPrice',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [{ name: 'price', type: 'uint256' }],
        stateMutability: 'view',
    },
];

// ============== GLOBALS ==============
let publicClient;
let walletClient;
let account;
let lastKnownEthPrice = 0;
let isRunning = true;

// ============== PRICE FETCHING ==============
async function fetchEthPrice() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const data = await response.json();
        return data.ethereum?.usd || 0;
    } catch (error) {
        console.error('❌ Failed to fetch ETH price:', error.message);
        return lastKnownEthPrice; // Return last known price on error
    }
}

// ============== ON-CHAIN PRICE UPDATE ==============
async function updateOnChainPrices(ethPrice) {
    try {
        console.log(`📤 Updating on-chain prices: ETH = $${ethPrice}`);
        
        const ethPriceWei = parseUnits(ethPrice.toString(), 18);
        const stablePriceWei = parseUnits('1', 18);
        
        const hash = await walletClient.writeContract({
            address: CONTRACTS.PRICE_FEED,
            abi: PRICE_FEED_ABI,
            functionName: 'setPrices',
            args: [
                [CONTRACTS.METH, CONTRACTS.MWETH, CONTRACTS.MUSDC, CONTRACTS.MDAI],
                [ethPriceWei, ethPriceWei, stablePriceWei, stablePriceWei],
            ],
        });
        
        console.log(`✅ Price update tx: ${hash}`);
        
        // Wait for confirmation
        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`✅ Price update confirmed!`);
        
        return true;
    } catch (error) {
        console.error('❌ Failed to update prices:', error.message);
        return false;
    }
}

// ============== GET PENDING LIMIT ORDERS ==============
async function getPendingLimitOrders() {
    try {
        const count = await publicClient.readContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'getPendingOrderCount',
        });
        
        const orders = [];
        
        for (let i = 0; i < Number(count); i++) {
            const orderId = await publicClient.readContract({
                address: CONTRACTS.SHADOW_POOL,
                abi: SHADOW_POOL_ABI,
                functionName: 'pendingOrderIds',
                args: [BigInt(i)],
            });
            
            const details = await publicClient.readContract({
                address: CONTRACTS.SHADOW_POOL,
                abi: SHADOW_POOL_ABI,
                functionName: 'getOrderDetails',
                args: [orderId],
            });
            
            // Only include limit orders (limitPrice > 0)
            if (details[4] > BigInt(0)) {
                orders.push({
                    orderId,
                    owner: details[0],
                    tokenIn: details[1],
                    tokenOut: details[2],
                    amountIn: details[3],
                    limitPrice: details[4],
                    expiry: details[5],
                    status: details[6],
                });
            }
        }
        
        return orders;
    } catch (error) {
        console.error('❌ Failed to fetch orders:', error.message);
        return [];
    }
}

// ============== CHECK AND EXECUTE ORDERS ==============
async function checkAndExecuteOrders() {
    try {
        const orders = await getPendingLimitOrders();
        
        if (orders.length === 0) {
            console.log('📋 No pending limit orders');
            return;
        }
        
        console.log(`📋 Found ${orders.length} pending limit order(s)`);
        
        for (const order of orders) {
            try {
                // Check if order can be executed
                const [canExecute, currentPrice, targetPrice] = await publicClient.readContract({
                    address: CONTRACTS.SHADOW_POOL,
                    abi: SHADOW_POOL_ABI,
                    functionName: 'canExecuteLimitOrder',
                    args: [order.orderId],
                });
                
                const currentPriceUsd = Number(formatUnits(currentPrice, 18));
                const targetPriceUsd = Number(formatUnits(targetPrice, 18));
                
                console.log(`   Order ${order.orderId.slice(0, 10)}...`);
                console.log(`   Current: $${currentPriceUsd.toFixed(2)} | Target: $${targetPriceUsd.toFixed(2)}`);
                
                if (canExecute) {
                    console.log(`   ⚡ EXECUTING ORDER!`);
                    
                    const hash = await walletClient.writeContract({
                        address: CONTRACTS.SHADOW_POOL,
                        abi: SHADOW_POOL_ABI,
                        functionName: 'executeLimitOrder',
                        args: [order.orderId],
                    });
                    
                    console.log(`   📤 Tx: ${hash}`);
                    
                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    
                    if (receipt.status === 'success') {
                        console.log(`   ✅ Order executed successfully!`);
                    } else {
                        console.log(`   ❌ Order execution failed`);
                    }
                } else {
                    const diff = ((currentPriceUsd - targetPriceUsd) / targetPriceUsd * 100).toFixed(2);
                    console.log(`   ⏳ Waiting... (${diff}% from target)`);
                }
            } catch (error) {
                console.error(`   ❌ Error processing order:`, error.message);
            }
        }
    } catch (error) {
        console.error('❌ Error checking orders:', error.message);
    }
}

// ============== PRICE MONITORING LOOP ==============
async function priceMonitorLoop() {
    while (isRunning) {
        try {
            const ethPrice = await fetchEthPrice();
            
            if (ethPrice > 0) {
                const priceChange = lastKnownEthPrice > 0 
                    ? Math.abs((ethPrice - lastKnownEthPrice) / lastKnownEthPrice * 100)
                    : 100;
                
                console.log(`\n💰 ETH Price: $${ethPrice.toFixed(2)} (${priceChange > 0 ? (ethPrice > lastKnownEthPrice ? '+' : '-') : ''}${priceChange.toFixed(2)}%)`);
                
                // Update on-chain if price changed significantly or first run
                if (priceChange >= CONFIG.MIN_PRICE_CHANGE_PERCENT || lastKnownEthPrice === 0) {
                    await updateOnChainPrices(ethPrice);
                }
                
                lastKnownEthPrice = ethPrice;
            }
        } catch (error) {
            console.error('❌ Price monitor error:', error.message);
        }
        
        await sleep(CONFIG.PRICE_CHECK_INTERVAL);
    }
}

// ============== ORDER MONITORING LOOP ==============
async function orderMonitorLoop() {
    // Wait a bit for first price sync
    await sleep(5000);
    
    while (isRunning) {
        try {
            console.log('\n🔍 Checking limit orders...');
            await checkAndExecuteOrders();
        } catch (error) {
            console.error('❌ Order monitor error:', error.message);
        }
        
        await sleep(CONFIG.ORDER_CHECK_INTERVAL);
    }
}

// ============== UTILITIES ==============
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getTokenSymbol(address) {
    const addr = address.toLowerCase();
    if (addr === CONTRACTS.METH.toLowerCase()) return 'mETH';
    if (addr === CONTRACTS.MWETH.toLowerCase()) return 'mWETH';
    if (addr === CONTRACTS.MUSDC.toLowerCase()) return 'mUSDC';
    if (addr === CONTRACTS.MDAI.toLowerCase()) return 'mDAI';
    return address.slice(0, 8);
}

// ============== MAIN ==============
async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   🤖 AUCTION DEX KEEPER BOT');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Price Check Interval: ${CONFIG.PRICE_CHECK_INTERVAL / 1000}s`);
    console.log(`   Order Check Interval: ${CONFIG.ORDER_CHECK_INTERVAL / 1000}s`);
    console.log(`   Min Price Change: ${CONFIG.MIN_PRICE_CHANGE_PERCENT}%`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Validate config
    if (!CONFIG.PRIVATE_KEY) {
        console.error('❌ PRIVATE_KEY not set in environment variables!');
        console.log('   Create a .env file with: PRIVATE_KEY=your_private_key');
        process.exit(1);
    }
    
    // Initialize clients
    account = privateKeyToAccount(`0x${CONFIG.PRIVATE_KEY.replace('0x', '')}`);
    
    publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(CONFIG.RPC_URL),
    });
    
    walletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(CONFIG.RPC_URL),
    });
    
    console.log(`🔑 Bot Wallet: ${account.address}`);
    
    // Check balance
    const balance = await publicClient.getBalance({ address: account.address });
    console.log(`💵 Balance: ${formatUnits(balance, 18)} ETH\n`);
    
    if (balance < parseUnits('0.001', 18)) {
        console.warn('⚠️  Warning: Low balance! Bot may fail to send transactions.');
    }
    
    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down...');
        isRunning = false;
        setTimeout(() => process.exit(0), 2000);
    });
    
    // Start monitoring loops
    console.log('🚀 Starting keeper bot...\n');
    
    // Run both loops concurrently
    await Promise.all([
        priceMonitorLoop(),
        orderMonitorLoop(),
    ]);
}

main().catch(console.error);

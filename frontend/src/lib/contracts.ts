// iExec Hack4Privacy - Arbitrum Sepolia Configuration
export const CONTRACTS = {
    // iExec infrastructure on Arbitrum Sepolia
    IEXEC_WORKERPOOL: (process.env.NEXT_PUBLIC_IEXEC_WORKERPOOL || '0xB967057a21dc6A66A29721d96b8Aa7454B7c383F') as `0x${string}`,

    // ShadowPool with instant swap + limit order execution
    SHADOW_POOL: (process.env.NEXT_PUBLIC_SHADOW_POOL_ADDRESS || '0xfFCdCE40dfD214F2e13F67d9337B0E0e22024F09') as `0x${string}`,
    PRICE_FEED: (process.env.NEXT_PUBLIC_PRICE_FEED_ADDRESS || '0xb87889a99AcCF70a2aeA7F63Fdcde302fCd2e006') as `0x${string}`,
    SHADOW_HOOK: (process.env.NEXT_PUBLIC_SHADOW_HOOK_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    IEXEC_IAPP: (process.env.NEXT_PUBLIC_IEXEC_IAPP_ADDRESS || '0x834255dF01eE89d5096371a7eeFaF4332d4e2bfF') as `0x${string}`,
} as const;

// ShadowPool ABI - Core functions for order management
export const SHADOW_POOL_ABI = [
    // Events
    {
        type: 'event',
        name: 'OrderSubmitted',
        inputs: [
            { name: 'orderId', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'batchId', type: 'uint256', indexed: true },
            { name: 'tokenIn', type: 'address', indexed: false },
            { name: 'amountIn', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'OrderCancelled',
        inputs: [
            { name: 'orderId', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
        ],
    },
    {
        type: 'event',
        name: 'BatchTriggered',
        inputs: [
            { name: 'batchId', type: 'uint256', indexed: true },
            { name: 'orderCount', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'BatchSettled',
        inputs: [
            { name: 'batchId', type: 'uint256', indexed: true },
            { name: 'cowMatches', type: 'uint256', indexed: false },
            { name: 'uniswapSwaps', type: 'uint256', indexed: false },
        ],
    },

    // Read functions
    {
        type: 'function',
        name: 'currentBatchId',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'batchInterval',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'lastBatchTimestamp',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getPendingOrderCount',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getOrder',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [
            { name: 'owner', type: 'address' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'status', type: 'uint8' },
            { name: 'batchId', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'getUserOrders',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'bytes32[]' }],
        stateMutability: 'view',
    },

    // Write functions
    {
        type: 'function',
        name: 'submitOrder',
        inputs: [
            { name: 'encryptedData', type: 'bytes' },
            { name: 'datasetAddress', type: 'bytes32' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
        ],
        outputs: [{ name: 'orderId', type: 'bytes32' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'submitLimitOrder',
        inputs: [
            { name: 'encryptedData', type: 'bytes' },
            { name: 'datasetAddress', type: 'bytes32' },
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'limitPrice', type: 'uint256' },
            { name: 'expiry', type: 'uint256' },
        ],
        outputs: [{ name: 'orderId', type: 'bytes32' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'cancelOrder',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'triggerBatch',
        inputs: [],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    // Instant Swap functions
    {
        type: 'function',
        name: 'instantSwap',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'getSwapQuote',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'liquidity',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'InstantSwap',
        inputs: [
            { name: 'user', type: 'address', indexed: true },
            { name: 'tokenIn', type: 'address', indexed: true },
            { name: 'tokenOut', type: 'address', indexed: true },
            { name: 'amountIn', type: 'uint256', indexed: false },
            { name: 'amountOut', type: 'uint256', indexed: false },
        ],
    },
    // Limit Order Execution functions
    {
        type: 'function',
        name: 'executeLimitOrder',
        inputs: [{ name: 'orderId', type: 'bytes32' }],
        outputs: [{ name: 'success', type: 'bool' }],
        stateMutability: 'nonpayable',
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
        type: 'event',
        name: 'LimitOrderExecuted',
        inputs: [
            { name: 'orderId', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
            { name: 'amountIn', type: 'uint256', indexed: false },
            { name: 'amountOut', type: 'uint256', indexed: false },
            { name: 'executionPrice', type: 'uint256', indexed: false },
        ],
    },
    {
        type: 'event',
        name: 'OrderExpired',
        inputs: [
            { name: 'orderId', type: 'bytes32', indexed: true },
            { name: 'owner', type: 'address', indexed: true },
        ],
    },
    // Additional view functions for limit orders
    {
        type: 'function',
        name: 'pendingOrderIds',
        inputs: [{ name: 'index', type: 'uint256' }],
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'userOrders',
        inputs: [
            { name: 'user', type: 'address' },
            { name: 'index', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
    },
] as const;

// ERC20 ABI for token approvals
export const ERC20_ABI = [
    {
        type: 'function',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
    },
    {
        type: 'function',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'function',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
        stateMutability: 'view',
    },
] as const;

export const MOCK_TOKEN_ABI = [
    {
        type: 'function',
        name: 'mint',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    ...ERC20_ABI
] as const;

// Price Feed ABI for syncing prices
export const PRICE_FEED_ABI = [
    {
        type: 'function',
        name: 'setPrice',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'priceUsd', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
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
    {
        type: 'function',
        name: 'prices',
        inputs: [{ name: 'token', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
    {
        type: 'event',
        name: 'PriceUpdated',
        inputs: [
            { name: 'token', type: 'address', indexed: true },
            { name: 'price', type: 'uint256', indexed: false },
            { name: 'timestamp', type: 'uint256', indexed: false },
        ],
    },
] as const;

// Token addresses for price syncing
export const MOCK_TOKENS = {
    METH: '0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2' as `0x${string}`,
    MWETH: '0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c' as `0x${string}`,
    MUSDC: '0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e' as `0x${string}`,
    MDAI: '0xda222533d71C37A9370C6b5a26BcB4C07EcB0454' as `0x${string}`,
} as const;

import { Token } from '@/types';

// Arbitrum Sepolia Testnet Token Addresses
// Note: Most tokens don't have official testnet deployments
// These are common test tokens or wrapped representations

export const SUPPORTED_TOKENS: Token[] = [
    {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73', // Arbitrum Sepolia WETH
        decimals: 18,
        logo: '/tokens/eth.svg',
        coingeckoId: 'ethereum'
    },
    {
        symbol: 'mUSDC',
        name: 'Mock USD Coin',
        address: '0xcC5f8FC3CcAB02157F82afb7E19Fc65f4808849e', // New deployed Mock USDC
        decimals: 18,
        logo: '/tokens/usdc.svg',
        coingeckoId: 'usd-coin'
    },
    {
        symbol: 'mDAI',
        name: 'Mock Dai',
        address: '0xda222533d71C37A9370C6b5a26BcB4C07EcB0454', // New deployed Mock DAI
        decimals: 18,
        logo: '/tokens/dai.svg',
        coingeckoId: 'dai'
    },
    {
        symbol: 'mETH',
        name: 'Mock Ether',
        address: '0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2', // New deployed Mock ETH
        decimals: 18,
        logo: '/tokens/eth.svg',
        coingeckoId: 'ethereum' // Uses real ETH price
    },
    {
        symbol: 'mWETH',
        name: 'Mock Wrapped Ether',
        address: '0xe160dc7BD1E9d63A47a1d4CD082c332DD19D870c', // New deployed Mock WETH
        decimals: 18,
        logo: '/tokens/eth.svg', // Same logo as ETH
        coingeckoId: 'ethereum' // Uses real ETH price
    },
    {
        symbol: 'LINK',
        name: 'Chainlink',
        address: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E', // Arbitrum Sepolia LINK
        decimals: 18,
        logo: '/tokens/link.svg',
        coingeckoId: 'chainlink'
    },
    {
        symbol: 'RLC',
        name: 'iExec RLC',
        address: '0x04445d221D96d669A4585474D90757a62A6a8384', // Correct iExec RLC on Arbitrum Sepolia
        decimals: 9, // RLC uses 9 decimals
        logo: '/tokens/rlc.svg',
        coingeckoId: 'iexec-rlc'
    }
];

// Token pair configuration with Chainlink price feed addresses
export const TOKEN_PAIRS = [
    // Stablecoin pairs
    { base: 'mUSDC', quote: 'mDAI', priceFeedId: 'USDC/USD' },
    { base: 'mDAI', quote: 'mUSDC', priceFeedId: 'DAI/USD' },
    
    // Real WETH pairs
    { base: 'WETH', quote: 'mUSDC', priceFeedId: 'ETH/USD' },
    { base: 'mUSDC', quote: 'WETH', priceFeedId: 'USDC/USD' },
    
    // LINK pairs
    { base: 'LINK', quote: 'mUSDC', priceFeedId: 'LINK/USD' },
    { base: 'mUSDC', quote: 'LINK', priceFeedId: 'USDC/USD' },
    
    // RLC pairs
    { base: 'RLC', quote: 'mUSDC', priceFeedId: 'RLC/USD' },
    { base: 'mUSDC', quote: 'RLC', priceFeedId: 'USDC/USD' },
    
    // Mock ETH pairs - track real ETH price for limit order testing
    { base: 'mETH', quote: 'mWETH', priceFeedId: 'ETH/USD' },
    { base: 'mWETH', quote: 'mETH', priceFeedId: 'ETH/USD' },
    
    // Mock ETH to stablecoin pairs
    { base: 'mETH', quote: 'mUSDC', priceFeedId: 'ETH/USD' },
    { base: 'mUSDC', quote: 'mETH', priceFeedId: 'USDC/USD' },
    { base: 'mWETH', quote: 'mUSDC', priceFeedId: 'ETH/USD' },
    { base: 'mUSDC', quote: 'mWETH', priceFeedId: 'USDC/USD' },
    
    // Mock ETH to DAI pairs
    { base: 'mETH', quote: 'mDAI', priceFeedId: 'ETH/USD' },
    { base: 'mDAI', quote: 'mETH', priceFeedId: 'DAI/USD' },
    { base: 'mWETH', quote: 'mDAI', priceFeedId: 'ETH/USD' },
    { base: 'mDAI', quote: 'mWETH', priceFeedId: 'DAI/USD' },
];

export const getTokenBySymbol = (symbol: string): Token | undefined => {
    return SUPPORTED_TOKENS.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
};

export const getTokenByAddress = (address: string): Token | undefined => {
    return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
};

export const getSwapPairs = () => {
    return TOKEN_PAIRS.map(pair => ({
        ...pair,
        baseToken: getTokenBySymbol(pair.base),
        quoteToken: getTokenBySymbol(pair.quote),
    }));
};

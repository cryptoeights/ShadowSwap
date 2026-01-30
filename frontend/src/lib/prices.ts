/**
 * Price Service - Real-time token price synchronization
 * Uses CoinGecko API for live prices (free tier, no API key needed)
 */

import { SUPPORTED_TOKENS } from './tokens';

// CoinGecko IDs for supported tokens
// mETH and mWETH track real ETH price for limit order testing
const PRICE_IDS: Record<string, string> = {
    'mUSDC': 'usd-coin',
    'mDAI': 'dai',
    'ETH': 'ethereum',
    'WETH': 'ethereum',
    'mETH': 'ethereum',   // Mock ETH tracks real ETH price
    'mWETH': 'ethereum',  // Mock WETH tracks real ETH price
    'LINK': 'chainlink',
    'RLC': 'iexec-rlc',
};


export interface TokenPrice {
    symbol: string;
    usdPrice: number;
    change24h: number;
    lastUpdated: number;
}

type PriceCache = Map<string, TokenPrice>;

// In-memory price cache
const priceCache: PriceCache = new Map();
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetch prices for all supported tokens from CoinGecko
 */
export async function fetchAllPrices(): Promise<TokenPrice[]> {
    const now = Date.now();

    // Return cached data if still fresh
    if (now - lastFetchTime < CACHE_DURATION && priceCache.size > 0) {
        return Array.from(priceCache.values());
    }

    try {
        const ids = Object.values(PRICE_IDS).join(',');

        if (!ids) {
            console.warn('No CoinGecko IDs configured for price fetching.');
            return getFallbackPrices();
        }

        // Use our internal proxy API to avoid CORS and handle rate limits
        const response = await fetch(`/api/prices?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);

        if (!response.ok) {
            throw new Error(`Price fetch failed: ${response.status}`);
        }

        const data = await response.json();
        const fetchedPrices: TokenPrice[] = [];

        // Parse response and update cache
        SUPPORTED_TOKENS.forEach(token => {
            const coingeckoId = PRICE_IDS[token.symbol];
            if (coingeckoId && data[coingeckoId]) {
                const priceData = data[coingeckoId];
                const price: TokenPrice = {
                    symbol: token.symbol,
                    usdPrice: priceData.usd || 0,
                    change24h: priceData.usd_24h_change || 0,
                    lastUpdated: now,
                };
                priceCache.set(token.symbol, price);
                fetchedPrices.push(price);
            } else if (['mUSDC', 'mDAI', 'USDC', 'USDT', 'DAI'].includes(token.symbol)) {
                // Stablecoin fallback if not found in API response
                const price: TokenPrice = {
                    symbol: token.symbol,
                    usdPrice: 1,
                    change24h: 0,
                    lastUpdated: now,
                };
                priceCache.set(token.symbol, price);
                fetchedPrices.push(price);
            }
        });

        lastFetchTime = now;
        return fetchedPrices;
    } catch (error) {
        console.error('Failed to fetch prices:', error);
        return getFallbackPrices();
    }
}

/**
 * Get price for a specific token
 */
export async function getTokenPrice(symbol: string): Promise<number> {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
        return cached.usdPrice;
    }

    // Fetch all prices and return the specific one
    await fetchAllPrices();
    return priceCache.get(symbol)?.usdPrice || 0;
}

/**
 * Calculate swap output amount
 */
export async function calculateSwapOutput(
    fromSymbol: string,
    toSymbol: string,
    fromAmount: number
): Promise<{ output: number; rate: number }> {
    const fromPrice = await getTokenPrice(fromSymbol);
    const toPrice = await getTokenPrice(toSymbol);

    if (fromPrice === 0 || toPrice === 0) {
        return { output: 0, rate: 0 };
    }

    const rate = fromPrice / toPrice;
    const output = fromAmount * rate;

    return { output, rate };
}

/**
 * Get exchange rate between two tokens
 */
export async function getExchangeRate(fromSymbol: string, toSymbol: string): Promise<number> {
    const fromPrice = await getTokenPrice(fromSymbol);
    const toPrice = await getTokenPrice(toSymbol);

    if (fromPrice === 0 || toPrice === 0) return 0;

    return fromPrice / toPrice;
}

/**
 * Fallback prices when API is unavailable
 */
function getFallbackPrices(): TokenPrice[] {
    const fallbackPrices: Record<string, number> = {
        ETH: 2500,
        WETH: 2500,
        mETH: 2500,   // Mock ETH tracks real ETH price
        mWETH: 2500,  // Mock WETH tracks real ETH price
        USDC: 1,
        USDT: 1,
        DAI: 1,
        mUSDC: 1,
        mDAI: 1,
        WBTC: 45000,
        ARB: 1.2,
        LINK: 15,
        RLC: 2.5,
    };

    return SUPPORTED_TOKENS.map(token => ({
        symbol: token.symbol,
        usdPrice: fallbackPrices[token.symbol] || 0,
        change24h: 0,
        lastUpdated: Date.now(),
    }));
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals = 2): string {
    if (price >= 1000) {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }
    if (price >= 1) {
        return price.toFixed(decimals);
    }
    // For very small prices
    return price.toPrecision(4);
}

/**
 * Format price change with color indicator
 */
export function formatPriceChange(change: number): { text: string; isPositive: boolean } {
    const isPositive = change >= 0;
    const text = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
    return { text, isPositive };
}

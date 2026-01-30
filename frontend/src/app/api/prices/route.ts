import { NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Simple in-memory cache
let cache: {
    data: any;
    timestamp: number;
} | null = null;

const CACHE_DURATION = 60 * 1000; // 1 minute cache

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    const vs_currencies = searchParams.get('vs_currencies') || 'usd';
    const include_24hr_change = searchParams.get('include_24hr_change') || 'true';

    if (!ids) {
        return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    // Check cache first
    const now = Date.now();
    if (cache && (now - cache.timestamp < CACHE_DURATION) && cache.data) {
        return NextResponse.json(cache.data);
    }

    try {
        const response = await fetch(
            `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=${vs_currencies}&include_24hr_change=${include_24hr_change}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 60 } // Next.js fetch caching
            }
        );

        if (!response.ok) {
            if (response.status === 429) {
                // Return cached data if available even if expired, or mock data as fallback
                if (cache?.data) return NextResponse.json(cache.data);

                // Fallback mock prices if rate limited and no cache
                return NextResponse.json({
                    'ethereum': { usd: 2300, usd_24h_change: 0 },
                    'usd-coin': { usd: 1, usd_24h_change: 0 },
                    'dai': { usd: 1, usd_24h_change: 0 },
                    'chainlink': { usd: 14, usd_24h_change: 0 },
                    'iexec-rlc': { usd: 2.5, usd_24h_change: 0 }
                });
            }
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        // Update cache
        cache = {
            data,
            timestamp: now
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Price fetch error:', error);

        // Return fallback data on error
        return NextResponse.json({
            'ethereum': { usd: 2300, usd_24h_change: 0 },
            'usd-coin': { usd: 1, usd_24h_change: 0 },
            'dai': { usd: 1, usd_24h_change: 0 },
            'chainlink': { usd: 14, usd_24h_change: 0 },
            'iexec-rlc': { usd: 2.5, usd_24h_change: 0 }
        });
    }
}

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || '';

// GraphQL query response types
export interface SubgraphOrder {
    id: string;
    orderId: string;
    owner: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string | null;
    status: 'pending' | 'executed' | 'cancelled' | 'expired';
    orderType: 'market' | 'limit';
    batchId: string | null;
    settlementType: 'cow_match' | 'uniswap_swap' | null;
    limitPrice: string | null;
    expiry: string | null;
    timestamp: string;
    executedAt: string | null;
}

export interface SubgraphBatch {
    id: string;
    batchId: string;
    orderCount: string;
    cowMatches: string;
    uniswapSwaps: string;
    totalVolume: string;
    timestamp: string;
    settledAt: string | null;
}

/**
 * Fetch user orders from the subgraph
 */
export async function fetchUserOrders(
    userAddress: string,
    first: number = 50,
    skip: number = 0
): Promise<SubgraphOrder[]> {
    if (!SUBGRAPH_URL) {
        console.warn('Subgraph URL not configured');
        return [];
    }

    const query = `
    query GetUserOrders($user: String!, $first: Int!, $skip: Int!) {
      orders(
        where: { owner: $user }
        orderBy: timestamp
        orderDirection: desc
        first: $first
        skip: $skip
      ) {
        id
        orderId
        owner
        tokenIn
        tokenOut
        amountIn
        amountOut
        status
        orderType
        batchId
        settlementType
        limitPrice
        expiry
        timestamp
        executedAt
      }
    }
  `;

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: {
                    user: userAddress.toLowerCase(),
                    first,
                    skip,
                },
            }),
        });

        const { data, errors } = await response.json();

        if (errors) {
            console.error('Subgraph query errors:', errors);
            return [];
        }

        return data?.orders || [];
    } catch (error) {
        console.error('Failed to fetch user orders:', error);
        return [];
    }
}

/**
 * Fetch recent batches from the subgraph
 */
export async function fetchRecentBatches(
    first: number = 20
): Promise<SubgraphBatch[]> {
    if (!SUBGRAPH_URL) {
        console.warn('Subgraph URL not configured');
        return [];
    }

    const query = `
    query GetRecentBatches($first: Int!) {
      batches(
        orderBy: timestamp
        orderDirection: desc
        first: $first
      ) {
        id
        batchId
        orderCount
        cowMatches
        uniswapSwaps
        totalVolume
        timestamp
        settledAt
      }
    }
  `;

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { first },
            }),
        });

        const { data, errors } = await response.json();

        if (errors) {
            console.error('Subgraph query errors:', errors);
            return [];
        }

        return data?.batches || [];
    } catch (error) {
        console.error('Failed to fetch recent batches:', error);
        return [];
    }
}

/**
 * Fetch analytics data from the subgraph
 */
export async function fetchAnalytics(): Promise<{
    totalVolume: string;
    totalOrders: number;
    totalCowMatches: number;
    averageCowMatchRate: number;
}> {
    if (!SUBGRAPH_URL) {
        console.warn('Subgraph URL not configured');
        return {
            totalVolume: '0',
            totalOrders: 0,
            totalCowMatches: 0,
            averageCowMatchRate: 0,
        };
    }

    const query = `
    query GetAnalytics {
      protocol(id: "shadowswap") {
        totalVolume
        totalOrders
        totalCowMatches
        totalUniswapSwaps
      }
    }
  `;

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });

        const { data, errors } = await response.json();

        if (errors) {
            console.error('Subgraph query errors:', errors);
            return {
                totalVolume: '0',
                totalOrders: 0,
                totalCowMatches: 0,
                averageCowMatchRate: 0,
            };
        }

        const protocol = data?.protocol;
        if (!protocol) {
            return {
                totalVolume: '0',
                totalOrders: 0,
                totalCowMatches: 0,
                averageCowMatchRate: 0,
            };
        }

        const totalOrders = parseInt(protocol.totalOrders || '0');
        const totalCowMatches = parseInt(protocol.totalCowMatches || '0');
        const averageCowMatchRate = totalOrders > 0
            ? (totalCowMatches / totalOrders) * 100
            : 0;

        return {
            totalVolume: protocol.totalVolume || '0',
            totalOrders,
            totalCowMatches,
            averageCowMatchRate,
        };
    } catch (error) {
        console.error('Failed to fetch analytics:', error);
        return {
            totalVolume: '0',
            totalOrders: 0,
            totalCowMatches: 0,
            averageCowMatchRate: 0,
        };
    }
}

/**
 * Fetch a specific order by ID
 */
export async function fetchOrderById(
    orderId: string
): Promise<SubgraphOrder | null> {
    if (!SUBGRAPH_URL) {
        console.warn('Subgraph URL not configured');
        return null;
    }

    const query = `
    query GetOrder($orderId: String!) {
      order(id: $orderId) {
        id
        orderId
        owner
        tokenIn
        tokenOut
        amountIn
        amountOut
        status
        orderType
        batchId
        settlementType
        limitPrice
        expiry
        timestamp
        executedAt
      }
    }
  `;

    try {
        const response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                variables: { orderId },
            }),
        });

        const { data, errors } = await response.json();

        if (errors) {
            console.error('Subgraph query errors:', errors);
            return null;
        }

        return data?.order || null;
    } catch (error) {
        console.error('Failed to fetch order:', error);
        return null;
    }
}

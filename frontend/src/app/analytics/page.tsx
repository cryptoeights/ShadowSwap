'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, DollarSign, Handshake, ArrowRightLeft, Clock, Package, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { CONTRACTS } from '@/lib/contracts';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { getArbiscanTxUrl } from '@/lib/transactionHistory';

// Helper to get token by address
function getTokenByAddress(address: string) {
    return SUPPORTED_TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );
}

// Event signatures
const EVENTS = {
    InstantSwap: parseAbiItem('event InstantSwap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)'),
    LimitOrderExecuted: parseAbiItem('event LimitOrderExecuted(bytes32 indexed orderId, address indexed owner, uint256 amountIn, uint256 amountOut, uint256 executionPrice)'),
    OrderSubmitted: parseAbiItem('event OrderSubmitted(bytes32 indexed orderId, address indexed owner, uint256 indexed batchId, address tokenIn, uint256 amountIn)'),
    BatchTriggered: parseAbiItem('event BatchTriggered(uint256 indexed batchId, uint256 orderCount, uint256 timestamp)'),
    BatchSettled: parseAbiItem('event BatchSettled(uint256 indexed batchId, uint256 matchCount)'),
};

interface GlobalStats {
    totalVolume: number;
    totalSwaps: number;
    totalLimitOrders: number;
    totalExecuted: number;
    isLoading: boolean;
}

interface BatchData {
    batchId: number;
    orderCount: number;
    matchCount: number;
    timestamp: number;
    txHash: string;
}

interface PairVolume {
    pair: string;
    volume: number;
    count: number;
}

export default function AnalyticsPage() {
    const publicClient = usePublicClient();
    const [period, setPeriod] = useState<'24H' | '7D' | '30D'>('7D');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<GlobalStats>({
        totalVolume: 0,
        totalSwaps: 0,
        totalLimitOrders: 0,
        totalExecuted: 0,
        isLoading: true,
    });
    const [batches, setBatches] = useState<BatchData[]>([]);
    const [pairVolumes, setPairVolumes] = useState<PairVolume[]>([]);
    const [settlementDist, setSettlementDist] = useState({
        instantSwaps: 0,
        limitExecuted: 0,
        pending: 0,
    });

    // Calculate block range based on period
    const getBlockRange = (currentBlock: bigint): bigint => {
        // Arbitrum ~0.25s block time
        const blocksPerHour = BigInt(14400);
        switch (period) {
            case '24H':
                return blocksPerHour * BigInt(24);
            case '7D':
                return blocksPerHour * BigInt(24 * 7);
            case '30D':
                return blocksPerHour * BigInt(24 * 30);
            default:
                return blocksPerHour * BigInt(24 * 7);
        }
    };

    const fetchAnalytics = async () => {
        if (!publicClient) return;

        setIsLoading(true);

        try {
            const currentBlock = await publicClient.getBlockNumber();
            const blockRange = getBlockRange(currentBlock);
            const fromBlock = currentBlock > blockRange ? currentBlock - blockRange : BigInt(0);

            console.log(`Fetching analytics from block ${fromBlock} to ${currentBlock}...`);

            // Fetch all events in parallel
            const [swapLogs, executedLogs, submittedLogs, batchTriggeredLogs, batchSettledLogs] = await Promise.all([
                publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.InstantSwap,
                    fromBlock,
                    toBlock: currentBlock,
                }).catch(() => []),
                publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.LimitOrderExecuted,
                    fromBlock,
                    toBlock: currentBlock,
                }).catch(() => []),
                publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.OrderSubmitted,
                    fromBlock,
                    toBlock: currentBlock,
                }).catch(() => []),
                publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.BatchTriggered,
                    fromBlock,
                    toBlock: currentBlock,
                }).catch(() => []),
                publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.BatchSettled,
                    fromBlock,
                    toBlock: currentBlock,
                }).catch(() => []),
            ]);

            // Calculate total volume (in USD terms)
            let totalVolume = 0;
            const pairVolumeMap = new Map<string, { volume: number; count: number }>();

            // Process instant swaps
            for (const log of swapLogs) {
                const tokenIn = getTokenByAddress(log.args.tokenIn as string);
                const tokenOut = getTokenByAddress(log.args.tokenOut as string);
                const amountOut = Number(formatUnits(log.args.amountOut as bigint, tokenOut?.decimals || 18));
                
                // If output is stablecoin, use that as USD value
                if (tokenOut?.symbol === 'mUSDC' || tokenOut?.symbol === 'mDAI') {
                    totalVolume += amountOut;
                } else {
                    // Estimate based on amount in
                    const amountIn = Number(formatUnits(log.args.amountIn as bigint, tokenIn?.decimals || 18));
                    totalVolume += amountIn * 2700; // Rough ETH estimate
                }

                // Track pair volume
                const pair = `${tokenIn?.symbol || '?'}/${tokenOut?.symbol || '?'}`;
                const existing = pairVolumeMap.get(pair) || { volume: 0, count: 0 };
                pairVolumeMap.set(pair, { 
                    volume: existing.volume + amountOut, 
                    count: existing.count + 1 
                });
            }

            // Process executed limit orders
            for (const log of executedLogs) {
                const amountOut = Number(formatUnits(log.args.amountOut as bigint, 18));
                totalVolume += amountOut;
            }

            // Convert pair volumes to array and sort
            const pairVolumesArray = Array.from(pairVolumeMap.entries())
                .map(([pair, data]) => ({ pair, ...data }))
                .sort((a, b) => b.volume - a.volume)
                .slice(0, 5);

            // Process batches
            const batchMap = new Map<number, BatchData>();
            
            for (const log of batchTriggeredLogs) {
                const batchId = Number(log.args.batchId);
                batchMap.set(batchId, {
                    batchId,
                    orderCount: Number(log.args.orderCount),
                    matchCount: 0,
                    timestamp: Number(log.args.timestamp) * 1000,
                    txHash: log.transactionHash,
                });
            }

            for (const log of batchSettledLogs) {
                const batchId = Number(log.args.batchId);
                const existing = batchMap.get(batchId);
                if (existing) {
                    existing.matchCount = Number(log.args.matchCount);
                }
            }

            const batchesArray = Array.from(batchMap.values())
                .sort((a, b) => b.batchId - a.batchId)
                .slice(0, 10);

            // Calculate settlement distribution
            const total = swapLogs.length + executedLogs.length + (submittedLogs.length - executedLogs.length);
            const distribution = {
                instantSwaps: total > 0 ? Math.round((swapLogs.length / total) * 100) : 0,
                limitExecuted: total > 0 ? Math.round((executedLogs.length / total) * 100) : 0,
                pending: total > 0 ? Math.round(((submittedLogs.length - executedLogs.length) / total) * 100) : 0,
            };

            // Update state
            setStats({
                totalVolume,
                totalSwaps: swapLogs.length,
                totalLimitOrders: submittedLogs.length,
                totalExecuted: executedLogs.length,
                isLoading: false,
            });
            setBatches(batchesArray);
            setPairVolumes(pairVolumesArray);
            setSettlementDist(distribution);

            console.log('Analytics loaded:', {
                swaps: swapLogs.length,
                executed: executedLogs.length,
                submitted: submittedLogs.length,
                batches: batchesArray.length,
            });

        } catch (e) {
            console.error('Failed to fetch analytics:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [publicClient, period]);

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return `$${(vol / 1000000).toFixed(2)}M`;
        if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
        return `$${vol.toFixed(2)}`;
    };

    const formatTimeAgo = (timestamp: number) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const maxPairVolume = pairVolumes.length > 0 ? pairVolumes[0].volume : 1;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
                <div className="flex items-center gap-3">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={fetchAnalytics}
                        disabled={isLoading}
                        leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                    <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
                        {(['24H', '7D', '30D'] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    period === p
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span className="text-sm text-blue-400">Loading analytics from blockchain...</span>
                </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/15 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                {formatVolume(stats.totalVolume)}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">Total Volume</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center">
                            <ArrowRightLeft className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalSwaps}</p>
                            <p className="text-sm text-[var(--text-muted)]">Instant Swaps</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalLimitOrders}</p>
                            <p className="text-sm text-[var(--text-muted)]">Limit Orders</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                            <Handshake className="w-6 h-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalExecuted}</p>
                            <p className="text-sm text-[var(--text-muted)]">Limits Executed</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Settlement Distribution */}
                <Card padding="none">
                    <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                        <CardTitle>Settlement Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <ArrowRightLeft className="w-5 h-5 text-green-500" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-[var(--text-secondary)]">Instant Swaps</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {settlementDist.instantSwaps}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-green-500 transition-all"
                                            style={{ width: `${settlementDist.instantSwaps}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-[var(--text-secondary)]">Limit Executed</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {settlementDist.limitExecuted}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-purple-500 transition-all"
                                            style={{ width: `${settlementDist.limitExecuted}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-[var(--text-secondary)]">Pending/Queued</span>
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {settlementDist.pending}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-yellow-500 transition-all"
                                            style={{ width: `${settlementDist.pending}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Pairs */}
                <Card padding="none">
                    <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                        <CardTitle>Top Trading Pairs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        {pairVolumes.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>No trading data yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pairVolumes.map((pair) => (
                                    <div key={pair.pair} className="flex items-center gap-3">
                                        <BarChart3 className="w-5 h-5 text-[var(--accent-primary)]" />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                                    {pair.pair}
                                                </span>
                                                <span className="text-sm text-[var(--text-secondary)]">
                                                    {formatVolume(pair.volume)} ({pair.count} trades)
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] transition-all"
                                                    style={{ width: `${(pair.volume / maxPairVolume) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Batches */}
            <Card padding="none">
                <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                    <CardTitle>Recent Batch Executions</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    {batches.length === 0 ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No batch executions yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-[var(--text-muted)] border-b border-[var(--border-secondary)]">
                                        <th className="pb-3 font-medium">Batch</th>
                                        <th className="pb-3 font-medium">Orders</th>
                                        <th className="pb-3 font-medium">Executed</th>
                                        <th className="pb-3 font-medium">Time</th>
                                        <th className="pb-3 font-medium">Transaction</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {batches.map((batch) => (
                                        <tr key={batch.batchId} className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)]">
                                            <td className="py-3 font-medium text-[var(--text-primary)]">#{batch.batchId}</td>
                                            <td className="py-3 text-[var(--text-secondary)]">{batch.orderCount}</td>
                                            <td className="py-3">
                                                <span className="flex items-center gap-1.5 text-green-400">
                                                    <Handshake className="w-4 h-4" />
                                                    {batch.matchCount}
                                                </span>
                                            </td>
                                            <td className="py-3 text-[var(--text-muted)]">
                                                {batch.timestamp > 0 ? formatTimeAgo(batch.timestamp) : 'Unknown'}
                                            </td>
                                            <td className="py-3">
                                                <a
                                                    href={getArbiscanTxUrl(batch.txHash)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[var(--accent-primary)] hover:underline flex items-center gap-1"
                                                >
                                                    {batch.txHash.slice(0, 8)}...
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

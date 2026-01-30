'use client';

import { Package, Handshake, DollarSign, Clock, CheckCircle2, X, TrendingUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { formatUnits } from 'viem';
import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { CONTRACTS, SHADOW_POOL_ABI } from '@/lib/contracts';
import { useUserOrders, useCancelOrder, useCanExecuteLimitOrder, useExecuteLimitOrder } from '@/hooks/useShadowPool';
import { useOrderEvents } from '@/hooks/useBatchEvents';
import { useBlockchainHistory } from '@/hooks/useBlockchainHistory';
import { useQueryClient } from '@tanstack/react-query';
import TransactionHistory from '@/components/swap/TransactionHistory';
import { getArbiscanTxUrl } from '@/lib/transactionHistory';

const ORDER_STATUS_MAP = ['pending', 'executed', 'cancelled', 'expired'] as const;

function getTokenByAddress(address: string) {
    return SUPPORTED_TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );
}

function formatPrice(price: bigint): string {
    const priceNum = Number(formatUnits(price, 18));
    if (priceNum >= 1000) return priceNum.toFixed(2);
    if (priceNum >= 1) return priceNum.toFixed(4);
    return priceNum.toFixed(6);
}

// Detailed Order Row with limit order info
function OrderRow({ orderId, onCancel, isCancelling }: {
    orderId: `0x${string}`;
    onCancel: (id: `0x${string}`) => void;
    isCancelling: boolean;
}) {
    const publicClient = usePublicClient();
    const [orderDetails, setOrderDetails] = useState<{
        owner: string;
        tokenIn: string;
        tokenOut: string;
        amountIn: bigint;
        limitPrice: bigint;
        expiry: bigint;
        status: number;
        batchId: bigint;
        timestamp: bigint;
    } | null>(null);

    // Fetch order details
    useEffect(() => {
        async function fetchDetails() {
            if (!publicClient) return;
            try {
                const result = await publicClient.readContract({
                    address: CONTRACTS.SHADOW_POOL,
                    abi: SHADOW_POOL_ABI,
                    functionName: 'getOrderDetails',
                    args: [orderId],
                }) as [string, string, string, bigint, bigint, bigint, number, bigint, bigint];
                
                setOrderDetails({
                    owner: result[0],
                    tokenIn: result[1],
                    tokenOut: result[2],
                    amountIn: result[3],
                    limitPrice: result[4],
                    expiry: result[5],
                    status: result[6],
                    batchId: result[7],
                    timestamp: result[8],
                });
            } catch (e) {
                console.error('Failed to fetch order details:', e);
            }
        }
        fetchDetails();
    }, [publicClient, orderId]);

    // Check if can execute (for limit orders)
    const { data: canExecuteData } = useCanExecuteLimitOrder(
        orderDetails?.limitPrice && orderDetails.limitPrice > BigInt(0) && orderDetails.status === 0
            ? orderId 
            : undefined
    );
    
    const { 
        executeLimitOrder, 
        isPending: isExecuting, 
        isConfirming: isExecuteConfirming 
    } = useExecuteLimitOrder();

    if (!orderDetails) {
        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-[var(--bg-tertiary)] rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-[var(--bg-tertiary)] rounded w-2/3"></div>
            </div>
        );
    }

    const tokenInInfo = getTokenByAddress(orderDetails.tokenIn);
    const tokenOutInfo = getTokenByAddress(orderDetails.tokenOut);
    const statusLabel = ORDER_STATUS_MAP[orderDetails.status] || 'unknown';
    const decimals = tokenInInfo?.decimals || 18;
    const formattedAmount = formatUnits(orderDetails.amountIn, decimals);
    const isLimitOrder = orderDetails.limitPrice > BigInt(0);
    const isPending = orderDetails.status === 0;
    const canExecute = canExecuteData?.[0] || false;
    const currentPrice = canExecuteData?.[1] || BigInt(0);
    const targetPrice = canExecuteData?.[2] || orderDetails.limitPrice;
    const isExpired = orderDetails.expiry > BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) > orderDetails.expiry;

    const statusConfig: Record<string, { color: string; Icon: typeof Clock; bg: string }> = {
        pending: { color: 'text-yellow-400', Icon: Clock, bg: 'bg-yellow-500/10' },
        executed: { color: 'text-green-400', Icon: CheckCircle2, bg: 'bg-green-500/10' },
        cancelled: { color: 'text-gray-400', Icon: X, bg: 'bg-gray-500/10' },
        expired: { color: 'text-red-400', Icon: AlertTriangle, bg: 'bg-red-500/10' },
    };

    const cfg = statusConfig[statusLabel] || statusConfig.pending;

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                        <cfg.Icon className="w-3 h-3" />
                        {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                    </span>
                    {isLimitOrder && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Limit
                        </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">Batch #{Number(orderDetails.batchId)}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                    {orderId.slice(0, 8)}...{orderId.slice(-6)}
                </span>
            </div>

            {/* Order Details */}
            <div className="mb-3">
                <p className="text-base font-semibold text-[var(--text-primary)]">
                    {parseFloat(formattedAmount).toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                    {tokenInInfo?.symbol || '???'} → {tokenOutInfo?.symbol || '???'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Created: {new Date(Number(orderDetails.timestamp) * 1000).toLocaleString()}
                </p>
            </div>

            {/* Limit Order Info */}
            {isLimitOrder && isPending && (
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] mb-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-[var(--text-muted)]">Target Price</p>
                            <p className="font-medium text-[var(--text-primary)]">${formatPrice(targetPrice)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-muted)]">Current Price</p>
                            <p className={`font-medium ${currentPrice >= targetPrice ? 'text-green-400' : 'text-yellow-400'}`}>
                                ${formatPrice(currentPrice)}
                            </p>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all ${canExecute ? 'bg-green-500' : 'bg-yellow-500'}`}
                                style={{ 
                                    width: `${Math.min(100, Math.max(0, (Number(currentPrice) / Number(targetPrice)) * 100))}%` 
                                }}
                            />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {canExecute ? '✅ Target reached! Ready to execute' : 'Waiting for price target...'}
                        </p>
                    </div>

                    {/* Expiry */}
                    {orderDetails.expiry > BigInt(0) && (
                        <p className={`text-xs mt-2 ${isExpired ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                            {isExpired 
                                ? '⚠️ Expired' 
                                : `Expires: ${new Date(Number(orderDetails.expiry) * 1000).toLocaleString()}`
                            }
                        </p>
                    )}
                </div>
            )}

            {/* Actions */}
            {isPending && (
                <div className="flex gap-2">
                    {canExecute && isLimitOrder && (
                        <Button
                            size="sm"
                            onClick={() => executeLimitOrder(orderId)}
                            disabled={isExecuting || isExecuteConfirming}
                            isLoading={isExecuting || isExecuteConfirming}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            Execute Now
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(orderId)}
                        disabled={isCancelling}
                        leftIcon={<X className="w-3 h-3" />}
                        className="text-red-400 hover:text-red-300"
                    >
                        {isCancelling ? 'Cancelling...' : 'Cancel'}
                    </Button>
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const queryClient = useQueryClient();

    // Get user order IDs from contract
    const { data: userOrderIds, refetch: refetchOrders } = useUserOrders(address);

    // Cancel order hook
    const { cancelOrder, isPending: isCancelling, isSuccess: isCancelSuccess } = useCancelOrder();

    // Real-time order events
    const { latestOrder } = useOrderEvents(address);

    // Blockchain history for stats
    const { transactions } = useBlockchainHistory();

    // Calculate stats from history
    const stats = {
        totalOrders: (userOrderIds as `0x${string}`[] | undefined)?.length || 0,
        executedOrders: transactions.filter(tx => tx.type === 'execute' || (tx.type === 'swap' && tx.status === 'success')).length,
        totalVolume: transactions.reduce((sum, tx) => {
            if (tx.amountOut) {
                return sum + parseFloat(tx.amountOut);
            }
            return sum;
        }, 0),
    };

    // Refetch when new events arrive
    useEffect(() => {
        if (latestOrder) {
            refetchOrders();
        }
    }, [latestOrder, refetchOrders]);

    // Refresh order statuses after cancel succeeds
    useEffect(() => {
        if (isCancelSuccess) {
            queryClient.invalidateQueries({ queryKey: ['readContract'] });
        }
    }, [isCancelSuccess, queryClient]);

    const handleCancelOrder = async (orderId: `0x${string}`) => {
        try {
            await cancelOrder(orderId);
        } catch (error) {
            console.error('Failed to cancel order:', error);
        }
    };

    const orderIds = (userOrderIds as `0x${string}`[] | undefined) || [];

    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Dashboard</h1>
                <Card className="text-center py-16">
                    <Package className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)]" />
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                        Connect Your Wallet
                    </h2>
                    <p className="text-[var(--text-muted)] mb-6">
                        Connect your wallet to view your orders and trading history.
                    </p>
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
                <a
                    href={`https://sepolia.arbiscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex items-center gap-1"
                >
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-warning)]/10">
                            <Package className="w-6 h-6 text-[var(--accent-warning)]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalOrders}</p>
                            <p className="text-sm text-[var(--text-muted)]">Total Orders</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-success)]/10">
                            <CheckCircle2 className="w-6 h-6 text-[var(--accent-success)]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.executedOrders}</p>
                            <p className="text-sm text-[var(--text-muted)]">Executed</p>
                        </div>
                    </div>
                </Card>
                <Card padding="md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--accent-primary)]/10">
                            <DollarSign className="w-6 h-6 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-[var(--text-primary)]">
                                ${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-[var(--text-muted)]">Volume</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Orders */}
                <Card padding="none">
                    <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                        <CardTitle>Your Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                        {orderIds.length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No orders yet.</p>
                                <p className="text-sm mt-1">Submit an order from the Swap page.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {[...orderIds].reverse().map((orderId) => (
                                    <OrderRow
                                        key={orderId}
                                        orderId={orderId}
                                        onCancel={handleCancelOrder}
                                        isCancelling={isCancelling}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Transaction History */}
                <TransactionHistory />
            </div>
        </div>
    );
}

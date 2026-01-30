'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { Clock, CheckCircle2, XCircle, AlertTriangle, Zap, RefreshCw, TrendingUp, TrendingDown, Radio, Wifi, WifiOff } from 'lucide-react';
import { CONTRACTS, SHADOW_POOL_ABI } from '@/lib/contracts';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { 
    useOrderDetails, 
    useCanExecuteLimitOrder, 
    useExecuteLimitOrder,
    useCancelOrder,
    useCurrentPrice,
    useSyncPrices,
} from '@/hooks/useShadowPool';
import { useLimitOrderExecutedEvents } from '@/hooks/useBatchEvents';
import { getTokenPrice } from '@/lib/prices';
import { Button } from '@/components/ui';
import { saveTransaction, updateTransactionStatus } from '@/lib/transactionHistory';

// Order status enum matching the contract
enum OrderStatus {
    Pending = 0,
    Executed = 1,
    Cancelled = 2,
    Expired = 3,
}

interface LimitOrder {
    orderId: `0x${string}`;
    owner: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    limitPrice: bigint;
    expiry: bigint;
    status: OrderStatus;
    batchId: bigint;
    timestamp: bigint;
}

function getTokenByAddress(address: string) {
    return SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

function formatPrice(price: bigint): string {
    const priceNum = Number(formatUnits(price, 18));
    if (priceNum >= 1000) return priceNum.toFixed(2);
    if (priceNum >= 1) return priceNum.toFixed(4);
    return priceNum.toFixed(6);
}

function getStatusBadge(status: OrderStatus) {
    switch (status) {
        case OrderStatus.Pending:
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending
                </span>
            );
        case OrderStatus.Executed:
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Executed
                </span>
            );
        case OrderStatus.Cancelled:
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-gray-500/20 text-gray-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Cancelled
                </span>
            );
        case OrderStatus.Expired:
            return (
                <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Expired
                </span>
            );
    }
}

// Individual order card component
function LimitOrderCard({ orderId, onRefresh }: { orderId: `0x${string}`; onRefresh: () => void }) {
    const { address } = useAccount();
    const { data: orderData, refetch: refetchOrder } = useOrderDetails(orderId);
    const { data: canExecuteData, refetch: refetchCanExecute } = useCanExecuteLimitOrder(orderId);
    const { 
        executeLimitOrder, 
        hash: executeHash,
        isPending: isExecuting, 
        isConfirming: isExecuteConfirming,
        isSuccess: isExecuteSuccess,
    } = useExecuteLimitOrder();
    const {
        cancelOrder,
        hash: cancelHash,
        isPending: isCancelling,
        isConfirming: isCancelConfirming,
        isSuccess: isCancelSuccess,
    } = useCancelOrder();

    // Parse order data
    const order: LimitOrder | null = orderData ? {
        orderId,
        owner: orderData[0] as string,
        tokenIn: orderData[1] as string,
        tokenOut: orderData[2] as string,
        amountIn: orderData[3] as bigint,
        limitPrice: orderData[4] as bigint,
        expiry: orderData[5] as bigint,
        status: orderData[6] as OrderStatus,
        batchId: orderData[7] as bigint,
        timestamp: orderData[8] as bigint,
    } : null;

    // Get current price for token
    const { data: currentPriceData } = useCurrentPrice(order?.tokenIn as `0x${string}`);
    
    const tokenIn = order ? getTokenByAddress(order.tokenIn) : null;
    const tokenOut = order ? getTokenByAddress(order.tokenOut) : null;
    
    // Save execute transaction to history
    useEffect(() => {
        if (executeHash && order && tokenIn && tokenOut) {
            const amountInFormatted = formatUnits(order.amountIn, tokenIn.decimals || 18);
            const limitPriceFormatted = formatPrice(order.limitPrice);
            
            saveTransaction({
                hash: executeHash,
                type: 'execute',
                tokenIn: tokenIn.symbol,
                tokenOut: tokenOut.symbol,
                amountIn: amountInFormatted,
                timestamp: Date.now(),
                status: 'pending',
                limitPrice: limitPriceFormatted,
            });
        }
    }, [executeHash, order, tokenIn, tokenOut]);
    
    // Save cancel transaction to history
    useEffect(() => {
        if (cancelHash && order && tokenIn && tokenOut) {
            const amountInFormatted = formatUnits(order.amountIn, tokenIn.decimals || 18);
            
            saveTransaction({
                hash: cancelHash,
                type: 'cancel',
                tokenIn: tokenIn.symbol,
                tokenOut: tokenOut.symbol,
                amountIn: amountInFormatted,
                timestamp: Date.now(),
                status: 'pending',
            });
        }
    }, [cancelHash, order, tokenIn, tokenOut]);
    
    // Update transaction status on success
    useEffect(() => {
        if (isExecuteSuccess && executeHash) {
            updateTransactionStatus(executeHash, 'success');
        }
    }, [isExecuteSuccess, executeHash]);
    
    useEffect(() => {
        if (isCancelSuccess && cancelHash) {
            updateTransactionStatus(cancelHash, 'success');
        }
    }, [isCancelSuccess, cancelHash]);

    // Refresh on execute/cancel success
    useEffect(() => {
        if (isExecuteSuccess || isCancelSuccess) {
            refetchOrder();
            refetchCanExecute();
            onRefresh();
        }
    }, [isExecuteSuccess, isCancelSuccess, refetchOrder, refetchCanExecute, onRefresh]);

    if (!order || order.limitPrice === BigInt(0)) {
        return null; // Not a limit order
    }

    const canExecute = canExecuteData?.[0] || false;
    const currentPrice = canExecuteData?.[1] || BigInt(0);
    const targetPrice = canExecuteData?.[2] || order.limitPrice;
    
    const isOwner = address?.toLowerCase() === order.owner.toLowerCase();
    const isPending = order.status === OrderStatus.Pending;
    const isExpired = order.expiry > BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) > order.expiry;
    
    // Calculate price difference percentage
    const priceDiff = currentPrice > BigInt(0) && targetPrice > BigInt(0)
        ? ((Number(currentPrice) - Number(targetPrice)) / Number(targetPrice)) * 100
        : 0;

    return (
        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                        {tokenIn?.symbol || '???'} → {tokenOut?.symbol || '???'}
                    </span>
                    {getStatusBadge(order.status)}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                    {new Date(Number(order.timestamp) * 1000).toLocaleDateString()}
                </span>
            </div>

            {/* Order details */}
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <p className="text-[var(--text-muted)]">Amount</p>
                    <p className="font-medium text-[var(--text-primary)]">
                        {formatUnits(order.amountIn, tokenIn?.decimals || 18)} {tokenIn?.symbol}
                    </p>
                </div>
                <div>
                    <p className="text-[var(--text-muted)]">Target Price</p>
                    <p className="font-medium text-[var(--text-primary)]">
                        ${formatPrice(targetPrice)}
                    </p>
                </div>
            </div>

            {/* Price comparison - only show for pending orders */}
            {isPending && currentPrice > BigInt(0) && (
                <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-secondary)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[var(--text-muted)]">Current Price</p>
                            <p className="font-medium text-[var(--text-primary)] flex items-center gap-1">
                                ${formatPrice(currentPrice)}
                                {priceDiff > 0 ? (
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-[var(--text-muted)]">Difference</p>
                            <p className={`font-medium ${priceDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {priceDiff >= 0 ? '+' : ''}{priceDiff.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-2">
                        <div className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all ${canExecute ? 'bg-green-500' : 'bg-yellow-500'}`}
                                style={{ 
                                    width: `${Math.min(100, Math.max(0, (Number(currentPrice) / Number(targetPrice)) * 100))}%` 
                                }}
                            />
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            {canExecute ? '✅ Price target reached!' : `Waiting for price to reach $${formatPrice(targetPrice)}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Expiry */}
            {order.expiry > BigInt(0) && isPending && (
                <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className={isExpired ? 'text-red-400' : 'text-[var(--text-muted)]'}>
                        {isExpired 
                            ? 'Expired' 
                            : `Expires: ${new Date(Number(order.expiry) * 1000).toLocaleString()}`
                        }
                    </span>
                </div>
            )}

            {/* Actions - only for pending orders */}
            {isPending && (
                <div className="flex gap-2 pt-2">
                    {canExecute && (
                        <Button
                            size="sm"
                            onClick={() => executeLimitOrder(orderId)}
                            disabled={isExecuting || isExecuteConfirming}
                            isLoading={isExecuting || isExecuteConfirming}
                            leftIcon={<Zap className="w-4 h-4" />}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            Execute Now
                        </Button>
                    )}
                    {isOwner && (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => cancelOrder(orderId)}
                            disabled={isCancelling || isCancelConfirming}
                            isLoading={isCancelling || isCancelConfirming}
                            leftIcon={<XCircle className="w-4 h-4" />}
                            className={canExecute ? '' : 'flex-1'}
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

// Live price ticker component
function LivePriceTicker() {
    const [ethPrice, setEthPrice] = useState<number>(0);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [priceChange, setPriceChange] = useState<number>(0);
    
    const fetchPrice = useCallback(async () => {
        try {
            const price = await getTokenPrice('mETH');
            if (price > 0) {
                if (ethPrice > 0) {
                    setPriceChange(((price - ethPrice) / ethPrice) * 100);
                }
                setEthPrice(price);
                setLastUpdate(new Date());
                setIsLive(true);
            }
        } catch {
            setIsLive(false);
        }
    }, [ethPrice]);
    
    useEffect(() => {
        fetchPrice();
        const interval = setInterval(fetchPrice, 5000); // Update every 5 seconds
        return () => clearInterval(interval);
    }, [fetchPrice]);
    
    return (
        <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-xs text-[var(--text-muted)]">
                        {isLive ? 'Live' : 'Offline'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isLive ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-[var(--text-primary)]">
                    ETH ${ethPrice.toFixed(2)}
                </span>
                {priceChange !== 0 && (
                    <span className={`text-xs ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(3)}%
                    </span>
                )}
            </div>
            {lastUpdate && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Updated: {lastUpdate.toLocaleTimeString()}
                </p>
            )}
        </div>
    );
}

export default function LimitOrdersPanel() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [userOrderIds, setUserOrderIds] = useState<`0x${string}`[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [botStatus, setBotStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');

    // Sync prices hook
    const {
        syncPrices,
        isPending: isSyncing,
        isConfirming: isSyncConfirming,
        isSuccess: isSyncSuccess,
    } = useSyncPrices();
    
    // Watch for limit order executions from keeper bot
    // This automatically records to transaction history
    const { executedOrders } = useLimitOrderExecutedEvents(address);
    
    // Refresh when keeper bot executes an order
    useEffect(() => {
        if (executedOrders.length > 0) {
            // Auto refresh to update the list
            setLastRefresh(Date.now());
        }
    }, [executedOrders]);
    
    // Check if keeper bot is running by looking at recent price updates
    useEffect(() => {
        async function checkBotStatus() {
            if (!publicClient) return;
            try {
                // Get the on-chain price and compare with CoinGecko
                const onChainPrice = await publicClient.readContract({
                    address: CONTRACTS.PRICE_FEED,
                    abi: [{ type: 'function', name: 'getPrice', inputs: [{ name: 'token', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
                    functionName: 'getPrice',
                    args: ['0x62b64cC9B1Aa2F2c9d612f0b4a58Cfba0eEc9bE2'], // mETH
                }) as bigint;
                
                const livePrice = await getTokenPrice('mETH');
                const onChainPriceNum = Number(formatUnits(onChainPrice, 18));
                
                // If prices are within 2%, bot is likely running
                const priceDiff = Math.abs((onChainPriceNum - livePrice) / livePrice * 100);
                setBotStatus(priceDiff < 2 ? 'running' : 'stopped');
            } catch {
                setBotStatus('unknown');
            }
        }
        
        checkBotStatus();
        const interval = setInterval(checkBotStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [publicClient]);

    // Fetch user's order IDs
    const fetchUserOrders = async () => {
        if (!publicClient || !address) return;
        
        setIsLoading(true);
        try {
            // First, get pending order count
            const pendingCount = await publicClient.readContract({
                address: CONTRACTS.SHADOW_POOL,
                abi: SHADOW_POOL_ABI,
                functionName: 'getPendingOrderCount',
            }) as bigint;

            const ids: `0x${string}`[] = [];
            
            // Fetch all pending order IDs and filter by user
            for (let i = 0; i < Number(pendingCount); i++) {
                try {
                    const orderId = await publicClient.readContract({
                        address: CONTRACTS.SHADOW_POOL,
                        abi: SHADOW_POOL_ABI,
                        functionName: 'pendingOrderIds',
                        args: [BigInt(i)],
                    }) as `0x${string}`;

                    // Get order details to check if it belongs to user
                    const orderData = await publicClient.readContract({
                        address: CONTRACTS.SHADOW_POOL,
                        abi: SHADOW_POOL_ABI,
                        functionName: 'getOrderDetails',
                        args: [orderId],
                    }) as [string, string, string, bigint, bigint, bigint, number, bigint, bigint];

                    // Check if it's a limit order (limitPrice > 0)
                    if (orderData[4] > BigInt(0)) {
                        ids.push(orderId);
                    }
                } catch (err) {
                    console.error('Failed to fetch order:', err);
                }
            }

            setUserOrderIds(ids);
        } catch (err) {
            console.error('Failed to fetch user orders:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchUserOrders();
        
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchUserOrders, 30000);
        return () => clearInterval(interval);
    }, [address, publicClient, lastRefresh]);

    // Refresh after price sync
    useEffect(() => {
        if (isSyncSuccess) {
            setTimeout(() => setLastRefresh(Date.now()), 2000);
        }
    }, [isSyncSuccess]);

    const handleRefresh = () => {
        setLastRefresh(Date.now());
    };

    if (!isConnected) {
        return (
            <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                <p className="text-center text-[var(--text-muted)]">
                    Connect wallet to view limit orders
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Limit Orders
                </h3>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => syncPrices()}
                        disabled={isSyncing || isSyncConfirming}
                        isLoading={isSyncing || isSyncConfirming}
                        leftIcon={<TrendingUp className="w-4 h-4" />}
                    >
                        Sync
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        isLoading={isLoading}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                    >
                        Refresh
                    </Button>
                </div>
            </div>
            
            {/* Live Price Ticker */}
            <LivePriceTicker />
            
            {/* Keeper Bot Status */}
            <div className={`p-3 rounded-xl border ${
                botStatus === 'running' 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : botStatus === 'stopped'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-gray-500/10 border-gray-500/30'
            }`}>
                <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${
                        botStatus === 'running' ? 'text-green-400' : 
                        botStatus === 'stopped' ? 'text-yellow-400' : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                        botStatus === 'running' ? 'text-green-400' : 
                        botStatus === 'stopped' ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                        Keeper Bot: {botStatus === 'running' ? 'Active' : botStatus === 'stopped' ? 'Inactive' : 'Unknown'}
                    </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    {botStatus === 'running' 
                        ? 'Bot sedang berjalan - order akan otomatis dieksekusi ketika harga tercapai'
                        : 'Jalankan keeper bot untuk auto-execute: cd keeper-bot && npm start'
                    }
                </p>
            </div>

            {/* Orders list */}
            <div className="space-y-3">
                {isLoading && userOrderIds.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                        <p className="text-center text-[var(--text-muted)]">Loading orders...</p>
                    </div>
                ) : userOrderIds.length === 0 ? (
                    <div className="p-6 rounded-xl bg-[var(--bg-card)] border border-[var(--border-primary)]">
                        <p className="text-center text-[var(--text-muted)]">
                            No pending limit orders found
                        </p>
                        <p className="text-center text-xs text-[var(--text-muted)] mt-2">
                            Submit a limit order from the swap card above
                        </p>
                    </div>
                ) : (
                    userOrderIds.map((orderId) => (
                        <LimitOrderCard 
                            key={orderId} 
                            orderId={orderId} 
                            onRefresh={handleRefresh}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

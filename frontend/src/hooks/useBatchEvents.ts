import { useWatchContractEvent, usePublicClient } from 'wagmi';
import { CONTRACTS, SHADOW_POOL_ABI } from '@/lib/contracts';
import { useState, useEffect, useCallback } from 'react';
import { formatUnits } from 'viem';
import { saveTransaction } from '@/lib/transactionHistory';
import { SUPPORTED_TOKENS } from '@/lib/tokens';

interface BatchEvent {
    batchId: bigint;
    orderCount?: bigint;
    cowMatches?: bigint;
    uniswapSwaps?: bigint;
    timestamp: number;
    type: 'triggered' | 'settled';
}

interface OrderEvent {
    orderId: `0x${string}`;
    owner: `0x${string}`;
    batchId?: bigint;
    tokenIn?: `0x${string}`;
    amountIn?: bigint;
    timestamp: number;
    type: 'submitted' | 'cancelled';
}

/**
 * Subscribe to batch events from the ShadowPool contract
 */
export function useBatchEvents() {
    const [events, setEvents] = useState<BatchEvent[]>([]);
    const [latestBatch, setLatestBatch] = useState<BatchEvent | null>(null);

    // Watch for BatchTriggered events
    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'BatchTriggered',
        onLogs(logs) {
            const newEvents = logs.map((log) => ({
                batchId: (log.args as { batchId: bigint }).batchId,
                orderCount: (log.args as { orderCount: bigint }).orderCount,
                timestamp: Date.now(),
                type: 'triggered' as const,
            }));

            setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
            if (newEvents.length > 0) {
                setLatestBatch(newEvents[0]);
            }
        },
    });

    // Watch for BatchSettled events
    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'BatchSettled',
        onLogs(logs) {
            const newEvents = logs.map((log) => ({
                batchId: (log.args as { batchId: bigint }).batchId,
                cowMatches: (log.args as { cowMatches: bigint }).cowMatches,
                uniswapSwaps: (log.args as { uniswapSwaps: bigint }).uniswapSwaps,
                timestamp: Date.now(),
                type: 'settled' as const,
            }));

            setEvents((prev) => [...newEvents, ...prev].slice(0, 50));
            if (newEvents.length > 0) {
                setLatestBatch(newEvents[0]);
            }
        },
    });

    return { events, latestBatch };
}

/**
 * Subscribe to order events for a specific user
 */
export function useOrderEvents(userAddress: `0x${string}` | undefined) {
    const [events, setEvents] = useState<OrderEvent[]>([]);
    const [latestOrder, setLatestOrder] = useState<OrderEvent | null>(null);

    // Watch for OrderSubmitted events
    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'OrderSubmitted',
        onLogs(logs) {
            const filteredLogs = userAddress
                ? logs.filter((log) => (log.args as { owner: `0x${string}` }).owner?.toLowerCase() === userAddress.toLowerCase())
                : logs;

            const newEvents = filteredLogs.map((log) => ({
                orderId: (log.args as { orderId: `0x${string}` }).orderId,
                owner: (log.args as { owner: `0x${string}` }).owner,
                batchId: (log.args as { batchId: bigint }).batchId,
                tokenIn: (log.args as { tokenIn: `0x${string}` }).tokenIn,
                amountIn: (log.args as { amountIn: bigint }).amountIn,
                timestamp: Date.now(),
                type: 'submitted' as const,
            }));

            setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
            if (newEvents.length > 0) {
                setLatestOrder(newEvents[0]);
            }
        },
    });

    // Watch for OrderCancelled events
    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'OrderCancelled',
        onLogs(logs) {
            const filteredLogs = userAddress
                ? logs.filter((log) => (log.args as { owner: `0x${string}` }).owner?.toLowerCase() === userAddress.toLowerCase())
                : logs;

            const newEvents = filteredLogs.map((log) => ({
                orderId: (log.args as { orderId: `0x${string}` }).orderId,
                owner: (log.args as { owner: `0x${string}` }).owner,
                timestamp: Date.now(),
                type: 'cancelled' as const,
            }));

            setEvents((prev) => [...newEvents, ...prev].slice(0, 100));
        },
    });

    return { events, latestOrder };
}

// Helper to get token by address
function getTokenByAddress(address: string) {
    return SUPPORTED_TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );
}

/**
 * Watch for LimitOrderExecuted events and record to transaction history
 * This captures orders executed by the keeper bot automatically
 */
export function useLimitOrderExecutedEvents(userAddress: `0x${string}` | undefined) {
    const [executedOrders, setExecutedOrders] = useState<{
        orderId: `0x${string}`;
        owner: `0x${string}`;
        amountIn: bigint;
        amountOut: bigint;
        executionPrice: bigint;
        txHash: `0x${string}`;
        timestamp: number;
    }[]>([]);
    const publicClient = usePublicClient();

    // Watch for LimitOrderExecuted events
    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'LimitOrderExecuted',
        onLogs: async (logs) => {
            for (const log of logs) {
                const args = log.args as {
                    orderId: `0x${string}`;
                    owner: `0x${string}`;
                    amountIn: bigint;
                    amountOut: bigint;
                    executionPrice: bigint;
                };
                
                // Filter by user if specified
                if (userAddress && args.owner?.toLowerCase() !== userAddress.toLowerCase()) {
                    continue;
                }
                
                const txHash = log.transactionHash;
                
                // Get order details to know token pair
                try {
                    if (publicClient) {
                        const orderDetails = await publicClient.readContract({
                            address: CONTRACTS.SHADOW_POOL,
                            abi: SHADOW_POOL_ABI,
                            functionName: 'getOrderDetails',
                            args: [args.orderId],
                        }) as [string, string, string, bigint, bigint, bigint, number, bigint, bigint];
                        
                        const tokenIn = getTokenByAddress(orderDetails[1]);
                        const tokenOut = getTokenByAddress(orderDetails[2]);
                        
                        const amountInFormatted = formatUnits(args.amountIn, tokenIn?.decimals || 18);
                        const amountOutFormatted = formatUnits(args.amountOut, tokenOut?.decimals || 18);
                        const priceFormatted = formatUnits(args.executionPrice, 18);
                        
                        // Save to transaction history
                        saveTransaction({
                            hash: txHash,
                            type: 'execute',
                            tokenIn: tokenIn?.symbol || 'Unknown',
                            tokenOut: tokenOut?.symbol || 'Unknown',
                            amountIn: amountInFormatted,
                            amountOut: amountOutFormatted,
                            timestamp: Date.now(),
                            status: 'success',
                            limitPrice: priceFormatted,
                        });
                        
                        console.log(`✅ Limit order executed by keeper! ${tokenIn?.symbol} → ${tokenOut?.symbol}, tx: ${txHash}`);
                    }
                } catch (err) {
                    console.error('Failed to get order details:', err);
                    
                    // Still save with minimal info
                    saveTransaction({
                        hash: txHash,
                        type: 'execute',
                        tokenIn: 'Token',
                        tokenOut: 'Token',
                        amountIn: formatUnits(args.amountIn, 18),
                        amountOut: formatUnits(args.amountOut, 18),
                        timestamp: Date.now(),
                        status: 'success',
                    });
                }
                
                setExecutedOrders(prev => [{
                    orderId: args.orderId,
                    owner: args.owner,
                    amountIn: args.amountIn,
                    amountOut: args.amountOut,
                    executionPrice: args.executionPrice,
                    txHash,
                    timestamp: Date.now(),
                }, ...prev].slice(0, 50));
            }
        },
    });

    return { executedOrders };
}

/**
 * Watch for OrderExpired events
 */
export function useOrderExpiredEvents(userAddress: `0x${string}` | undefined) {
    const [expiredOrders, setExpiredOrders] = useState<{
        orderId: `0x${string}`;
        owner: `0x${string}`;
        txHash: `0x${string}`;
        timestamp: number;
    }[]>([]);

    useWatchContractEvent({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        eventName: 'OrderExpired',
        onLogs(logs) {
            const filteredLogs = userAddress
                ? logs.filter((log) => (log.args as { owner: `0x${string}` }).owner?.toLowerCase() === userAddress.toLowerCase())
                : logs;

            const newEvents = filteredLogs.map((log) => ({
                orderId: (log.args as { orderId: `0x${string}` }).orderId,
                owner: (log.args as { owner: `0x${string}` }).owner,
                txHash: log.transactionHash,
                timestamp: Date.now(),
            }));

            setExpiredOrders(prev => [...newEvents, ...prev].slice(0, 50));
        },
    });

    return { expiredOrders };
}

/**
 * Notification system for order/batch updates
 */
export function useNotifications() {
    const [notifications, setNotifications] = useState<{
        id: string;
        message: string;
        type: 'success' | 'info' | 'warning' | 'error';
        timestamp: number;
    }[]>([]);

    const addNotification = useCallback((
        message: string,
        type: 'success' | 'info' | 'warning' | 'error' = 'info'
    ) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setNotifications((prev) => [
            { id, message, type, timestamp: Date.now() },
            ...prev,
        ].slice(0, 10));

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return { notifications, addNotification, removeNotification };
}

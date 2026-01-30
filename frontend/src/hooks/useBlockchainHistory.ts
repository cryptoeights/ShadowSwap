'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { Transaction, saveTransaction, getTransactions } from '@/lib/transactionHistory';

// Event signatures
const EVENTS = {
    InstantSwap: parseAbiItem('event InstantSwap(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut)'),
    LimitOrderExecuted: parseAbiItem('event LimitOrderExecuted(bytes32 indexed orderId, address indexed owner, uint256 amountIn, uint256 amountOut, uint256 executionPrice)'),
    OrderSubmitted: parseAbiItem('event OrderSubmitted(bytes32 indexed orderId, address indexed owner, uint256 indexed batchId, address tokenIn, uint256 amountIn)'),
    OrderCancelled: parseAbiItem('event OrderCancelled(bytes32 indexed orderId, address indexed owner)'),
    OrderExpired: parseAbiItem('event OrderExpired(bytes32 indexed orderId, address indexed owner)'),
};

// Helper to get token by address
function getTokenByAddress(address: string) {
    return SUPPORTED_TOKENS.find(
        t => t.address.toLowerCase() === address.toLowerCase()
    );
}

// Get order details from contract
async function getOrderDetails(publicClient: ReturnType<typeof usePublicClient>, orderId: `0x${string}`) {
    if (!publicClient) return null;
    
    try {
        const result = await publicClient.readContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: [{
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
            }],
            functionName: 'getOrderDetails',
            args: [orderId],
        });
        return result as [string, string, string, bigint, bigint, bigint, number, bigint, bigint];
    } catch {
        return null;
    }
}

export interface BlockchainHistoryState {
    transactions: Transaction[];
    isLoading: boolean;
    error: string | null;
    lastSyncBlock: bigint | null;
    refresh: () => Promise<void>;
}

/**
 * Hook to load and sync transaction history from blockchain
 * Automatically fetches past events when wallet connects
 */
export function useBlockchainHistory(): BlockchainHistoryState {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastSyncBlock, setLastSyncBlock] = useState<bigint | null>(null);

    const fetchHistoryFromBlockchain = useCallback(async () => {
        if (!publicClient || !address || !isConnected) {
            setTransactions(getTransactions());
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const currentBlock = await publicClient.getBlockNumber();
            // Fetch last 10000 blocks (about 2-3 days on Arbitrum)
            const fromBlock = currentBlock > BigInt(10000) ? currentBlock - BigInt(10000) : BigInt(0);

            console.log(`Fetching blockchain history from block ${fromBlock} to ${currentBlock}...`);

            const newTransactions: Transaction[] = [];
            const existingHashes = new Set(getTransactions().map(tx => tx.hash.toLowerCase()));

            // 1. Fetch InstantSwap events
            try {
                const swapLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.InstantSwap,
                    args: { user: address },
                    fromBlock,
                    toBlock: currentBlock,
                });

                for (const log of swapLogs) {
                    if (existingHashes.has(log.transactionHash.toLowerCase())) continue;

                    const tokenIn = getTokenByAddress(log.args.tokenIn as string);
                    const tokenOut = getTokenByAddress(log.args.tokenOut as string);
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

                    newTransactions.push({
                        hash: log.transactionHash,
                        type: 'swap',
                        tokenIn: tokenIn?.symbol || 'Unknown',
                        tokenOut: tokenOut?.symbol || 'Unknown',
                        amountIn: formatUnits(log.args.amountIn as bigint, tokenIn?.decimals || 18),
                        amountOut: formatUnits(log.args.amountOut as bigint, tokenOut?.decimals || 18),
                        timestamp: Number(block.timestamp) * 1000,
                        status: 'success',
                    });
                }
                console.log(`Found ${swapLogs.length} InstantSwap events`);
            } catch (e) {
                console.warn('Failed to fetch InstantSwap events:', e);
            }

            // 2. Fetch LimitOrderExecuted events
            try {
                const executedLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.LimitOrderExecuted,
                    args: { owner: address },
                    fromBlock,
                    toBlock: currentBlock,
                });

                for (const log of executedLogs) {
                    if (existingHashes.has(log.transactionHash.toLowerCase())) continue;

                    const orderId = log.args.orderId as `0x${string}`;
                    const orderDetails = await getOrderDetails(publicClient, orderId);
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

                    let tokenInSymbol = 'Token';
                    let tokenOutSymbol = 'Token';
                    
                    if (orderDetails) {
                        const tokenIn = getTokenByAddress(orderDetails[1]);
                        const tokenOut = getTokenByAddress(orderDetails[2]);
                        tokenInSymbol = tokenIn?.symbol || 'Token';
                        tokenOutSymbol = tokenOut?.symbol || 'Token';
                    }

                    newTransactions.push({
                        hash: log.transactionHash,
                        type: 'execute',
                        tokenIn: tokenInSymbol,
                        tokenOut: tokenOutSymbol,
                        amountIn: formatUnits(log.args.amountIn as bigint, 18),
                        amountOut: formatUnits(log.args.amountOut as bigint, 18),
                        timestamp: Number(block.timestamp) * 1000,
                        status: 'success',
                        limitPrice: formatUnits(log.args.executionPrice as bigint, 18),
                    });
                }
                console.log(`Found ${executedLogs.length} LimitOrderExecuted events`);
            } catch (e) {
                console.warn('Failed to fetch LimitOrderExecuted events:', e);
            }

            // 3. Fetch OrderSubmitted events (limit orders)
            try {
                const submittedLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.OrderSubmitted,
                    args: { owner: address },
                    fromBlock,
                    toBlock: currentBlock,
                });

                for (const log of submittedLogs) {
                    if (existingHashes.has(log.transactionHash.toLowerCase())) continue;

                    const orderId = log.args.orderId as `0x${string}`;
                    const orderDetails = await getOrderDetails(publicClient, orderId);
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

                    if (orderDetails && orderDetails[4] > BigInt(0)) {
                        // It's a limit order (has limitPrice)
                        const tokenIn = getTokenByAddress(orderDetails[1]);
                        const tokenOut = getTokenByAddress(orderDetails[2]);

                        newTransactions.push({
                            hash: log.transactionHash,
                            type: 'limit',
                            tokenIn: tokenIn?.symbol || 'Token',
                            tokenOut: tokenOut?.symbol || 'Token',
                            amountIn: formatUnits(orderDetails[3], tokenIn?.decimals || 18),
                            timestamp: Number(block.timestamp) * 1000,
                            status: orderDetails[6] === 0 ? 'pending' : 'success',
                            limitPrice: formatUnits(orderDetails[4], 18),
                        });
                    }
                }
                console.log(`Found ${submittedLogs.length} OrderSubmitted events`);
            } catch (e) {
                console.warn('Failed to fetch OrderSubmitted events:', e);
            }

            // 4. Fetch OrderCancelled events
            try {
                const cancelledLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.OrderCancelled,
                    args: { owner: address },
                    fromBlock,
                    toBlock: currentBlock,
                });

                for (const log of cancelledLogs) {
                    if (existingHashes.has(log.transactionHash.toLowerCase())) continue;

                    const orderId = log.args.orderId as `0x${string}`;
                    const orderDetails = await getOrderDetails(publicClient, orderId);
                    const block = await publicClient.getBlock({ blockNumber: log.blockNumber });

                    let tokenInSymbol = 'Token';
                    let tokenOutSymbol = 'Token';
                    let amountIn = '0';
                    
                    if (orderDetails) {
                        const tokenIn = getTokenByAddress(orderDetails[1]);
                        const tokenOut = getTokenByAddress(orderDetails[2]);
                        tokenInSymbol = tokenIn?.symbol || 'Token';
                        tokenOutSymbol = tokenOut?.symbol || 'Token';
                        amountIn = formatUnits(orderDetails[3], tokenIn?.decimals || 18);
                    }

                    newTransactions.push({
                        hash: log.transactionHash,
                        type: 'cancel',
                        tokenIn: tokenInSymbol,
                        tokenOut: tokenOutSymbol,
                        amountIn,
                        timestamp: Number(block.timestamp) * 1000,
                        status: 'success',
                    });
                }
                console.log(`Found ${cancelledLogs.length} OrderCancelled events`);
            } catch (e) {
                console.warn('Failed to fetch OrderCancelled events:', e);
            }

            // Save new transactions to localStorage
            for (const tx of newTransactions) {
                saveTransaction(tx);
            }

            // Get all transactions (localStorage + new)
            const allTransactions = getTransactions();
            
            // Sort by timestamp descending
            allTransactions.sort((a, b) => b.timestamp - a.timestamp);

            setTransactions(allTransactions);
            setLastSyncBlock(currentBlock);

            console.log(`Blockchain history sync complete. Total transactions: ${allTransactions.length}`);
        } catch (e) {
            console.error('Failed to fetch blockchain history:', e);
            setError((e as Error).message);
            // Fall back to localStorage
            setTransactions(getTransactions());
        } finally {
            setIsLoading(false);
        }
    }, [publicClient, address, isConnected]);

    // Fetch history when wallet connects
    useEffect(() => {
        if (isConnected && address) {
            fetchHistoryFromBlockchain();
        } else {
            setTransactions([]);
        }
    }, [isConnected, address, fetchHistoryFromBlockchain]);

    // Listen for localStorage changes
    useEffect(() => {
        const handleStorage = () => {
            setTransactions(getTransactions());
        };
        
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    return {
        transactions,
        isLoading,
        error,
        lastSyncBlock,
        refresh: fetchHistoryFromBlockchain,
    };
}

/**
 * Get global DEX statistics from blockchain events
 */
export function useGlobalStats() {
    const publicClient = usePublicClient();
    const [stats, setStats] = useState({
        totalVolume: BigInt(0),
        totalSwaps: 0,
        totalLimitOrders: 0,
        totalExecuted: 0,
        isLoading: true,
    });

    useEffect(() => {
        async function fetchStats() {
            if (!publicClient) return;

            try {
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock > BigInt(50000) ? currentBlock - BigInt(50000) : BigInt(0);

                // Fetch all InstantSwap events
                const swapLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.InstantSwap,
                    fromBlock,
                    toBlock: currentBlock,
                });

                // Fetch all LimitOrderExecuted events
                const executedLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.LimitOrderExecuted,
                    fromBlock,
                    toBlock: currentBlock,
                });

                // Fetch all OrderSubmitted events
                const submittedLogs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: EVENTS.OrderSubmitted,
                    fromBlock,
                    toBlock: currentBlock,
                });

                // Calculate total volume (in USD terms, assuming stablecoin as output)
                let totalVolume = BigInt(0);
                for (const log of swapLogs) {
                    totalVolume += (log.args.amountOut as bigint) || BigInt(0);
                }
                for (const log of executedLogs) {
                    totalVolume += (log.args.amountOut as bigint) || BigInt(0);
                }

                setStats({
                    totalVolume,
                    totalSwaps: swapLogs.length,
                    totalLimitOrders: submittedLogs.length,
                    totalExecuted: executedLogs.length,
                    isLoading: false,
                });
            } catch (e) {
                console.error('Failed to fetch global stats:', e);
                setStats(prev => ({ ...prev, isLoading: false }));
            }
        }

        fetchStats();
    }, [publicClient]);

    return stats;
}

/**
 * Get recent batches from blockchain
 */
export function useRecentBatches() {
    const publicClient = usePublicClient();
    const [batches, setBatches] = useState<{
        batchId: number;
        orderCount: number;
        timestamp: number;
        txHash: string;
    }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchBatches() {
            if (!publicClient) return;

            try {
                const currentBlock = await publicClient.getBlockNumber();
                const fromBlock = currentBlock > BigInt(10000) ? currentBlock - BigInt(10000) : BigInt(0);

                const batchTriggeredEvent = parseAbiItem('event BatchTriggered(uint256 indexed batchId, uint256 orderCount, uint256 timestamp)');
                
                const logs = await publicClient.getLogs({
                    address: CONTRACTS.SHADOW_POOL,
                    event: batchTriggeredEvent,
                    fromBlock,
                    toBlock: currentBlock,
                });

                const batchData = logs.map(log => ({
                    batchId: Number(log.args.batchId),
                    orderCount: Number(log.args.orderCount),
                    timestamp: Number(log.args.timestamp) * 1000,
                    txHash: log.transactionHash,
                })).reverse().slice(0, 10);

                setBatches(batchData);
            } catch (e) {
                console.error('Failed to fetch batches:', e);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBatches();
    }, [publicClient]);

    return { batches, isLoading };
}

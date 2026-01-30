import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi';
import { CONTRACTS, SHADOW_POOL_ABI, ERC20_ABI, MOCK_TOKEN_ABI, PRICE_FEED_ABI, MOCK_TOKENS } from '@/lib/contracts';
import { parseUnits, encodeFunctionData } from 'viem';
import { getTokenPrice } from '@/lib/prices';

// Get the RPC URL - use local proxy in browser to avoid CORS
function getRpcUrl(): string {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}/api/rpc`;
    }
    return 'https://sepolia-rollup.arbitrum.io/rpc';
}

// Custom fetch for RPC calls that uses our proxy
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
    const response = await fetch(getRpcUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
        }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}

// Helper to get gas fees with a buffer to prevent "max fee per gas less than block base fee" errors
async function getGasFeesWithBuffer(publicClient: ReturnType<typeof usePublicClient>) {
    if (!publicClient) return {};
    
    try {
        const block = await publicClient.getBlock({ blockTag: 'latest' });
        const baseFee = block.baseFeePerGas ?? BigInt(0);
        
        // Add 50% buffer to base fee for maxFeePerGas
        const maxFeePerGas = (baseFee * BigInt(150)) / BigInt(100);
        // Set priority fee (tip) - 1.5 gwei is reasonable for Arbitrum
        const maxPriorityFeePerGas = BigInt(1500000000); // 1.5 gwei
        
        return {
            maxFeePerGas: maxFeePerGas + maxPriorityFeePerGas,
            maxPriorityFeePerGas,
        };
    } catch (error) {
        console.error('Failed to get gas fees:', error);
        return {};
    }
}

// ==================== READ HOOKS ====================

/**
 * Get the current batch ID
 */
export function useCurrentBatch() {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'currentBatchId',
    });
}

/**
 * Get the batch interval (time between batches in seconds)
 */
export function useBatchInterval() {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'batchInterval',
    });
}

/**
 * Get the last batch timestamp
 */
export function useLastBatchTimestamp() {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'lastBatchTimestamp',
    });
}

/**
 * Get the count of pending orders in the current batch
 */
export function usePendingOrderCount() {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'getPendingOrderCount',
    });
}

/**
 * Get a specific order by ID
 */
export function useOrder(orderId: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'getOrder',
        args: orderId ? [orderId] : undefined,
        query: {
            enabled: !!orderId,
        },
    });
}

/**
 * Get all order IDs for a user
 */
export function useUserOrders(userAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'getUserOrders',
        args: userAddress ? [userAddress] : undefined,
        query: {
            enabled: !!userAddress,
        },
    });
}

// ==================== TOKEN HOOKS ====================

/**
 * Get token balance for an address
 */
export function useTokenBalance(
    tokenAddress: `0x${string}` | undefined,
    accountAddress: `0x${string}` | undefined
) {
    return useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: accountAddress ? [accountAddress] : undefined,
        query: {
            enabled: !!tokenAddress && !!accountAddress,
        },
    });
}

/**
 * Get token allowance for ShadowPool
 */
export function useTokenAllowance(
    tokenAddress: `0x${string}` | undefined,
    ownerAddress: `0x${string}` | undefined
) {
    return useReadContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: ownerAddress ? [ownerAddress, CONTRACTS.SHADOW_POOL] : undefined,
        query: {
            enabled: !!tokenAddress && !!ownerAddress,
            refetchInterval: 3000,
        },
    });
}

// ==================== WRITE HOOKS ====================

/**
 * Approve token spending for ShadowPool
 */
export function useApproveToken() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const approve = async (
        tokenAddress: `0x${string}`,
        amount: bigint
    ) => {
        // Get current gas fees with buffer to prevent "max fee per gas less than block base fee" error
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.SHADOW_POOL, amount],
            ...gasFees,
        });
    };

    return {
        approve,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error
    };
}

/**
 * Submit a market order to ShadowPool
 */
export function useSubmitOrder() {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const submitOrder = async (
        encryptedData: `0x${string}`,
        datasetAddress: `0x${string}`,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        amountIn: bigint
    ) => {
        // Get current gas fees with buffer to prevent "max fee per gas less than block base fee" error
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'submitOrder',
            args: [encryptedData, datasetAddress, tokenIn, tokenOut, amountIn],
            gas: BigInt(500000),
            ...gasFees,
        });
    };

    return {
        submitOrder,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

/**
 * Submit a limit order to ShadowPool
 */
export function useSubmitLimitOrder() {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const submitLimitOrder = async (
        encryptedData: `0x${string}`,
        datasetAddress: `0x${string}`,
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        amountIn: bigint,
        limitPrice: bigint,
        expiry: bigint
    ) => {
        // Get current gas fees with buffer to prevent "max fee per gas less than block base fee" error
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'submitLimitOrder',
            args: [encryptedData, datasetAddress, tokenIn, tokenOut, amountIn, limitPrice, expiry],
            gas: BigInt(500000),
            ...gasFees,
        });
    };

    return {
        submitLimitOrder,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

/**
 * Cancel an order
 */
export function useCancelOrder() {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const cancelOrder = async (orderId: `0x${string}`) => {
        // Get current gas fees with buffer to prevent "max fee per gas less than block base fee" error
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'cancelOrder',
            args: [orderId],
            ...gasFees,
        });
    };

    return {
        cancelOrder,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

// ==================== INSTANT SWAP HOOKS ====================

/**
 * Get swap quote from the price feed
 */
export function useSwapQuote(
    tokenIn: `0x${string}` | undefined,
    tokenOut: `0x${string}` | undefined,
    amountIn: bigint | undefined
) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'getSwapQuote',
        args: tokenIn && tokenOut && amountIn ? [tokenIn, tokenOut, amountIn] : undefined,
        query: {
            enabled: !!tokenIn && !!tokenOut && !!amountIn && amountIn > BigInt(0),
        },
    });
}

/**
 * Get liquidity for a token
 */
export function useLiquidity(tokenAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'liquidity',
        args: tokenAddress ? [tokenAddress] : undefined,
        query: {
            enabled: !!tokenAddress,
        },
    });
}

/**
 * Sync on-chain prices with current market prices
 */
export function useSyncPrices() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const syncPrices = async () => {
        try {
            // Fetch current prices from CoinGecko via our API
            const ethPrice = await getTokenPrice('mETH');
            const usdcPrice = await getTokenPrice('mUSDC');
            
            console.log('Syncing prices - ETH:', ethPrice, 'USDC:', usdcPrice);
            
            if (ethPrice <= 0) {
                throw new Error('Failed to fetch ETH price');
            }
            
            // Convert to 18 decimals
            const ethPriceWei = BigInt(Math.floor(ethPrice * 1e18));
            const usdcPriceWei = BigInt(Math.floor((usdcPrice || 1) * 1e18));
            
            const gasFees = await getGasFeesWithBuffer(publicClient);
            
            // Update all prices in one transaction
            writeContract({
                address: CONTRACTS.PRICE_FEED,
                abi: PRICE_FEED_ABI,
                functionName: 'setPrices',
                args: [
                    [MOCK_TOKENS.METH, MOCK_TOKENS.MWETH, MOCK_TOKENS.MUSDC, MOCK_TOKENS.MDAI],
                    [ethPriceWei, ethPriceWei, usdcPriceWei, usdcPriceWei]
                ],
                gas: BigInt(200000),
                ...gasFees,
            });
            
            return ethPrice;
        } catch (err) {
            console.error('Failed to sync prices:', err);
            throw err;
        }
    };

    return {
        syncPrices,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
    };
}

/**
 * Execute instant swap at current price
 */
export function useInstantSwap() {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const instantSwap = async (
        tokenIn: `0x${string}`,
        tokenOut: `0x${string}`,
        amountIn: bigint,
        minAmountOut: bigint
    ) => {
        // Get current gas fees with buffer
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'instantSwap',
            args: [tokenIn, tokenOut, amountIn, minAmountOut],
            gas: BigInt(300000),
            ...gasFees,
        });
    };

    return {
        instantSwap,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

/**
 * Sync prices and execute instant swap in sequence
 */
export async function syncPricesAndGetQuote(
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint
): Promise<{ ethPrice: number; amountOut: bigint }> {
    // Fetch current prices
    const ethPrice = await getTokenPrice('mETH');
    const usdcPrice = await getTokenPrice('mUSDC') || 1;
    
    if (ethPrice <= 0) {
        throw new Error('Failed to fetch ETH price');
    }
    
    // Calculate expected output based on fetched prices
    // This is what the user should get after we sync prices on-chain
    const tokenInPrice = isEthToken(tokenIn) ? ethPrice : usdcPrice;
    const tokenOutPrice = isEthToken(tokenOut) ? ethPrice : usdcPrice;
    
    const amountOut = (amountIn * BigInt(Math.floor(tokenInPrice * 1e18))) / BigInt(Math.floor(tokenOutPrice * 1e18));
    
    return { ethPrice, amountOut };
}

function isEthToken(address: `0x${string}`): boolean {
    const addr = address.toLowerCase();
    return addr === MOCK_TOKENS.METH.toLowerCase() || addr === MOCK_TOKENS.MWETH.toLowerCase();
}

/**
 * Pre-flight check for instant swap
 * Uses the publicClient from wagmi to avoid CORS issues
 */
export async function preflightInstantSwap(
    publicClient: ReturnType<typeof usePublicClient>,
    userAddress: `0x${string}`,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint
): Promise<{ ok: boolean; amountOut?: bigint; error?: string }> {
    if (!publicClient) {
        return { ok: false, error: 'Client not available' };
    }

    try {
        // Check balance
        const balance = await publicClient.readContract({
            address: tokenIn,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
        }) as bigint;

        if (balance < amountIn) {
            return {
                ok: false,
                error: `Insufficient balance: have ${balance.toString()}, need ${amountIn.toString()}`,
            };
        }

        // Check allowance
        const allowance = await publicClient.readContract({
            address: tokenIn,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [userAddress, CONTRACTS.SHADOW_POOL],
        }) as bigint;

        if (allowance < amountIn) {
            return {
                ok: false,
                error: `Insufficient allowance: have ${allowance.toString()}, need ${amountIn.toString()}`,
            };
        }

        // Get swap quote
        const amountOut = await publicClient.readContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'getSwapQuote',
            args: [tokenIn, tokenOut, amountIn],
        }) as bigint;

        // Check liquidity
        const liquidity = await publicClient.readContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'liquidity',
            args: [tokenOut],
        }) as bigint;

        if (liquidity < amountOut) {
            return {
                ok: false,
                error: `Insufficient liquidity: available ${liquidity.toString()}, need ${amountOut.toString()}`,
            };
        }

        return { ok: true, amountOut };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            ok: false,
            error: `Quote failed: ${error.message?.slice(0, 300)}`,
        };
    }
}

// ==================== LIMIT ORDER HOOKS ====================

/**
 * Get detailed order info including limit price and expiry
 */
export function useOrderDetails(orderId: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'getOrderDetails',
        args: orderId ? [orderId] : undefined,
        query: {
            enabled: !!orderId,
            refetchInterval: 10000, // Refresh every 10 seconds
        },
    });
}

/**
 * Check if a limit order can be executed at current price
 */
export function useCanExecuteLimitOrder(orderId: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.SHADOW_POOL,
        abi: SHADOW_POOL_ABI,
        functionName: 'canExecuteLimitOrder',
        args: orderId ? [orderId] : undefined,
        query: {
            enabled: !!orderId,
            refetchInterval: 5000, // Check every 5 seconds
        },
    });
}

/**
 * Execute a limit order when price conditions are met
 */
export function useExecuteLimitOrder() {
    const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const executeLimitOrder = async (orderId: `0x${string}`) => {
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'executeLimitOrder',
            args: [orderId],
            gas: BigInt(400000),
            ...gasFees,
        });
    };

    return {
        executeLimitOrder,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error,
        reset,
    };
}

/**
 * Get current price from price feed
 */
export function useCurrentPrice(tokenAddress: `0x${string}` | undefined) {
    return useReadContract({
        address: CONTRACTS.PRICE_FEED,
        abi: PRICE_FEED_ABI,
        functionName: 'getPrice',
        args: tokenAddress ? [tokenAddress] : undefined,
        query: {
            enabled: !!tokenAddress,
            refetchInterval: 5000, // Refresh every 5 seconds
        },
    });
}

/**
 * Get all pending order IDs
 */
export function usePendingOrderIds() {
    const { data: count } = usePendingOrderCount();
    const publicClient = usePublicClient();
    const [orderIds, setOrderIds] = useState<`0x${string}`[]>([]);

    useEffect(() => {
        async function fetchOrderIds() {
            if (!publicClient || !count || count === BigInt(0)) {
                setOrderIds([]);
                return;
            }

            const ids: `0x${string}`[] = [];
            for (let i = 0; i < Number(count); i++) {
                try {
                    const id = await publicClient.readContract({
                        address: CONTRACTS.SHADOW_POOL,
                        abi: SHADOW_POOL_ABI,
                        functionName: 'pendingOrderIds',
                        args: [BigInt(i)],
                    }) as `0x${string}`;
                    ids.push(id);
                } catch (err) {
                    console.error('Failed to fetch order ID:', err);
                }
            }
            setOrderIds(ids);
        }

        fetchOrderIds();
    }, [publicClient, count]);

    return { orderIds, count: count ? Number(count) : 0 };
}

// ==================== COMBINED HOOKS ====================

/**
 * Get batch status with calculated time remaining
 */
export function useBatchStatus() {
    const { data: batchId } = useCurrentBatch();
    const { data: interval } = useBatchInterval();
    const { data: lastTimestamp } = useLastBatchTimestamp();
    const { data: orderCount } = usePendingOrderCount();

    const now = Math.floor(Date.now() / 1000);
    const nextBatchTime = lastTimestamp && interval
        ? Number(lastTimestamp) + Number(interval)
        : 0;
    const timeRemaining = Math.max(0, nextBatchTime - now);

    return {
        batchId: batchId ? Number(batchId) : 0,
        orderCount: orderCount ? Number(orderCount) : 0,
        timeRemaining,
        nextBatchTime,
    };
}
/**
 * Mint mock tokens (Faucet)
 */
export function useMintToken() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();
    const publicClient = usePublicClient();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const mint = async (tokenAddress: `0x${string}`, to: `0x${string}`, amount: bigint) => {
        // Get current gas fees with buffer to prevent "max fee per gas less than block base fee" error
        const gasFees = await getGasFeesWithBuffer(publicClient);
        
        writeContract({
            address: tokenAddress,
            abi: MOCK_TOKEN_ABI,
            functionName: 'mint',
            args: [to, amount],
            ...gasFees,
        });
    };

    return {
        mint,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        error
    };
}

/**
 * Pre-flight check: verify balance, allowance, and simulate contract call
 * Uses the publicClient from wagmi to avoid CORS issues
 */
export async function preflightSubmitOrder(
    publicClient: ReturnType<typeof usePublicClient>,
    userAddress: `0x${string}`,
    tokenIn: `0x${string}`,
    tokenOut: `0x${string}`,
    amountIn: bigint,
    encryptedData: `0x${string}`,
    datasetAddress: `0x${string}`
): Promise<{ ok: boolean; error?: string }> {
    if (!publicClient) {
        return { ok: false, error: 'Client not available' };
    }

    try {
        // Check balance
        const balance = await publicClient.readContract({
            address: tokenIn,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
        }) as bigint;

        if (balance < amountIn) {
            return {
                ok: false,
                error: `Insufficient balance: have ${balance.toString()}, need ${amountIn.toString()}`,
            };
        }

        // Check allowance
        const allowance = await publicClient.readContract({
            address: tokenIn,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [userAddress, CONTRACTS.SHADOW_POOL],
        }) as bigint;

        if (allowance < amountIn) {
            return {
                ok: false,
                error: `Insufficient allowance: have ${allowance.toString()}, need ${amountIn.toString()}`,
            };
        }

        // Simulate the contract call
        await publicClient.simulateContract({
            address: CONTRACTS.SHADOW_POOL,
            abi: SHADOW_POOL_ABI,
            functionName: 'submitOrder',
            args: [encryptedData, datasetAddress, tokenIn, tokenOut, amountIn],
            account: userAddress,
        });

        return { ok: true };
    } catch (err: unknown) {
        const error = err as Error;
        return {
            ok: false,
            error: `Simulation failed: ${error.message?.slice(0, 300)}`,
        };
    }
}

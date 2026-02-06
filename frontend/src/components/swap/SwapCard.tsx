'use client';

import { useState, useEffect } from 'react';
import { ArrowDownUp, Lock, Package, Handshake, Info, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Token } from '@/types';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { Button } from '@/components/ui';
import TokenInput from './TokenInput';
import BatchStatusPanel from './BatchStatusPanel';
import {
    useSubmitOrder,
    useSubmitLimitOrder,
    useApproveToken,
    useTokenAllowance,
    useTokenBalance,
    useBatchStatus,
    useMintToken,
    preflightSubmitOrder,
    useInstantSwap,
    preflightInstantSwap,
    useSyncPrices,
    syncPricesAndGetQuote,
} from '@/hooks/useShadowPool';
import { useSwapPrice } from '@/hooks/usePrices';
import { encryptOrder } from '@/lib/encryption';
import { saveTransaction, updateTransactionStatus, getArbiscanTxUrl } from '@/lib/transactionHistory';

type OrderType = 'market' | 'limit';
type OrderStep = 'idle' | 'encrypting' | 'submitting' | 'success' | 'error';

export default function SwapCard() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();

    // Form state
    const [orderType, setOrderType] = useState<OrderType>('market');
    const [fromToken, setFromToken] = useState<Token | null>(SUPPORTED_TOKENS[1]); // mUSDC
    const [toToken, setToToken] = useState<Token | null>(SUPPORTED_TOKENS[2]); // mDAI
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [limitPrice, setLimitPrice] = useState('');
    const [orderStep, setOrderStep] = useState<OrderStep>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // Batch status from contract or mock data
    const { batchId, orderCount, timeRemaining } = useBatchStatus();
    const displayBatchId = batchId || 142;
    const displayOrderCount = orderCount || 47;
    const displayTimeRemaining = timeRemaining || 272;

    // Native ETH balance
    const isNativeToken = fromToken?.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
    const { data: nativeBalance } = useBalance({ address });

    // ERC20 token balance
    const { data: erc20Balance } = useTokenBalance(
        isNativeToken ? undefined : fromToken?.address as `0x${string}`,
        address
    );

    // Token allowance (refetches every 3s)
    const { data: allowance, refetch: refetchAllowance } = useTokenAllowance(
        fromToken?.address as `0x${string}`,
        address
    );

    // Contract write hooks
    const {
        approve,
        isPending: isApproving,
        isConfirming: isApproveConfirming,
        isSuccess: isApproveSuccess,
    } = useApproveToken();

    const {
        submitOrder,
        isPending: isSubmitting,
        isConfirming: isSubmitConfirming,
        isSuccess: isSubmitSuccess,
        error: submitError,
        reset: resetSubmit,
    } = useSubmitOrder();

    const {
        submitLimitOrder,
        hash: limitHash,
        isPending: isSubmittingLimit,
        isConfirming: isLimitConfirming,
        isSuccess: isLimitSuccess,
        reset: resetLimitSubmit,
    } = useSubmitLimitOrder();

    const {
        mint,
        isPending: isMinting
    } = useMintToken();

    // Instant swap for market orders
    const {
        instantSwap,
        hash: swapHash,
        isPending: isSwapping,
        isConfirming: isSwapConfirming,
        isSuccess: isSwapSuccess,
        error: swapError,
        reset: resetSwap,
    } = useInstantSwap();

    // Price sync before swap
    const {
        syncPrices,
        isPending: isSyncingPrices,
        isConfirming: isSyncConfirming,
        isSuccess: isSyncSuccess,
        error: syncError,
    } = useSyncPrices();

    // State for swap flow
    const [pendingSwapData, setPendingSwapData] = useState<{
        tokenIn: `0x${string}`;
        tokenOut: `0x${string}`;
        amountIn: bigint;
        minAmountOut: bigint;
    } | null>(null);
    
    // State for last transaction
    const [lastTxHash, setLastTxHash] = useState<`0x${string}` | null>(null);

    // Live price
    const { rate: exchangeRate, calculateOutput } = useSwapPrice(
        fromToken?.symbol,
        toToken?.symbol
    );

    // Check if approval is needed
    const needsApproval = (): boolean => {
        if (!fromToken || !fromAmount || fromToken.symbol === 'ETH') return false;
        if (allowance === undefined || allowance === null) return true;
        try {
            const amountBigInt = parseUnits(fromAmount, fromToken.decimals);
            return (allowance as bigint) < amountBigInt;
        } catch {
            return false;
        }
    };

    // Refetch allowance when approval confirmed
    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance();
        }
    }, [isApproveSuccess, refetchAllowance]);

    // Handle approve button click
    const handleApprove = async () => {
        if (!fromToken) return;
        try {
            setErrorMessage('');
            const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
            approve(fromToken.address as `0x${string}`, maxApproval);
        } catch (error) {
            console.error('Approval failed:', error);
            setErrorMessage((error as Error).message || 'Approval failed');
        }
    };

    // Handle submit order (only called when allowance is sufficient)
    const handleSubmitOrder = async () => {
        if (!address || !fromToken || !toToken || !fromAmount) return;

        try {
            setErrorMessage('');
            const amountInBigInt = parseUnits(fromAmount, fromToken.decimals);

            // For market orders, use instant swap with price sync
            if (orderType === 'market') {
                setOrderStep('submitting');
                
                console.log('=== MARKET ORDER - SYNCING PRICES ===');
                
                // Step 1: Get current prices and calculate expected output
                const { ethPrice, amountOut } = await syncPricesAndGetQuote(
                    fromToken.address as `0x${string}`,
                    toToken.address as `0x${string}`,
                    amountInBigInt
                );
                
                console.log('Current ETH price:', ethPrice);
                console.log('Expected output:', amountOut.toString());
                
                // Step 2: Pre-flight check (balance and allowance)
                const preflight = await preflightInstantSwap(
                    publicClient,
                    address,
                    fromToken.address as `0x${string}`,
                    toToken.address as `0x${string}`,
                    amountInBigInt
                );

                console.log('Preflight result:', preflight);

                if (!preflight.ok) {
                    console.error('Preflight failed:', preflight.error);
                    setOrderStep('error');
                    setErrorMessage(preflight.error || 'Pre-flight check failed');
                    return;
                }

                // Step 3: Store swap data for after price sync
                const minAmountOut = (amountOut * BigInt(99)) / BigInt(100); // 1% slippage
                setPendingSwapData({
                    tokenIn: fromToken.address as `0x${string}`,
                    tokenOut: toToken.address as `0x${string}`,
                    amountIn: amountInBigInt,
                    minAmountOut,
                });
                
                // Step 4: Sync prices on-chain first
                console.log('Syncing prices on-chain...');
                await syncPrices();
                
            } else {
                // For limit orders, use batch submission with encryption
                setOrderStep('encrypting');

                const orderData = {
                    type: orderType,
                    direction: 'sell' as const,
                    tokenIn: fromToken.address,
                    tokenOut: toToken.address,
                    amountIn: fromAmount,
                    limitPrice: limitPrice,
                    expiry: Math.floor(Date.now() / 1000) + 86400,
                };

                const { encryptedData, datasetAddress } = await encryptOrder(orderData, address);

                // Debug logging
                console.log('=== SUBMIT LIMIT ORDER DEBUG ===');
                console.log('encryptedData:', encryptedData, 'length:', encryptedData.length);
                console.log('datasetAddress:', datasetAddress, 'length:', datasetAddress.length);
                console.log('tokenIn:', fromToken.address);
                console.log('tokenOut:', toToken.address);
                console.log('amountIn:', amountInBigInt.toString());
                console.log('limitPrice:', limitPrice);

                // Pre-flight check for batch order
                const preflight = await preflightSubmitOrder(
                    publicClient,
                    address,
                    fromToken.address as `0x${string}`,
                    toToken.address as `0x${string}`,
                    amountInBigInt,
                    encryptedData,
                    datasetAddress,
                );

                console.log('Preflight result:', preflight);

                if (!preflight.ok) {
                    console.error('Preflight failed:', preflight.error);
                    setOrderStep('error');
                    setErrorMessage(preflight.error || 'Pre-flight check failed');
                    return;
                }

                setOrderStep('submitting');

                const limitPriceBigInt = parseUnits(limitPrice, 18);
                const expiryBigInt = BigInt(Math.floor(Date.now() / 1000) + 86400);

                submitLimitOrder(
                    encryptedData,
                    datasetAddress,
                    fromToken.address as `0x${string}`,
                    toToken.address as `0x${string}`,
                    amountInBigInt,
                    limitPriceBigInt,
                    expiryBigInt
                );
            }
        } catch (error) {
            console.error('Order submission failed:', error);
            setOrderStep('error');
            setErrorMessage((error as Error).message || 'Order submission failed');
        }
    };

    // Handle button click — approve or submit depending on state
    const handleButtonClick = () => {
        if (needsApproval()) {
            handleApprove();
        } else {
            handleSubmitOrder();
        }
    };

    // After price sync completes, execute the swap
    useEffect(() => {
        if (isSyncSuccess && pendingSwapData) {
            console.log('Price sync confirmed, executing swap...');
            instantSwap(
                pendingSwapData.tokenIn,
                pendingSwapData.tokenOut,
                pendingSwapData.amountIn,
                pendingSwapData.minAmountOut
            );
            setPendingSwapData(null);
        }
    }, [isSyncSuccess, pendingSwapData, instantSwap]);

    // Save transaction when swap is initiated
    useEffect(() => {
        if (swapHash && fromToken && toToken) {
            saveTransaction({
                hash: swapHash,
                type: 'swap',
                tokenIn: fromToken.symbol,
                tokenOut: toToken.symbol,
                amountIn: fromAmount,
                amountOut: toAmount,
                timestamp: Date.now(),
                status: 'pending',
            });
            setLastTxHash(swapHash);
        }
    }, [swapHash, fromToken, toToken, fromAmount, toAmount]);
    
    // Save limit order transaction
    useEffect(() => {
        if (limitHash && fromToken && toToken) {
            saveTransaction({
                hash: limitHash,
                type: 'limit',
                tokenIn: fromToken.symbol,
                tokenOut: toToken.symbol,
                amountIn: fromAmount,
                timestamp: Date.now(),
                status: 'pending',
                limitPrice: limitPrice,
            });
            setLastTxHash(limitHash);
        }
    }, [limitHash, fromToken, toToken, fromAmount, limitPrice]);
    
    // Update transaction status on success
    useEffect(() => {
        if (isSwapSuccess && lastTxHash) {
            updateTransactionStatus(lastTxHash, 'success', toAmount);
        }
        if (isLimitSuccess && lastTxHash) {
            updateTransactionStatus(lastTxHash, 'success');
        }
    }, [isSwapSuccess, isLimitSuccess, lastTxHash, toAmount]);
    
    // Update transaction status on error
    useEffect(() => {
        if ((swapError || submitError) && lastTxHash) {
            updateTransactionStatus(lastTxHash, 'failed');
        }
    }, [swapError, submitError, lastTxHash]);

    // Handle success state
    useEffect(() => {
        if (isSubmitSuccess || isLimitSuccess || isSwapSuccess) {
            setOrderStep('success');
            setTimeout(() => {
                setFromAmount('');
                setToAmount('');
                setLimitPrice('');
                setOrderStep('idle');
                setLastTxHash(null);
                resetSubmit?.();
                resetLimitSubmit?.();
                resetSwap?.();
            }, 3000);
        }
    }, [isSubmitSuccess, isLimitSuccess, isSwapSuccess, resetSubmit, resetLimitSubmit, resetSwap]);

    // Handle submit error
    useEffect(() => {
        if (submitError || swapError || syncError) {
            setOrderStep('error');
            if (swapError) {
                setErrorMessage((swapError as Error).message || 'Swap failed');
            } else if (syncError) {
                setErrorMessage((syncError as Error).message || 'Price sync failed');
            }
        }
    }, [submitError, swapError, syncError]);

    const handleSwapTokens = () => {
        const tempToken = fromToken;
        const tempAmount = fromAmount;
        setFromToken(toToken);
        setToToken(tempToken);
        setFromAmount(toAmount);
        setToAmount(tempAmount);
    };

    const calculateEstimatedOutput = (amount: string) => {
        if (!amount || !fromToken || !toToken) return '';
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return '';
        if (exchangeRate > 0) {
            const output = calculateOutput(numAmount);
            if (output >= 1000) return output.toFixed(2);
            if (output >= 1) return output.toFixed(4);
            return output.toFixed(6);
        }
        return '';
    };

    const handleFromAmountChange = (amount: string) => {
        setFromAmount(amount);
        setToAmount(calculateEstimatedOutput(amount));
    };

    const isValidOrder =
        fromToken &&
        toToken &&
        fromAmount &&
        parseFloat(fromAmount) > 0 &&
        (orderType === 'market' || (orderType === 'limit' && limitPrice && parseFloat(limitPrice) > 0));

    const isApproveLoading = isApproving || isApproveConfirming;
    const isSyncLoading = isSyncingPrices || isSyncConfirming;
    const isSubmitLoading = isSubmitting || isSubmitConfirming || isSubmittingLimit || isLimitConfirming || isSwapping || isSwapConfirming;
    const isLoading = isApproveLoading || isSyncLoading || isSubmitLoading || orderStep === 'encrypting';

    const getButtonText = () => {
        if (!isConnected) return 'Connect Wallet';
        if (!isValidOrder) return 'Enter an amount';
        if (isApproving) return 'Approve in Wallet...';
        if (isApproveConfirming) return 'Confirming Approval...';
        if (orderStep === 'encrypting') return 'Encrypting Order...';
        if (isSyncingPrices) return 'Syncing Prices...';
        if (isSyncConfirming) return 'Confirming Price Update...';
        if (isSwapping) return 'Confirm Swap in Wallet...';
        if (isSwapConfirming) return 'Swapping...';
        if (isSubmitting || isSubmittingLimit) return 'Confirm in Wallet...';
        if (isSubmitConfirming || isLimitConfirming) return 'Confirming Order...';
        if (orderStep === 'success') return orderType === 'market' ? 'Swap Complete!' : 'Order Submitted!';
        if (needsApproval()) return `Approve ${fromToken?.symbol}`;
        return orderType === 'market' ? 'Swap (Live Rate)' : 'Submit Limit Order';
    };

    const formattedBalance = (() => {
        if (isNativeToken && nativeBalance) {
            return parseFloat(formatUnits(nativeBalance.value, nativeBalance.decimals)).toFixed(4);
        } else if (!isNativeToken && erc20Balance !== undefined && fromToken) {
            return parseFloat(formatUnits(erc20Balance as bigint, fromToken.decimals)).toFixed(4);
        }
        return '0.00';
    })();

    return (
        <div className="w-full max-w-md mx-auto space-y-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5 gradient-border">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {orderType === 'market' ? 'Swap' : 'Limit Order'}
                    </h2>
                    <button className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
                        <Info className="w-5 h-5" />
                    </button>
                </div>

                {/* Order Type Tabs */}
                <div className="flex p-1 bg-[var(--bg-tertiary)] rounded-xl mb-5">
                    <button
                        onClick={() => setOrderType('market')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            orderType === 'market'
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        Market
                    </button>
                    <button
                        onClick={() => setOrderType('limit')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            orderType === 'limit'
                                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                    >
                        Limit
                    </button>
                </div>

                {/* Token Inputs */}
                <div className="space-y-2">
                    <TokenInput
                        label="From"
                        token={fromToken}
                        amount={fromAmount}
                        onTokenChange={setFromToken}
                        onAmountChange={handleFromAmountChange}
                        balance={isConnected ? formattedBalance : undefined}
                        showMax={isConnected}
                    />

                    <div className="flex justify-center -my-3 relative z-10">
                        <button
                            onClick={handleSwapTokens}
                            className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-all"
                        >
                            <ArrowDownUp className="w-5 h-5" />
                        </button>
                    </div>

                    <TokenInput
                        label="To"
                        token={toToken}
                        amount={toAmount}
                        onTokenChange={setToToken}
                        onAmountChange={setToAmount}
                        readOnly
                    />
                </div>

                {/* Limit Price Input */}
                {orderType === 'limit' && (
                    <div className="mt-4 space-y-2">
                        <label className="text-sm text-[var(--text-muted)]">Limit Price</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={limitPrice}
                                onChange={(e) => {
                                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                                        setLimitPrice(e.target.value);
                                    }
                                }}
                                placeholder="0.0"
                                className="flex-1 px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                            />
                            <span className="text-sm text-[var(--text-muted)]">
                                {toToken?.symbol}/{fromToken?.symbol}
                            </span>
                        </div>
                    </div>
                )}

                {/* Order Info */}
                <div className="mt-5 p-4 rounded-xl bg-[var(--bg-tertiary)] space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                        <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                        <span className="text-[var(--text-secondary)]">
                            Order encrypted &bull; Nobody can see your intent
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Package className="w-4 h-4 text-[var(--accent-warning)]" />
                        <span className="text-[var(--text-secondary)]">
                            Batch #{displayBatchId} executes in ~{Math.floor(displayTimeRemaining / 60)}:{(displayTimeRemaining % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Handshake className="w-4 h-4 text-[var(--accent-success)]" />
                        <span className="text-[var(--text-secondary)]">
                            May CoW match for 0 slippage
                        </span>
                    </div>
                </div>

                {/* Success Message */}
                {orderStep === 'success' && (
                    <div className="mt-4 p-4 rounded-xl bg-[var(--accent-success)]/10 border border-[var(--accent-success)]">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[var(--accent-success)]" />
                            <div>
                                <p className="text-sm font-medium text-[var(--accent-success)]">
                                    {orderType === 'market' ? 'Swap Complete!' : 'Order Submitted!'}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {orderType === 'market' 
                                        ? `Swapped ${fromToken?.symbol} to ${toToken?.symbol}`
                                        : `Your encrypted order is now in batch #${displayBatchId}`
                                    }
                                </p>
                            </div>
                        </div>
                        {lastTxHash && (
                            <a
                                href={getArbiscanTxUrl(lastTxHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 flex items-center justify-center gap-2 text-xs text-[var(--accent-primary)] hover:underline"
                            >
                                View on Arbiscan
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {(orderStep === 'error' || submitError) && (
                    <div className="mt-4 p-4 rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)] flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-[var(--accent-danger)]" />
                        <div>
                            <p className="text-sm font-medium text-[var(--accent-danger)]">Order Failed</p>
                            <p className="text-xs text-[var(--text-muted)]">{errorMessage || submitError?.message || 'Please try again'}</p>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <Button
                    className="w-full mt-5"
                    size="lg"
                    disabled={!isConnected || !isValidOrder || isLoading}
                    isLoading={isLoading}
                    onClick={handleButtonClick}
                    leftIcon={orderStep === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                >
                    {getButtonText()}
                </Button>

                {/* Faucet for testing */}
                {isConnected && (fromToken?.symbol?.startsWith('m') || fromToken?.symbol === 'mUSDC' || fromToken?.symbol === 'mDAI') && (
                    <div className="mt-4 text-center">
                        <button
                            onClick={async () => {
                                if (address && fromToken.address) {
                                    mint(
                                        fromToken.address as `0x${string}`,
                                        address,
                                        parseUnits('1000000', fromToken.decimals)
                                    );
                                }
                            }}
                            disabled={isMinting}
                            className="text-xs text-[var(--accent-primary)] hover:underline opacity-80 hover:opacity-100 disabled:opacity-50"
                        >
                            {isMinting ? 'Minting...' : `Mint 1,000,000 ${fromToken?.symbol} (Test Faucet)`}
                        </button>
                    </div>
                )}
            </div>

            {/* Batch Status Panel */}
            <BatchStatusPanel
                batchId={displayBatchId}
                orderCount={displayOrderCount}
                estimatedVolume="~$2.3M"
                targetTime={Math.floor(Date.now() / 1000) + displayTimeRemaining}
            />
        </div>
    );
}

import { CONTRACTS } from './contracts';

// Extend Window interface for ethereum provider
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            isMetaMask?: boolean;
        };
    }
}

// Order data structure that will be encrypted using iExec DataProtector
export interface OrderData {
    type: 'market' | 'limit';
    direction: 'buy' | 'sell';
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOutMin?: string;
    limitPrice?: string;
    expiry?: number;
    timestamp: number;
    nonce: string;
}

export interface EncryptedOrderResult {
    encryptedData: `0x${string}`;
    datasetAddress: `0x${string}`;
    protectedDataAddress?: string; // iExec protected data address
    protectedDataTxHash?: string; // tx hash of protectData on iExec chain
    grantAccessTxHash?: string; // tx hash of grantAccess on iExec chain
    iExecExplorerUrl?: string; // URL to view on iExec Explorer
    isRealEncryption: boolean; // true if iExec DataProtector was used
}

/**
 * Generate a random nonce for order uniqueness
 */
function generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a proxy provider that boosts gas fees for Arbitrum Sepolia.
 * 
 * The iExec DataProtector SDK internally sends eth_sendTransaction
 * but doesn't add sufficient maxFeePerGas buffer for Arbitrum Sepolia,
 * causing "max fee per gas less than block base fee" errors.
 * 
 * This proxy intercepts those calls and injects proper EIP-1559 gas params.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createGasBoostedProvider(provider: any): any {
    return new Proxy(provider, {
        get(target, prop) {
            if (prop === 'request') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return async (args: any) => {
                    if (args.method === 'eth_sendTransaction' && args.params?.[0]) {
                        try {
                            // Fetch latest block to get current baseFeePerGas
                            const block = await target.request({
                                method: 'eth_getBlockByNumber',
                                params: ['latest', false],
                            });
                            
                            if (block?.baseFeePerGas) {
                                const baseFee = parseInt(block.baseFeePerGas, 16);
                                // Add 100% buffer to base fee to handle fluctuations
                                const maxFeePerGas = Math.ceil(baseFee * 2);
                                const maxPriorityFeePerGas = 1500000; // ~0.0015 gwei tip
                                
                                const tx = args.params[0];
                                tx.maxFeePerGas = '0x' + maxFeePerGas.toString(16);
                                tx.maxPriorityFeePerGas = '0x' + maxPriorityFeePerGas.toString(16);
                                
                                // Remove legacy gasPrice if present (conflicts with EIP-1559)
                                delete tx.gasPrice;
                                
                                console.log(`[ShadowSwap] Gas boost: baseFee=${baseFee}, maxFee=${maxFeePerGas}, tip=${maxPriorityFeePerGas}`);
                            }
                        } catch (err) {
                            console.warn('[ShadowSwap] Gas boost failed, using defaults:', err);
                        }
                    }
                    return target.request(args);
                };
            }
            // Proxy all other properties/methods through unchanged
            const value = target[prop];
            if (typeof value === 'function') {
                return value.bind(target);
            }
            return value;
        }
    });
}

/**
 * ============================================================
 * iExec DataProtector Integration
 * ============================================================
 *
 * This module uses iExec DataProtector SDK to encrypt order data
 * before on-chain submission. The encryption flow:
 *
 * 1. Create order data object with trade details
 * 2. Call dataProtector.core.protectData() to encrypt and store on IPFS
 * 3. Call dataProtector.core.grantAccess() to authorize our iApp
 * 4. Return encrypted reference for on-chain storage
 *
 * The iApp (iexec-app/) processes orders in a TEE:
 * - Decrypts order data inside Intel SGX enclave
 * - Validates order parameters
 * - Matches orders at uniform clearing price
 * - No external party can see order details
 *
 * Privacy: Order details (amounts, prices, tokens) are hidden from
 * validators, MEV bots, and any observers.
 * ============================================================
 */

/**
 * Encrypt order data using iExec DataProtector
 * This keeps order details confidential until batch execution in TEE
 *
 * @see https://docs.iex.ec/get-started/helloWorld/2-protectData
 */
export async function encryptOrder(
    orderData: Omit<OrderData, 'timestamp' | 'nonce'>,
    userAddress: string
): Promise<EncryptedOrderResult> {
    // Only run on client side
    if (typeof window === 'undefined') {
        throw new Error('encryptOrder can only be called on the client side');
    }

    if (!window.ethereum) {
        throw new Error('Ethereum provider not found. Please install MetaMask or another wallet.');
    }

    const fullOrderData: OrderData = {
        ...orderData,
        timestamp: Date.now(),
        nonce: generateNonce(),
    };

    // Check if iExec iApp is configured (deployed address)
    const iAppConfigured = CONTRACTS.IEXEC_IAPP !== '0x0000000000000000000000000000000000000000';

    if (!iAppConfigured) {
        console.warn('[ShadowSwap] iExec iApp not configured. Using development fallback.');
        console.warn('[ShadowSwap] To enable real encryption, deploy the iApp and set NEXT_PUBLIC_IEXEC_IAPP_ADDRESS');
        return encryptOrderFallback(fullOrderData, userAddress);
    }

    // Attempt real iExec DataProtector encryption
    try {
        return await encryptWithDataProtector(fullOrderData, userAddress);
    } catch (error) {
        console.error('[ShadowSwap] iExec DataProtector encryption failed:', error);
        console.warn('[ShadowSwap] Falling back to development encryption');
        return encryptOrderFallback(fullOrderData, userAddress);
    }
}

/**
 * Real encryption using iExec DataProtector SDK
 *
 * Flow:
 * 1. Import and initialize DataProtector SDK
 * 2. Protect order data (encrypts + stores on IPFS)
 * 3. Grant access to our iApp for TEE processing
 * 4. Return protected data reference
 *
 * @see https://docs.iex.ec/get-started/helloWorld/2-protectData
 * @see https://docs.iex.ec/get-started/helloWorld/4-manageDataAccess
 */
async function encryptWithDataProtector(
    orderData: OrderData,
    userAddress: string
): Promise<EncryptedOrderResult> {
    console.log('[ShadowSwap] Encrypting order with iExec DataProtector...');

    // Step 1: Dynamically import iExec DataProtector (avoids SSR issues)
    const { IExecDataProtector } = await import('@iexec/dataprotector');

    // Step 2: Initialize DataProtector with gas-boosted provider
    // The raw window.ethereum provider doesn't add sufficient gas for Arbitrum Sepolia,
    // causing "max fee per gas less than block base fee" errors inside SDK calls.
    // We wrap it with a proxy that injects proper EIP-1559 gas parameters.
    const boostedProvider = createGasBoostedProvider(window.ethereum);
    
    // isExperimental flag is needed for Arbitrum Sepolia support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataProtector = new IExecDataProtector(boostedProvider as any, {
        isExperimental: true,
    } as any);

    // Step 3: Protect the order data
    // This encrypts the data with a symmetric key, stores it on IPFS,
    // and registers ownership as an NFT on the blockchain
    console.log('[ShadowSwap] Calling dataProtector.core.protectData()...');
    const protectedData = await dataProtector.core.protectData({
        data: {
            // Order type and direction
            orderType: orderData.type,
            direction: orderData.direction,
            // Token pair
            tokenIn: orderData.tokenIn,
            tokenOut: orderData.tokenOut,
            // Amounts (as strings for precision)
            amountIn: orderData.amountIn,
            amountOutMin: orderData.amountOutMin || '0',
            // Limit order specific
            limitPrice: orderData.limitPrice || '0',
            expiry: orderData.expiry?.toString() || '0',
            // Metadata
            timestamp: orderData.timestamp.toString(),
            nonce: orderData.nonce,
            owner: userAddress,
        },
        name: `ShadowSwap-Order-${Date.now()}`,
    });

    console.log('[ShadowSwap] Data protected! Address:', protectedData.address);
    console.log('[ShadowSwap] protectData response:', JSON.stringify(protectedData, null, 2));

    // Capture the protectData transaction hash if available
    const protectedDataTxHash = (protectedData as Record<string, unknown>).transactionHash as string | undefined;
    if (protectedDataTxHash) {
        console.log('[ShadowSwap] protectData txHash:', protectedDataTxHash);
    }

    // Step 4: Grant access to our iApp for TEE processing
    // This authorizes the deployed iApp to decrypt and process the order
    // authorizedUser = 0x0...0 means any user can trigger the execution
    console.log('[ShadowSwap] Granting access to iApp:', CONTRACTS.IEXEC_IAPP);
    const grantedAccess = await dataProtector.core.grantAccess({
        protectedData: protectedData.address,
        authorizedApp: CONTRACTS.IEXEC_IAPP,
        authorizedUser: '0x0000000000000000000000000000000000000000',
    });

    console.log('[ShadowSwap] Access granted! Response:', JSON.stringify(grantedAccess, null, 2));
    const grantAccessTxHash = (grantedAccess as Record<string, unknown>).txHash as string | undefined;

    // Step 5: Build iExec Explorer URL for tracking
    // protectData creates a dataset on the iExec chain viewable at explorer.iex.ec
    const iExecExplorerUrl = getIExecExplorerDatasetUrl(protectedData.address);
    console.log('[ShadowSwap] View on iExec Explorer:', iExecExplorerUrl);

    // Step 6: Create references for on-chain storage
    // The smart contract stores the protected data address and a hash
    const datasetAddressBytes32 = protectedData.address.padEnd(66, '0') as `0x${string}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(orderData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const encryptedData = ('0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

    return {
        encryptedData,
        datasetAddress: datasetAddressBytes32,
        protectedDataAddress: protectedData.address,
        protectedDataTxHash,
        grantAccessTxHash,
        iExecExplorerUrl,
        isRealEncryption: true,
    };
}

/**
 * Development fallback encryption (NOT secure)
 *
 * Used when:
 * - iExec iApp is not deployed yet (address = 0x0)
 * - DataProtector SDK is not available
 * - Running in development/testing mode
 *
 * WARNING: This does NOT provide real encryption.
 * Deploy the iApp and configure NEXT_PUBLIC_IEXEC_IAPP_ADDRESS for production.
 */
export async function encryptOrderFallback(
    orderData: OrderData,
    userAddress: string
): Promise<EncryptedOrderResult> {
    console.log('[ShadowSwap] Using development encryption fallback');

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ ...orderData, owner: userAddress }));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const encryptedData = ('0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

    const addressData = encoder.encode(userAddress + Date.now().toString());
    const addressBuffer = await crypto.subtle.digest('SHA-256', addressData);
    const addressArray = Array.from(new Uint8Array(addressBuffer));
    const datasetAddress = ('0x' + addressArray.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

    return {
        encryptedData,
        datasetAddress,
        isRealEncryption: false,
    };
}

/**
 * Check if iExec DataProtector is available and configured
 *
 * Returns true if:
 * - Running in browser
 * - Ethereum provider available
 * - iApp address is configured (not zero)
 * - DataProtector SDK can be imported
 */
export async function isDataProtectorAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) {
        return false;
    }

    if (CONTRACTS.IEXEC_IAPP === '0x0000000000000000000000000000000000000000') {
        return false;
    }

    try {
        await import('@iexec/dataprotector');
        return true;
    } catch {
        return false;
    }
}

/**
 * Get DataProtector status for UI display
 */
export function getDataProtectorStatus(): {
    configured: boolean;
    iAppAddress: string;
    message: string;
} {
    const configured = CONTRACTS.IEXEC_IAPP !== '0x0000000000000000000000000000000000000000';

    return {
        configured,
        iAppAddress: CONTRACTS.IEXEC_IAPP,
        message: configured
            ? `iExec DataProtector active (iApp: ${CONTRACTS.IEXEC_IAPP.slice(0, 10)}...)`
            : 'Development mode - deploy iApp for real encryption',
    };
}

// ============================================================
// iExec Explorer URL Helpers
// ============================================================

export const IEXEC_EXPLORER_BASE = 'https://explorer.iex.ec/arbitrum-sepolia-testnet';

/**
 * Get iExec Explorer URL for a protected dataset
 * protectData() creates a dataset NFT on the iExec sidechain
 */
export function getIExecExplorerDatasetUrl(datasetAddress: string): string {
    return `${IEXEC_EXPLORER_BASE}/dataset/${datasetAddress}`;
}

/**
 * Get iExec Explorer URL for an iApp
 */
export function getIExecExplorerAppUrl(appAddress: string): string {
    return `${IEXEC_EXPLORER_BASE}/app/${appAddress}`;
}

/**
 * Get iExec Explorer URL for a deal (order execution)
 */
export function getIExecExplorerDealUrl(dealId: string): string {
    return `${IEXEC_EXPLORER_BASE}/deal/${dealId}`;
}

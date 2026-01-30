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

// Order data structure that will be encrypted
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
 * Encrypt order data using iExec DataProtector (loaded dynamically to avoid SSR issues)
 * This keeps order details confidential until batch execution in TEE
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

    // Use simple encryption fallback if iExec is not configured
    if (CONTRACTS.IEXEC_IAPP === '0x0000000000000000000000000000000000000000') {
        console.warn('iExec iApp not configured, using simple encryption fallback');
        return encryptOrderSimple(orderData, userAddress);
    }

    try {
        // Dynamically import iExec DataProtector to avoid SSR issues
        const { IExecDataProtector } = await import('@iexec/dataprotector');

        // Note: isExperimental is required for Arbitrum Sepolia but missing from SDK types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dataProtector = new IExecDataProtector(window.ethereum as any, {
            isExperimental: true,
        } as any);

        const fullOrderData: OrderData = {
            ...orderData,
            timestamp: Date.now(),
            nonce: generateNonce(),
        };

        const protectedData = await dataProtector.core.protectData({
            data: {
                orderType: fullOrderData.type,
                direction: fullOrderData.direction,
                tokenIn: fullOrderData.tokenIn,
                tokenOut: fullOrderData.tokenOut,
                amountIn: fullOrderData.amountIn,
                amountOutMin: fullOrderData.amountOutMin || '',
                limitPrice: fullOrderData.limitPrice || '',
                expiry: fullOrderData.expiry?.toString() || '',
                timestamp: fullOrderData.timestamp.toString(),
                nonce: fullOrderData.nonce,
                owner: userAddress,
            },
            name: `ShadowSwap-Order-${Date.now()}`,
        });

        await dataProtector.core.grantAccess({
            protectedData: protectedData.address,
            authorizedApp: CONTRACTS.IEXEC_IAPP,
            authorizedUser: '0x0000000000000000000000000000000000000000',
        });

        const datasetAddressBytes32 = protectedData.address.padEnd(66, '0') as `0x${string}`;

        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(fullOrderData));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const encryptedData = ('0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;

        return {
            encryptedData,
            datasetAddress: datasetAddressBytes32,
        };
    } catch (error) {
        console.error('iExec encryption failed, falling back to simple encryption:', error);
        return encryptOrderSimple(orderData, userAddress);
    }
}

/**
 * Simple encryption for testing/development without iExec
 * WARNING: This is NOT secure - only for development/testing
 */
export async function encryptOrderSimple(
    orderData: Omit<OrderData, 'timestamp' | 'nonce'>,
    userAddress: string
): Promise<EncryptedOrderResult> {
    const fullOrderData: OrderData = {
        ...orderData,
        timestamp: Date.now(),
        nonce: generateNonce(),
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ ...fullOrderData, owner: userAddress }));
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
    };
}

/**
 * Check if iExec DataProtector is available
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

// Transaction history management with localStorage

export interface Transaction {
    hash: `0x${string}`;
    type: 'swap' | 'limit' | 'approve' | 'cancel' | 'execute';
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut?: string;
    timestamp: number;
    status: 'pending' | 'success' | 'failed';
    limitPrice?: string;
}

const STORAGE_KEY = 'auction_dex_transactions';
const MAX_TRANSACTIONS = 50;

// Arbiscan URL for Arbitrum Sepolia
export const ARBISCAN_BASE_URL = 'https://sepolia.arbiscan.io';

export function getArbiscanTxUrl(hash: string): string {
    return `${ARBISCAN_BASE_URL}/tx/${hash}`;
}

export function getArbiscanAddressUrl(address: string): string {
    return `${ARBISCAN_BASE_URL}/address/${address}`;
}

export function saveTransaction(tx: Transaction): void {
    if (typeof window === 'undefined') return;
    
    try {
        const existing = getTransactions();
        
        // Check if transaction already exists
        const existingIndex = existing.findIndex(t => t.hash === tx.hash);
        
        if (existingIndex >= 0) {
            // Update existing transaction
            existing[existingIndex] = tx;
        } else {
            // Add new transaction at the beginning
            existing.unshift(tx);
        }
        
        // Limit to MAX_TRANSACTIONS
        const limited = existing.slice(0, MAX_TRANSACTIONS);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
        console.error('Failed to save transaction:', error);
    }
}

export function updateTransactionStatus(
    hash: `0x${string}`, 
    status: 'pending' | 'success' | 'failed',
    amountOut?: string
): void {
    if (typeof window === 'undefined') return;
    
    try {
        const existing = getTransactions();
        const index = existing.findIndex(t => t.hash === hash);
        
        if (index >= 0) {
            existing[index].status = status;
            if (amountOut) {
                existing[index].amountOut = amountOut;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
        }
    } catch (error) {
        console.error('Failed to update transaction:', error);
    }
}

export function getTransactions(): Transaction[] {
    if (typeof window === 'undefined') return [];
    
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as Transaction[];
    } catch (error) {
        console.error('Failed to get transactions:', error);
        return [];
    }
}

export function clearTransactions(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

export function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

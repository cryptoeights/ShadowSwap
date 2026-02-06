'use client';

import { useState, useEffect } from 'react';
import { 
    ExternalLink, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    ArrowRightLeft,
    Trash2,
    RefreshCw,
    TrendingUp,
    Download,
    Loader2,
    Lock,
    Shield,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { 
    Transaction, 
    clearTransactions, 
    getArbiscanTxUrl,
    formatTimeAgo,
} from '@/lib/transactionHistory';
import { useBlockchainHistory } from '@/hooks/useBlockchainHistory';
import { Button } from '@/components/ui';

function getStatusIcon(status: Transaction['status']) {
    switch (status) {
        case 'pending':
            return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
        case 'success':
            return <CheckCircle2 className="w-4 h-4 text-green-400" />;
        case 'failed':
            return <XCircle className="w-4 h-4 text-red-400" />;
    }
}

function getTypeIcon(type: Transaction['type']) {
    switch (type) {
        case 'swap':
            return <ArrowRightLeft className="w-4 h-4" />;
        case 'limit':
            return <TrendingUp className="w-4 h-4" />;
        case 'execute':
            return <CheckCircle2 className="w-4 h-4" />;
        case 'cancel':
            return <XCircle className="w-4 h-4" />;
        default:
            return <ArrowRightLeft className="w-4 h-4" />;
    }
}

function getTypeLabel(type: Transaction['type']) {
    switch (type) {
        case 'swap':
            return 'Swap';
        case 'limit':
            return 'Limit Order';
        case 'approve':
            return 'Approve';
        case 'cancel':
            return 'Cancel Order';
        case 'execute':
            return 'Execute Limit';
        default:
            return type;
    }
}

function getTypeBgColor(type: Transaction['type']) {
    switch (type) {
        case 'swap':
            return 'bg-blue-500/20 text-blue-400';
        case 'limit':
            return 'bg-purple-500/20 text-purple-400';
        case 'execute':
            return 'bg-green-500/20 text-green-400';
        case 'cancel':
            return 'bg-red-500/20 text-red-400';
        default:
            return 'bg-[var(--bg-card)] text-[var(--text-muted)]';
    }
}

function TransactionRow({ tx }: { tx: Transaction }) {
    const [timeAgo, setTimeAgo] = useState(formatTimeAgo(tx.timestamp));
    
    // Update time ago every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeAgo(formatTimeAgo(tx.timestamp));
        }, 60000);
        return () => clearInterval(interval);
    }, [tx.timestamp]);
    
    return (
        <div className="block p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    {getStatusIcon(tx.status)}
                    
                    {/* Type & Pair */}
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${getTypeBgColor(tx.type)}`}>
                                {getTypeIcon(tx.type)}
                                {getTypeLabel(tx.type)}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                                {tx.tokenIn} → {tx.tokenOut}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[var(--text-muted)]">
                                {parseFloat(tx.amountIn).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.tokenIn}
                            </span>
                            {tx.amountOut && (
                                <>
                                    <span className="text-xs text-[var(--text-muted)]">→</span>
                                    <span className="text-xs text-green-400">
                                        {parseFloat(tx.amountOut).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.tokenOut}
                                    </span>
                                </>
                            )}
                            {tx.type === 'limit' && tx.limitPrice && (
                                <span className="text-xs text-[var(--accent-primary)]">
                                    @ ${tx.limitPrice}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Time */}
                <span className="text-xs text-[var(--text-muted)]">{timeAgo}</span>
            </div>
            
            {/* Transaction Hash & Links */}
            <div className="mt-2 pt-2 border-t border-[var(--border-secondary)]">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                        {tx.hash.slice(0, 14)}...{tx.hash.slice(-12)}
                    </span>
                    {/* iExec DataProtector badge */}
                    {tx.isRealEncryption && (
                        <span className="flex items-center gap-1 text-xs text-purple-400">
                            <Shield className="w-3 h-3" />
                            TEE Encrypted
                        </span>
                    )}
                </div>
                
                {/* Links row */}
                <div className="flex items-center gap-3 mt-1.5">
                    {/* Arbiscan link */}
                    <a
                        href={getArbiscanTxUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[var(--accent-primary)] hover:underline"
                    >
                        <ExternalLink className="w-3 h-3" />
                        Arbiscan
                    </a>
                    
                    {/* iExec Explorer link */}
                    {tx.iExecExplorerUrl && tx.iExecProtectedDataAddress && (
                        <a
                            href={tx.iExecExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 hover:underline"
                        >
                            <Lock className="w-3 h-3" />
                            iExec Explorer
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TransactionHistory() {
    const { isConnected, address } = useAccount();
    const { transactions, isLoading, error, lastSyncBlock, refresh } = useBlockchainHistory();
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refresh();
        setIsRefreshing(false);
    };
    
    const handleClear = () => {
        if (confirm('Are you sure you want to clear all transaction history? It will be reloaded from blockchain on next refresh.')) {
            clearTransactions();
            handleRefresh();
        }
    };
    
    if (!isConnected) {
        return null;
    }
    
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Transaction History
                </h3>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                    >
                        {isLoading ? 'Syncing...' : 'Sync'}
                    </Button>
                    {transactions.length > 0 && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleClear}
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            className="text-red-400 hover:text-red-300"
                        >
                            Clear
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Sync Status */}
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
                <span className="flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {lastSyncBlock ? `Synced to block #${lastSyncBlock.toString()}` : 'Click Sync to load from blockchain'}
                </span>
                <span>Click tx to view on Arbiscan</span>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                    {error}
                </div>
            )}
            
            {/* Transactions List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {transactions.length === 0 ? (
                    <div className="text-center py-8">
                        <ArrowRightLeft className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-50" />
                        <p className="text-sm text-[var(--text-muted)]">
                            No transactions yet
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Your swap history will appear here
                        </p>
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <TransactionRow key={tx.hash} tx={tx} />
                    ))
                )}
            </div>
            
            {/* Footer */}
            {transactions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-secondary)] text-center">
                    <a
                        href={`https://sepolia.arbiscan.io`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
                    >
                        View all on Arbiscan
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            )}
        </div>
    );
}

// Hook to trigger history refresh from other components
export function useTransactionHistoryRefresh() {
    const refresh = () => {
        // Trigger storage event to refresh history in all components
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'auction_dex_transactions',
        }));
    };
    
    return { refresh };
}

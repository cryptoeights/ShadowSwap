'use client';

import { Clock, X, CheckCircle2, AlertCircle, Handshake, ArrowRightLeft } from 'lucide-react';
import { Order } from '@/types';
import { Button } from '@/components/ui';

interface OrderCardProps {
    order: Order;
    onCancel?: (orderId: string) => void;
}

export default function OrderCard({ order, onCancel }: OrderCardProps) {
    const statusConfig = {
        pending: {
            icon: Clock,
            className: 'badge-pending',
            label: 'Pending',
        },
        processing: {
            icon: AlertCircle,
            className: 'badge-info',
            label: 'Processing',
        },
        executed: {
            icon: CheckCircle2,
            className: 'badge-success',
            label: 'Executed',
        },
        cancelled: {
            icon: X,
            className: 'badge-error',
            label: 'Cancelled',
        },
        expired: {
            icon: AlertCircle,
            className: 'badge-error',
            label: 'Expired',
        },
    };

    const settlementConfig = {
        cow_match: {
            icon: Handshake,
            label: 'CoW Match',
            className: 'text-[var(--accent-success)]',
        },
        uniswap_swap: {
            icon: ArrowRightLeft,
            label: 'Uniswap v4',
            className: 'text-[var(--accent-secondary)]',
        },
        limit_queued: {
            icon: Clock,
            label: 'Queued',
            className: 'text-[var(--accent-warning)]',
        },
    };

    const status = statusConfig[order.status];
    const StatusIcon = status.icon;
    const settlement = order.settlementType ? settlementConfig[order.settlementType] : null;

    const formatAmount = (amount: string, symbol: string) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return `0 ${symbol}`;
        return `${num.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
    };

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-xl p-4 hover:bg-[var(--bg-card-hover)] transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className={`badge ${status.className}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] uppercase">
                        {order.type}
                    </span>
                </div>
                {order.batchId && order.status === 'pending' && (
                    <span className="text-xs text-[var(--text-muted)]">
                        Batch #{order.batchId}
                    </span>
                )}
            </div>

            {/* Order Details */}
            <div className="mb-3">
                <p className="text-base font-medium text-[var(--text-primary)]">
                    {order.direction === 'sell' ? 'SELL' : 'BUY'}{' '}
                    {formatAmount(order.amountIn, order.tokenIn.symbol)} →{' '}
                    {order.amountOut
                        ? formatAmount(order.amountOut, order.tokenOut.symbol)
                        : `~${order.tokenOut.symbol}`}
                </p>
                {order.type === 'limit' && order.limitPrice && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Limit @ ${parseFloat(order.limitPrice).toLocaleString()}
                    </p>
                )}
            </div>

            {/* Settlement Type */}
            {settlement && order.status === 'executed' && (
                <div className={`flex items-center gap-1.5 text-sm ${settlement.className} mb-3`}>
                    <settlement.icon className="w-4 h-4" />
                    <span>{settlement.label}</span>
                </div>
            )}

            {/* Expiry (for limit orders) */}
            {order.type === 'limit' && order.expiresAt && order.status === 'pending' && (
                <p className="text-xs text-[var(--text-muted)] mb-3">
                    Expires in{' '}
                    {Math.max(
                        0,
                        Math.floor((order.expiresAt - Date.now() / 1000) / 3600)
                    )}
                    h
                </p>
            )}

            {/* Cancel Button */}
            {order.status === 'pending' && onCancel && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancel(order.id)}
                    leftIcon={<X className="w-3 h-3" />}
                    className="text-[var(--accent-danger)]"
                >
                    Cancel
                </Button>
            )}
        </div>
    );
}

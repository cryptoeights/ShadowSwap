'use client';

import { useState, useEffect } from 'react';
import { Clock, Users, Lock } from 'lucide-react';

interface BatchStatusPanelProps {
    batchId: number;
    orderCount: number;
    estimatedVolume: string;
    targetTime: number; // Unix timestamp when batch executes
}

export default function BatchStatusPanel({
    batchId,
    orderCount,
    estimatedVolume,
    targetTime,
}: BatchStatusPanelProps) {
    const [timeRemaining, setTimeRemaining] = useState(0);

    useEffect(() => {
        const calculateTimeRemaining = () => {
            const now = Math.floor(Date.now() / 1000);
            const remaining = Math.max(0, targetTime - now);
            setTimeRemaining(remaining);
        };

        calculateTimeRemaining();
        const interval = setInterval(calculateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [targetTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progressPercentage = Math.min(100, (orderCount / 50) * 100);

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-primary)] rounded-2xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                        Next Batch #{batchId}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-tertiary)]">
                    <Clock className="w-4 h-4 text-[var(--accent-warning)]" />
                    <span className="text-sm font-mono font-medium text-[var(--accent-warning)]">
                        {formatTime(timeRemaining)}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                    <span>{orderCount} orders</span>
                    <span>{Math.round(progressPercentage)}% to threshold</span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <Users className="w-4 h-4 text-[var(--accent-secondary)]" />
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Est. Volume</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            {estimatedVolume}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                    <div>
                        <p className="text-xs text-[var(--text-muted)]">Orders</p>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            Encrypted
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

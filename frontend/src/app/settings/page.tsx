'use client';

import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui';

export default function SettingsPage() {
    const [slippage, setSlippage] = useState('0.5');
    const [customSlippage, setCustomSlippage] = useState('');
    const [deadline, setDeadline] = useState('30');

    // Batch preferences
    const [autoSubmit, setAutoSubmit] = useState(true);
    const [preferCow, setPreferCow] = useState(true);
    const [allowPartialFills, setAllowPartialFills] = useState(false);

    // Notifications
    const [notifyExecuted, setNotifyExecuted] = useState(true);
    const [notifyBatch, setNotifyBatch] = useState(true);
    const [notifyLimit, setNotifyLimit] = useState(true);
    const [notifyExpired, setNotifyExpired] = useState(false);

    const slippageOptions = ['0.1', '0.5', '1.0'];

    const Toggle = ({
        checked,
        onChange
    }: {
        checked: boolean;
        onChange: (checked: boolean) => void;
    }) => (
        <button
            onClick={() => onChange(!checked)}
            className={`
        relative w-11 h-6 rounded-full transition-colors
        ${checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'}
      `}
        >
            <div
                className={`
          absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform
          ${checked ? 'translate-x-5.5 left-0.5' : 'translate-x-0.5 left-0'}
        `}
                style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
            />
        </button>
    );

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Settings</h1>

            {/* Swap Settings */}
            <Card className="mb-6" padding="none">
                <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                    <CardTitle>Swap Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-6">
                    {/* Slippage Tolerance */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                            Slippage Tolerance
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {slippageOptions.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => {
                                        setSlippage(option);
                                        setCustomSlippage('');
                                    }}
                                    className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-colors
                    ${slippage === option && !customSlippage
                                            ? 'bg-[var(--accent-primary)] text-white'
                                            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                                        }
                  `}
                                >
                                    {option}%
                                </button>
                            ))}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Custom"
                                    value={customSlippage}
                                    onChange={(e) => {
                                        if (/^\d*\.?\d*$/.test(e.target.value)) {
                                            setCustomSlippage(e.target.value);
                                            if (e.target.value) setSlippage('');
                                        }
                                    }}
                                    className="w-24 px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm"
                                />
                                <span className="text-sm text-[var(--text-muted)]">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Deadline */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-3">
                            Transaction Deadline
                        </label>
                        <select
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                        >
                            <option value="10">10 minutes</option>
                            <option value="20">20 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Batch Preferences */}
            <Card className="mb-6" padding="none">
                <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                    <CardTitle>Batch Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                Auto-submit to next batch
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                Automatically add orders to the next available batch
                            </p>
                        </div>
                        <Toggle checked={autoSubmit} onChange={setAutoSubmit} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                Prefer CoW matching over speed
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                Wait longer to find matching orders for better rates
                            </p>
                        </div>
                        <Toggle checked={preferCow} onChange={setPreferCow} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                Allow partial fills
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                Accept partial order execution if full fill unavailable
                            </p>
                        </div>
                        <Toggle checked={allowPartialFills} onChange={setAllowPartialFills} />
                    </div>
                </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="mb-6" padding="none">
                <CardHeader className="p-5 border-b border-[var(--border-primary)]">
                    <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--text-primary)]">Order executed</p>
                        <Toggle checked={notifyExecuted} onChange={setNotifyExecuted} />
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--text-primary)]">Batch processed</p>
                        <Toggle checked={notifyBatch} onChange={setNotifyBatch} />
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--text-primary)]">Limit order triggered</p>
                        <Toggle checked={notifyLimit} onChange={setNotifyLimit} />
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--text-primary)]">Order expired</p>
                        <Toggle checked={notifyExpired} onChange={setNotifyExpired} />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <Button className="w-full" size="lg">
                Save Settings
            </Button>
        </div>
    );
}

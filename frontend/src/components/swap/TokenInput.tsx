'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Token } from '@/types';
import { SUPPORTED_TOKENS } from '@/lib/tokens';
import { Modal } from '@/components/ui';

interface TokenInputProps {
    label: string;
    token: Token | null;
    amount: string;
    onTokenChange: (token: Token) => void;
    onAmountChange: (amount: string) => void;
    balance?: string;
    readOnly?: boolean;
    showMax?: boolean;
}

export default function TokenInput({
    label,
    token,
    amount,
    onTokenChange,
    onAmountChange,
    balance,
    readOnly = false,
    showMax = false,
}: TokenInputProps) {
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredTokens = SUPPORTED_TOKENS.filter(
        (t) =>
            t.symbol.toLowerCase().includes(search.toLowerCase()) ||
            t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleMaxClick = () => {
        if (balance) {
            onAmountChange(balance);
        }
    };

    return (
        <>
            <div className="bg-[var(--bg-input)] rounded-xl p-4 border border-[var(--border-primary)] focus-within:border-[var(--accent-primary)] transition-colors">
                {/* Label and Balance */}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-muted)]">{label}</span>
                    {balance && (
                        <span className="text-sm text-[var(--text-muted)]">
                            Balance: <span className="text-[var(--text-secondary)]">{balance}</span>
                        </span>
                    )}
                </div>

                {/* Input and Token Selector */}
                <div className="flex items-center gap-3">
                    {/* Token Selector */}
                    <button
                        onClick={() => setIsTokenModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors shrink-0"
                    >
                        {token ? (
                            <>
                                <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-xs font-bold text-white">
                                    {token.symbol.charAt(0)}
                                </div>
                                <span className="font-medium text-[var(--text-primary)]">
                                    {token.symbol}
                                </span>
                            </>
                        ) : (
                            <span className="text-[var(--text-secondary)]">Select</span>
                        )}
                        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>

                    {/* Amount Input */}
                    <input
                        type="text"
                        value={amount}
                        onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and decimals
                            if (/^\d*\.?\d*$/.test(value)) {
                                onAmountChange(value);
                            }
                        }}
                        placeholder="0.0"
                        readOnly={readOnly}
                        className="flex-1 bg-transparent text-right text-2xl font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                </div>

                {/* Max Button */}
                {showMax && balance && (
                    <button
                        onClick={handleMaxClick}
                        className="mt-2 text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] font-medium"
                    >
                        MAX
                    </button>
                )}
            </div>

            {/* Token Selection Modal */}
            <Modal
                isOpen={isTokenModalOpen}
                onClose={() => {
                    setIsTokenModalOpen(false);
                    setSearch('');
                }}
                title="Select Token"
                size="sm"
            >
                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search by name or address..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] mb-4"
                />

                {/* Common Tokens */}
                <div className="mb-4">
                    <p className="text-xs text-[var(--text-muted)] mb-2">Common Tokens</p>
                    <div className="flex flex-wrap gap-2">
                        {SUPPORTED_TOKENS.slice(0, 6).map((t) => (
                            <button
                                key={t.address}
                                onClick={() => {
                                    onTokenChange(t);
                                    setIsTokenModalOpen(false);
                                    setSearch('');
                                }}
                                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${token?.address === t.address
                                        ? 'bg-[var(--accent-primary)] text-white'
                                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                                    }
                `}
                            >
                                {t.symbol}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Token List */}
                <div className="space-y-1">
                    {filteredTokens.map((t) => (
                        <button
                            key={t.address}
                            onClick={() => {
                                onTokenChange(t);
                                setIsTokenModalOpen(false);
                                setSearch('');
                            }}
                            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors
                ${token?.address === t.address
                                    ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]'
                                    : 'hover:bg-[var(--bg-tertiary)]'
                                }
              `}
                        >
                            <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-sm font-bold text-white">
                                {t.symbol.charAt(0)}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-medium text-[var(--text-primary)]">{t.symbol}</p>
                                <p className="text-xs text-[var(--text-muted)]">{t.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Modal>
        </>
    );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const navigation = [
    { name: 'Swap', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Settings', href: '/settings' },
];

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-lg border-b border-[var(--border-primary)]">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text">ShadowSwap</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                                            ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                        }
                  `}
                                >
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Connect Wallet Button */}
                    <div className="hidden md:block">
                        <ConnectButton
                            chainStatus="icon"
                            showBalance={false}
                            accountStatus={{
                                smallScreen: 'avatar',
                                largeScreen: 'full',
                            }}
                        />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                    >
                        {mobileMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-[var(--border-primary)]">
                        <div className="flex flex-col gap-2">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`
                      px-4 py-3 rounded-lg text-sm font-medium transition-all
                      ${isActive
                                                ? 'text-[var(--text-primary)] bg-[var(--bg-tertiary)]'
                                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                                            }
                    `}
                                    >
                                        {item.name}
                                    </Link>
                                );
                            })}
                            <div className="pt-4 border-t border-[var(--border-secondary)]">
                                <ConnectButton
                                    chainStatus="icon"
                                    showBalance={false}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
}

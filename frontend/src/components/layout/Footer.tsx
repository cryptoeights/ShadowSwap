import Link from 'next/link';
import { Github, Twitter, FileText, MessageCircle } from 'lucide-react';

const footerLinks = [
    { href: 'https://docs.shadowswap.io', label: 'Docs', icon: FileText },
    { href: 'https://github.com/shadowswap', label: 'GitHub', icon: Github },
    { href: 'https://discord.gg/shadowswap', label: 'Discord', icon: MessageCircle },
    { href: 'https://twitter.com/shadowswap', label: 'Twitter', icon: Twitter },
];

export default function Footer() {
    return (
        <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Links */}
                    <div className="flex items-center gap-6">
                        {footerLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Network Status */}
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                        <span>Network:</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--bg-tertiary)]">
                            <div className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
                            <span className="text-[var(--text-secondary)]">Arbitrum</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                        © 2024 ShadowSwap. Confidential Batch Auction DEX powered by iExec TEE.
                    </p>
                </div>
            </div>
        </footer>
    );
}

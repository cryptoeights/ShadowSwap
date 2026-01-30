'use client';

import { WagmiProvider, http } from 'wagmi';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { ReactNode, useState, useMemo } from 'react';

// Configure chains and transports with custom RPC proxy to avoid CORS
const config = getDefaultConfig({
    appName: 'ShadowSwap',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    chains: [arbitrumSepolia, arbitrum],
    transports: {
        // Use local proxy for Arbitrum Sepolia to avoid CORS issues
        [arbitrumSepolia.id]: http('/api/rpc'),
        [arbitrum.id]: http(),
    },
    ssr: true,
});

interface Web3ProviderProps {
    children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={darkTheme({
                        accentColor: '#8b5cf6',
                        accentColorForeground: 'white',
                        borderRadius: 'large',
                        fontStack: 'system',
                        overlayBlur: 'small',
                    })}
                    modalSize="compact"
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}

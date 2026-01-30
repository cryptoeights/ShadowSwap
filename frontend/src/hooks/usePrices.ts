'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchAllPrices, getExchangeRate, TokenPrice } from '@/lib/prices';

/**
 * Hook to fetch and cache all token prices
 */
export function usePrices(refreshInterval = 30000) {
    const [prices, setPrices] = useState<TokenPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            setError(null);
            const data = await fetchAllPrices();
            setPrices(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, refreshInterval);
        return () => clearInterval(interval);
    }, [refresh, refreshInterval]);

    const getPrice = useCallback((symbol: string): number => {
        return prices.find(p => p.symbol === symbol)?.usdPrice || 0;
    }, [prices]);

    const getChange = useCallback((symbol: string): number => {
        return prices.find(p => p.symbol === symbol)?.change24h || 0;
    }, [prices]);

    return { prices, isLoading, error, refresh, getPrice, getChange };
}

/**
 * Hook for swap price calculations
 */
export function useSwapPrice(fromSymbol: string | undefined, toSymbol: string | undefined) {
    const [rate, setRate] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!fromSymbol || !toSymbol) {
            setRate(0);
            return;
        }

        const fetchRate = async () => {
            setIsLoading(true);
            try {
                const exchangeRate = await getExchangeRate(fromSymbol, toSymbol);
                setRate(exchangeRate);
            } catch (err) {
                console.error('Failed to fetch exchange rate:', err);
                setRate(0);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRate();
        const interval = setInterval(fetchRate, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fromSymbol, toSymbol]);

    const calculateOutput = useCallback((inputAmount: number): number => {
        if (!rate || isNaN(inputAmount)) return 0;
        return inputAmount * rate;
    }, [rate]);

    return { rate, isLoading, calculateOutput };
}

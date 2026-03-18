// Custom hook for BitYield vault data
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getBitYieldUserBalance,
  getBitYieldStats,
} from "@/services/apiService";
import type {
  BitYieldAPY,
  BitYieldVaultStats,
  BitYieldPoolsStats,
  BitYieldUserBalance,
  BitYieldComprehensiveStats,
} from "@/types";

interface UseBitYieldReturn {
  apy: BitYieldAPY | null;
  vaultStats: BitYieldVaultStats | null;
  pools: BitYieldPoolsStats | null;
  userBalance: BitYieldUserBalance | null;
  comprehensiveStats: BitYieldComprehensiveStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useBitYield = (
  userAddress?: string,
  autoFetch = false
): UseBitYieldReturn => {
  const [apy, setApy] = useState<BitYieldAPY | null>(null);
  const [vaultStats, setVaultStats] = useState<BitYieldVaultStats | null>(null);
  const [pools, setPools] = useState<BitYieldPoolsStats | null>(null);
  const [userBalance, setUserBalance] = useState<BitYieldUserBalance | null>(
    null
  );
  const [comprehensiveStats, setComprehensiveStats] =
    useState<BitYieldComprehensiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Throttle mechanism - prevent fetching more than once per minute
  const lastFetchTime = useRef<number>(0);
  const backoffDelay = useRef<number>(0);
  const THROTTLE_MS = 60000; // 1 minute
  const MAX_BACKOFF_MS = 300000; // 5 minutes max backoff

  const fetchData = useCallback(async () => {
    // Throttle: Check if we fetched recently
    const now = Date.now();
    if (now - lastFetchTime.current < THROTTLE_MS && lastUpdated) {
      console.log(
        "[useBitYield] Throttled - last fetch was less than 1 minute ago"
      );
      return;
    }

    // Exponential backoff: If we're in backoff period, don't fetch
    if (
      backoffDelay.current > 0 &&
      now - lastFetchTime.current < backoffDelay.current
    ) {
      const remainingMs = backoffDelay.current - (now - lastFetchTime.current);
      const remainingSec = Math.ceil(remainingMs / 1000);
      console.log(
        `[useBitYield] In backoff period - ${remainingSec}s remaining`
      );
      setError(
        `Rate limited. Please wait ${remainingSec}s before trying again.`
      );
      return;
    }

    lastFetchTime.current = now;
    try {
      setIsLoading(true);
      setError(null);

      // Fetch data with delays between calls to avoid rate limiting
      // Use the comprehensive stats endpoint which makes all calls server-side
      const statsData = await getBitYieldStats();

      if (statsData) {
        setComprehensiveStats(statsData);

        // Extract individual data from comprehensive stats
        setVaultStats({
          totalTvl: statsData.vault.tvl,
          totalTvlBTC: statsData.vault.tvlBTC,
          totalTvlFormatted: statsData.vault.tvlFormatted,
          depositorCount: statsData.vault.depositors,
          isPaused: statsData.vault.isPaused,
        });

        setPools({
          alex: statsData.pools.alex,
          velar: statsData.pools.velar,
          total: {
            tvl: statsData.pools.combined.tvl,
            tvlBTC: statsData.pools.combined.tvlBTC,
            tvlFormatted: `${statsData.pools.combined.tvlBTC.toFixed(8)} BTC`,
          },
        });

        // Set APY data from pools
        setApy({
          alex: {
            apy: statsData.pools.alex.apy,
            apyFormatted: statsData.pools.alex.apyFormatted,
            basisPoints: Math.round(statsData.pools.alex.apy * 100),
          },
          velar: {
            apy: statsData.pools.velar.apy,
            apyFormatted: statsData.pools.velar.apyFormatted,
            basisPoints: Math.round(statsData.pools.velar.apy * 100),
          },
          lastUpdated: statsData.apy.lastUpdated,
        });
      }

      // Fetch user balance separately if address provided (after a delay)
      if (userAddress) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay to space out requests
        const balance = await getBitYieldUserBalance(userAddress);
        setUserBalance(balance);
      }

      // Success - reset backoff
      backoffDelay.current = 0;
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch BitYield data";

      // If rate limited, implement exponential backoff
      if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        // Exponential backoff: start with 1 minute, double each time, max 5 minutes
        if (backoffDelay.current === 0) {
          backoffDelay.current = 60000; // Start with 1 minute
        } else {
          backoffDelay.current = Math.min(
            backoffDelay.current * 2,
            MAX_BACKOFF_MS
          );
        }

        const backoffSec = Math.ceil(backoffDelay.current / 1000);
        setError(
          `Rate limited. Please wait ${backoffSec}s before trying again.`
        );
        console.warn(
          `[useBitYield] Rate limited - backing off for ${backoffSec}s`
        );
      } else {
        setError(errorMessage);
        console.error("Error fetching BitYield data:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, lastUpdated]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    apy,
    vaultStats,
    pools,
    userBalance,
    comprehensiveStats,
    isLoading,
    error,
    refetch: fetchData,
    lastUpdated,
  };
};

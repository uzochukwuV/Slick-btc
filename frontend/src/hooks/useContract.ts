"use client";

import { useState, useEffect, useCallback } from "react";
import { VaultBalance } from "@/types";
import { getVaultData, isContractPaused } from "@/services/contractService";
import { useWallet } from "@/contexts/WalletContext";

export const useContract = () => {
  const { address, isConnected } = useWallet();
  const [vaultData, setVaultData] = useState<VaultBalance>({
    userBalance: 0,
    totalTvl: 0,
    depositorCount: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch vault data
  const fetchVaultData = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const [data, paused] = await Promise.all([
        getVaultData(address),
        isContractPaused(),
      ]);

      setVaultData(data);
      setIsPaused(paused);
    } catch (err) {
      // Check if error is due to contract not existing
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("NoSuchContract")) {
        setError("CONTRACT_NOT_DEPLOYED");
      } else {
        setError("Failed to fetch vault data");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch on mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchVaultData();
    }
  }, [isConnected, address, fetchVaultData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      fetchVaultData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, address, fetchVaultData]);

  return {
    vaultData,
    isPaused,
    isLoading,
    error,
    refetch: fetchVaultData,
  };
};

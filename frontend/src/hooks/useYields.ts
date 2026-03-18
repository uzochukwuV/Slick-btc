"use client";

import { useState, useEffect, useCallback } from "react";
import { YieldOpportunity } from "@/types";
import { getYields } from "@/services/apiService";

export const useYields = () => {
  const [yields, setYields] = useState<YieldOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch yields
  const fetchYields = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getYields();
      setYields(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Failed to fetch yield data");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchYields();
  }, [fetchYields]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchYields();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchYields]);

  // Sort yields by different criteria
  const sortedByApy = useCallback(() => {
    return [...yields].sort((a, b) => b.apy - a.apy);
  }, [yields]);

  const sortedByTvl = useCallback(() => {
    return [...yields].sort((a, b) => b.tvl - a.tvl);
  }, [yields]);

  const filterByRisk = useCallback(
    (riskLevel: "low" | "medium" | "high") => {
      return yields.filter((y) => y.riskLevel === riskLevel);
    },
    [yields]
  );

  const filterByProtocol = useCallback(
    (protocol: string) => {
      return yields.filter(
        (y) => y.protocol.toLowerCase() === protocol.toLowerCase()
      );
    },
    [yields]
  );

  return {
    yields,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchYields,
    sortedByApy,
    sortedByTvl,
    filterByRisk,
    filterByProtocol,
  };
};

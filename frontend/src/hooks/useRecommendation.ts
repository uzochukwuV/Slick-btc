"use client";

import { useState, useCallback } from "react";
import { Recommendation, UserPreferences } from "@/types";
import { getRecommendation } from "@/services/apiService";

export const useRecommendation = () => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = useCallback(
    async (preferences: UserPreferences) => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getRecommendation(preferences);
        setRecommendation(data);
      } catch (err) {
        setError("Failed to fetch AI recommendation");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearRecommendation = useCallback(() => {
    setRecommendation(null);
    setError(null);
  }, []);

  return {
    recommendation,
    isLoading,
    error,
    fetchRecommendation,
    clearRecommendation,
  };
};

// API Service for backend communication
import axios, { AxiosInstance } from "axios";
import {
  YieldOpportunity,
  Recommendation,
  UserPreferences,
  ApiResponse,
} from "@/types";

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store latest data source info globally
let latestDataSource: { network: string; note?: string } | null = null;

export const getLatestDataSource = () => latestDataSource;

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Aggregated yield data from backend
interface AggregatedYieldData {
  protocols: Array<{
    protocol: string;
    opportunities: YieldOpportunity[];
    totalTVL: number;
    fetchedAt: number;
    success: boolean;
    error?: string;
  }>;
  totalOpportunities: number;
  totalTVL: number;
  highestAPY?: {
    protocol: string;
    poolId: string;
    apy: number;
  };
  lowestRisk?: {
    protocol: string;
    poolId: string;
    tvl: number;
  };
  updatedAt: number;
  stale?: boolean;
}

// Get all yield opportunities
export const getYields = async (): Promise<YieldOpportunity[]> => {
  try {
    const response = await apiClient.get<ApiResponse<AggregatedYieldData>>(
      "/api/yields"
    );

    // Store data source info
    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    // Extract and flatten all opportunities from all protocols
    if (response.data?.data?.protocols) {
      const allOpportunities = response.data.data.protocols.flatMap(
        (protocol) => protocol.opportunities || []
      );
      return allOpportunities;
    }

    return [];
  } catch (error) {
    console.error("Error fetching yields:", error);
    return [];
  }
};

// Get yields for specific protocol
export const getProtocolYields = async (
  protocol: string
): Promise<YieldOpportunity[]> => {
  try {
    const response = await apiClient.get<YieldOpportunity[]>(
      `/api/yields/${protocol}`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${protocol} yields:`, error);
    return [];
  }
};

// Backend recommendation response type
interface BackendRecommendation {
  protocol: string;
  poolId: string;
  poolName: string;
  expectedAPY: number;
  riskLevel: string;
  impermanentLossRisk: boolean;
  reasoning: string;
  riskAssessment: string;
  alternatives: Array<{
    protocol: string;
    poolId: string;
    poolName: string;
    apy: number;
    tvl: number;
    pros: string;
    cons: string;
    riskLevel: string;
  }>;
  projectedEarnings: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  confidenceScore: number;
  warnings?: string[];
  disclaimers?: string[];
}

// Get AI recommendation
export const getRecommendation = async (
  preferences: UserPreferences
): Promise<Recommendation | null> => {
  try {
    const response = await apiClient.post<ApiResponse<BackendRecommendation>>(
      "/api/recommend",
      preferences
    );

    // Store data source info
    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    if (!response.data?.data) {
      return null;
    }

    const backendData = response.data.data;

    // Transform backend response to frontend format
    const recommendation: Recommendation = {
      recommended: {
        protocol: backendData.protocol,
        pool: backendData.poolName,
        expectedApy: backendData.expectedAPY,
      },
      reasoning: backendData.reasoning,
      alternatives: backendData.alternatives.map((alt) => ({
        protocol: alt.protocol,
        pool: alt.poolName,
        apy: alt.apy,
        pros: alt.pros ? alt.pros.split("\n").filter(Boolean) : [alt.pros],
        cons: alt.cons ? alt.cons.split("\n").filter(Boolean) : [alt.cons],
      })),
      riskAssessment: backendData.riskAssessment,
      projectedEarnings: backendData.projectedEarnings,
      confidence: backendData.confidenceScore,
    };

    return recommendation;
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    return null;
  }
};

// Get health status
export const getHealth = async (): Promise<{
  status: string;
  timestamp: number;
}> => {
  try {
    const response = await apiClient.get("/api/health");
    return response.data;
  } catch (error) {
    console.error("Error checking health:", error);
    return { status: "unhealthy", timestamp: Date.now() };
  }
};

// Clear cache (admin function)
export const clearCache = async (): Promise<boolean> => {
  try {
    await apiClient.delete("/api/cache");
    return true;
  } catch (error) {
    console.error("Error clearing cache:", error);
    return false;
  }
};

// ============================================================================
// BitYield Vault API Methods
// ============================================================================

import type {
  BitYieldAPY,
  BitYieldVaultStats,
  BitYieldPoolsStats,
  BitYieldUserBalance,
  BitYieldComprehensiveStats,
} from "@/types";

/**
 * Get APY data for both ALEX and Velar pools
 */
export const getBitYieldAPY = async (): Promise<BitYieldAPY | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BitYieldAPY>>(
      "/api/bityield/apy"
    );

    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    return response.data?.data || null;
  } catch (error) {
    console.error("Error fetching BitYield APY:", error);
    return null;
  }
};

/**
 * Get vault TVL and statistics
 */
export const getBitYieldVaultStats = async (): Promise<BitYieldVaultStats | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BitYieldVaultStats>>(
      "/api/bityield/tvl"
    );

    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    return response.data?.data || null;
  } catch (error) {
    console.error("Error fetching BitYield vault stats:", error);
    return null;
  }
};

/**
 * Get statistics for both pools
 */
export const getBitYieldPools = async (): Promise<BitYieldPoolsStats | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BitYieldPoolsStats>>(
      "/api/bityield/pools"
    );

    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    return response.data?.data || null;
  } catch (error) {
    console.error("Error fetching BitYield pools:", error);
    return null;
  }
};

/**
 * Get user balance and positions
 */
export const getBitYieldUserBalance = async (
  address: string
): Promise<BitYieldUserBalance | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BitYieldUserBalance>>(
      `/api/bityield/user/${address}`
    );

    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    return response.data?.data || null;
  } catch (error) {
    console.error("Error fetching BitYield user balance:", error);
    return null;
  }
};

/**
 * Get comprehensive vault statistics
 */
export const getBitYieldStats = async (): Promise<BitYieldComprehensiveStats | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BitYieldComprehensiveStats>>(
      "/api/bityield/stats"
    );

    if (response.data?.metadata?.dataSource) {
      latestDataSource = response.data.metadata.dataSource;
    }

    return response.data?.data || null;
  } catch (error) {
    console.error("Error fetching BitYield stats:", error);
    return null;
  }
};

/**
 * Clear user-specific cache
 */
export const clearUserCache = async (address: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/api/bityield/cache/user/${address}`);
    return true;
  } catch (error) {
    console.error("Error clearing user cache:", error);
    return false;
  }
};

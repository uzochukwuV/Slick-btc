// Type definitions for BitYield Frontend

/**
 * Backend API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  metadata: {
    timestamp: number;
    version: string;
    dataSource?: {
      network: string;
      note?: string;
    };
  };
}

/**
 * Error response from backend
 */
export interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: number;
}

// Yield Opportunity from backend
export interface YieldOpportunity {
  protocol: string;
  protocolType:
    | "lending"
    | "liquidity_pool"
    | "staking"
    | "yield_farming"
    | "auto_compounding";
  poolId: string;
  poolName: string;
  apy: number;
  apyBreakdown?: {
    base: number;
    rewards?: number;
    fees?: number;
  };
  tvl: number;
  tvlInSBTC: number;
  volume24h?: number;
  riskLevel: "low" | "medium" | "high";
  riskFactors?: string[];
  minDeposit?: number;
  maxDeposit?: number;
  lockPeriod?: number;
  depositFee: number;
  withdrawalFee: number;
  performanceFee: number;
  impermanentLossRisk: boolean;
  auditStatus?: "audited" | "unaudited" | "in_progress";
  protocolAge?: number;
  contractAddress: string;
  description?: string;
  updatedAt: number;
}

// AI Recommendation from backend
export interface Recommendation {
  recommended: {
    protocol: string;
    pool: string;
    expectedApy: number;
  };
  reasoning: string;
  alternatives: Array<{
    protocol: string;
    pool: string;
    apy: number;
    pros: string[];
    cons: string[];
  }>;
  riskAssessment: string;
  projectedEarnings: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  confidence: number;
}

// User Preferences for recommendation
export interface UserPreferences {
  amount: number;
  riskTolerance: "conservative" | "moderate" | "aggressive";
  lockPeriodPreference?: number;
  avoidImpermanentLoss?: boolean;
}

// Wallet State
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  stxBalance: number;
  sbtcBalance: number;
  network: "testnet" | "mainnet";
}

// Vault Balance
export interface VaultBalance {
  userBalance: number;
  totalTvl: number;
  depositorCount: number;
  depositTimestamp?: number;
  withdrawalTimestamp?: number;
}

// Transaction Status
export interface Transaction {
  txId: string;
  status: "pending" | "success" | "failed";
  type: "deposit" | "withdrawal";
  amount: number;
  timestamp: number;
}

// Historical Yield Data for charts
export interface HistoricalYield {
  date: string;
  velar: number;
  alex: number;
}

// Market Context Data
export interface MarketContext {
  btcPrice: number;
  btcChange24h: number;
  stacksBlockHeight: number;
  ecosystemTvl: number;
}

// ============================================================================
// BitYield Vault Types
// ============================================================================

/**
 * APY data for both ALEX and Velar pools
 */
export interface BitYieldAPY {
  alex: {
    apy: number;
    apyFormatted: string;
    basisPoints: number;
  };
  velar: {
    apy: number;
    apyFormatted: string;
    basisPoints: number;
  };
  lastUpdated: number;
}

/**
 * Vault TVL and statistics
 */
export interface BitYieldVaultStats {
  totalTvl: number;
  totalTvlBTC: number;
  totalTvlFormatted: string;
  depositorCount: number;
  isPaused: boolean;
}

/**
 * Individual pool statistics (ALEX or Velar)
 */
export interface BitYieldPoolData {
  tvl: number;
  tvlBTC: number;
  tvlFormatted: string;
  apy: number;
  apyFormatted: string;
  isPaused: boolean;
}

/**
 * Combined pool statistics
 */
export interface BitYieldPoolsStats {
  alex: BitYieldPoolData;
  velar: BitYieldPoolData;
  total: {
    tvl: number;
    tvlBTC: number;
    tvlFormatted: string;
  };
}

/**
 * User balance and positions in the vault
 */
export interface BitYieldUserBalance {
  vaultBalance: number;
  vaultBalanceBTC: number;
  vaultBalanceFormatted: string;
  allocations: {
    alex: {
      amount: number;
      amountBTC: number;
      amountFormatted: string;
      percentage: string;
    };
    velar: {
      amount: number;
      amountBTC: number;
      amountFormatted: string;
      percentage: string;
    };
    total: number;
  };
  totalValueWithYield: {
    amount: number;
    amountBTC: number;
    amountFormatted: string;
  };
  yield: {
    amount: number;
    amountBTC: number;
    amountFormatted: string;
  };
  riskPreference: {
    value: number;
    name: string;
  };
}

/**
 * Comprehensive vault statistics
 */
export interface BitYieldComprehensiveStats {
  vault: {
    tvl: number;
    tvlBTC: number;
    tvlFormatted: string;
    depositors: number;
    isPaused: boolean;
  };
  pools: {
    alex: BitYieldPoolData;
    velar: BitYieldPoolData;
    combined: {
      tvl: number;
      tvlBTC: number;
    };
  };
  apy: {
    lastUpdated: number;
  };
}

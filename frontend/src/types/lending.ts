// Lending Pool Types

export interface ProtocolStats {
  totalSbtcDeposits: number; // sats
  totalStxBorrowed: number; // microSTX
  totalStxAvailable: number; // microSTX
  stxPerSbtc: number; // microSTX per sat
  dualStackingEnrolled: boolean;
  protocolPaused: boolean;
}

export interface FlashLoanStats {
  enabled: boolean;
  feeBps: number;
  totalVolume: number; // sats
  totalFees: number; // sats
  availableLiquidity: number; // sats
}

export interface SwapStats {
  enabled: boolean;
  feeBps: number;
  totalVolumeSbtc: number; // sats
  totalVolumeStx: number; // microSTX
  totalFeesSbtc: number; // sats
  totalFeesStx: number; // microSTX
  sbtcReserve: number; // sats
  stxLiquidity: number; // microSTX
  price: number; // stx-per-sbtc
}

export interface DualStackingStatus {
  enrolled: boolean;
  totalRewards: number; // sats
  poolBalance: number; // sats
  eligibleForEnrollment: boolean;
}

export interface CycleInfo {
  cycleId: number;
  snapshotCount: number;
  totalRewards: number; // sats
  finalized: boolean;
}

export interface ParticipantInfo {
  enrolled: boolean;
  rewardedAddress: string;
  sbtcBalance: number; // sats
  stxRatio: number;
  lastCycleProcessed: number;
}

export interface UserDeposit {
  amount: number; // sats
  depositTime: number; // unix timestamp
  shares: number;
}

export interface UserCollateral {
  amount: number; // sats
  asset: string;
}

export interface UserLoan {
  principalAmount: number; // microSTX
  interestAccrued: number; // microSTX
  borrowTime: number;
  lastInterestUpdate: number;
}

export interface LoanStatus {
  principal: number; // microSTX
  interest: number; // microSTX
  totalDebtStx: number; // microSTX
  collateralSbtcSats: number; // sats
  collateralStxValue: number; // microSTX
  healthFactor: number;
  isHealthy: boolean;
  dualStacking: boolean;
  stxPerSbtc: number;
}

export interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  fee: number;
  price: number;
}

// STX Lending Types
export interface StxLendingStats {
  totalStxDeposited: number; // microSTX
  totalStxBorrowed: number; // microSTX
  totalStxAvailable: number; // microSTX
  utilizationBps: number; // basis points (0-10000)
  interestRateBps: number; // basis points
  totalShares: number;
}

export interface StxLenderApy {
  utilizationBps: number;
  borrowRateBps: number;
  lenderApyBps: number;
}

export interface UserStxDeposit {
  amount: number; // microSTX
  shares: number;
  depositTime: number; // unix timestamp
}

// USDCx Types
export interface UsdcxLendingStats {
  totalUsdcxDeposited: number; // micro-USDCx (6 decimals)
  totalUsdcxBorrowed: number;
  totalUsdcxAvailable: number;
  utilizationBps: number;
  interestRateBps: number;
  totalShares: number;
}

export interface UsdcxLenderApy {
  utilizationBps: number;
  borrowRateBps: number;
  lenderApyBps: number;
}

export interface UserUsdcxDeposit {
  amount: number; // micro-USDCx
  shares: number;
  depositTime: number;
}

export interface UserUsdcxLoan {
  principalAmount: number; // micro-USDCx
  interestAccrued: number;
  borrowTime: number;
  lastInterestUpdate: number;
}

export interface UsdcxSwapStats {
  swapEnabled: boolean;
  totalVolume: number;
  totalFees: number;
  sbtcUsdcxPrice: number;
  stxUsdcxPrice: number;
}

export interface PoolAllocation {
  stackingAllocationBps: number;
  liquidityAllocationBps: number;
  totalSbtc: number;
  sbtcInStacking: number;
  sbtcInLiquidity: number;
}

export interface LendingPoolData {
  protocolStats: ProtocolStats;
  flashLoanStats: FlashLoanStats;
  swapStats: SwapStats;
  dualStackingStatus: DualStackingStatus;
  cycleInfo: CycleInfo;
  stxLendingStats: StxLendingStats;
  usdcxLendingStats: UsdcxLendingStats;
  usdcxSwapStats: UsdcxSwapStats;
  poolAllocation: PoolAllocation;
}

export interface UserLendingData {
  deposit: UserDeposit | null;
  collateral: UserCollateral | null;
  loan: UserLoan | null;
  loanStatus: LoanStatus;
  pendingRewards: number; // sats
  currentInterest: number; // microSTX
  participantInfo: ParticipantInfo | null;
  stxDeposit: UserStxDeposit | null;
  usdcxDeposit: UserUsdcxDeposit | null;
  usdcxLoan: UserUsdcxLoan | null;
}

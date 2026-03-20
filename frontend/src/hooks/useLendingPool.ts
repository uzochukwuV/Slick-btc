"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/contexts/WalletContext";
import type { LendingPoolData, UserLendingData } from "@/types/lending";
import {
  getProtocolStats,
  getFlashLoanStats,
  getSwapStats,
  getDualStackingStatus,
  getCycleInfo,
  getStxLendingStats,
  getUsdcxLendingStats,
  getUsdcxSwapStats,
  getPoolAllocation,
  getUserDeposit,
  getUserCollateral,
  getUserLoan,
  getLoanStatus,
  getCurrentInterest,
  getPendingRewards,
  getParticipantInfo,
  getUserStxDeposit,
  getUserUsdcxDeposit,
  getUserUsdcxLoan,
  ContractNotDeployedError,
} from "@/services/lendingPoolService";

const POOL_CONTRACT =
  process.env.NEXT_PUBLIC_LENDING_DEPLOYER_ADDRESS ||
  "ST219X1CZBCMQC37QC4GBYH8E1XW1X11EXNQ3SFWZ";

const DEFAULT_POOL_DATA: LendingPoolData = {
  protocolStats: {
    totalSbtcDeposits: 0,
    totalStxBorrowed: 0,
    totalStxAvailable: 0,
    stxPerSbtc: 4000,
    dualStackingEnrolled: false,
    protocolPaused: false,
  },
  flashLoanStats: {
    enabled: false,
    feeBps: 9,
    totalVolume: 0,
    totalFees: 0,
    availableLiquidity: 0,
  },
  swapStats: {
    enabled: false,
    feeBps: 100,
    totalVolumeSbtc: 0,
    totalVolumeStx: 0,
    totalFeesSbtc: 0,
    totalFeesStx: 0,
    sbtcReserve: 0,
    stxLiquidity: 0,
    price: 4000,
  },
  dualStackingStatus: {
    enrolled: false,
    totalRewards: 0,
    poolBalance: 0,
    eligibleForEnrollment: false,
  },
  cycleInfo: {
    cycleId: 0,
    snapshotCount: 0,
    totalRewards: 0,
    finalized: false,
  },
  stxLendingStats: {
    totalStxDeposited: 0,
    totalStxBorrowed: 0,
    totalStxAvailable: 0,
    utilizationBps: 0,
    interestRateBps: 500,
    totalShares: 0,
  },
  usdcxLendingStats: {
    totalUsdcxDeposited: 0,
    totalUsdcxBorrowed: 0,
    totalUsdcxAvailable: 0,
    utilizationBps: 0,
    interestRateBps: 400,
    totalShares: 0,
  },
  usdcxSwapStats: {
    swapEnabled: false,
    totalVolume: 0,
    totalFees: 0,
    sbtcUsdcxPrice: 4000,
    stxUsdcxPrice: 1000000,
  },
  poolAllocation: {
    stackingAllocationBps: 7000,
    liquidityAllocationBps: 3000,
    totalSbtc: 0,
    sbtcInStacking: 0,
    sbtcInLiquidity: 0,
  },
};

const DEFAULT_USER_DATA: UserLendingData = {
  deposit: null,
  collateral: null,
  loan: null,
  loanStatus: {
    principal: 0,
    interest: 0,
    totalDebtStx: 0,
    collateralSbtcSats: 0,
    collateralStxValue: 0,
    healthFactor: 0,
    isHealthy: true,
    dualStacking: false,
    stxPerSbtc: 4000,
  },
  pendingRewards: 0,
  currentInterest: 0,
  participantInfo: null,
  stxDeposit: null,
  usdcxDeposit: null,
  usdcxLoan: null,
};

export function useLendingPool() {
  const { address, isConnected } = useWallet();
  const [poolData, setPoolData] = useState<LendingPoolData>(DEFAULT_POOL_DATA);
  const [userData, setUserData] = useState<UserLendingData>(DEFAULT_USER_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    try {
      const protocolStats = await getProtocolStats();
const flashLoanStats = await getFlashLoanStats();
const swapStats = await getSwapStats();
const dualStackingStatus = await getDualStackingStatus();
const cycleInfo = await getCycleInfo();
const stxLendingStats = await getStxLendingStats();
const usdcxLendingStats = await getUsdcxLendingStats();
const usdcxSwapStats = await getUsdcxSwapStats();
const poolAllocation = await getPoolAllocation();
      setPoolData({ protocolStats, flashLoanStats, swapStats, dualStackingStatus, cycleInfo, stxLendingStats, usdcxLendingStats, usdcxSwapStats, poolAllocation });
    } catch (e) {
      console.error("Error fetching pool data:", e);
    }
  }, []);

  const fetchUserData = useCallback(async (user: string) => {
    try {
      const poolPrincipal = `${POOL_CONTRACT}.sbtc-lending-pool`;
      const [deposit, collateral, loan, loanStatus, pendingRewards, currentInterest, participantInfo, stxDeposit, usdcxDeposit, usdcxLoan] =
        await Promise.all([
          getUserDeposit(user),
          getUserCollateral(user),
          getUserLoan(user),
          getLoanStatus(user),
          getPendingRewards(user),
          getCurrentInterest(user),
          getParticipantInfo(poolPrincipal),
          getUserStxDeposit(user),
          getUserUsdcxDeposit(user),
          getUserUsdcxLoan(user),
        ]);
      setUserData({ deposit, collateral, loan, loanStatus, pendingRewards, currentInterest, participantInfo, stxDeposit, usdcxDeposit, usdcxLoan });
    } catch (e) {
      console.error("Error fetching user data:", e);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchPoolData();
      if (isConnected && address) await fetchUserData(address);
    } catch (e) {
      if (e instanceof ContractNotDeployedError) {
        setError("CONTRACT_NOT_DEPLOYED");
      } else {
        setError("Failed to fetch lending data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchPoolData, fetchUserData, isConnected, address]);

  // Initial load
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Poll every 30s
  useEffect(() => {
    const id = setInterval(refetch, 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  return { poolData, userData, isLoading, error, refetch };
}

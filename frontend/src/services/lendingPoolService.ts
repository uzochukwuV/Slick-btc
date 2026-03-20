import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  principalCV,
  contractPrincipalCV,
  PostConditionMode,
} from "@stacks/transactions";
import { openContractCall } from "@stacks/connect";
import { getNetwork } from "./walletService";
import type {
  ProtocolStats,
  FlashLoanStats,
  SwapStats,
  DualStackingStatus,
  CycleInfo,
  ParticipantInfo,
  UserDeposit,
  UserCollateral,
  UserLoan,
  LoanStatus,
  SwapQuote,
} from "@/types/lending";

const DEPLOYER =
  process.env.NEXT_PUBLIC_LENDING_DEPLOYER_ADDRESS ||
  "ST219X1CZBCMQC37QC4GBYH8E1XW1X11EXNQ3SFWZ";
const POOL_NAME =
  process.env.NEXT_PUBLIC_LENDING_POOL_CONTRACT || "sbtc-lending-pool";
const DUAL_STACKING_NAME =
  process.env.NEXT_PUBLIC_DUAL_STACKING_CONTRACT || "dual-stacking-mock";
const SBTC_CONTRACT =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT ||
  "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

// ─── Helpers ────────────────────────────────────────────────────────────────

export class ContractNotDeployedError extends Error {
  constructor() { super("CONTRACT_NOT_DEPLOYED"); }
}

// Simple delay helper to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry wrapper for rate-limited requests
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (retries > 0 && (msg.includes("429") || msg.includes("Failed to fetch"))) {
      console.warn(`Rate limited, retrying in ${delayMs}ms...`);
      await delay(delayMs);
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

async function readOnly(functionName: string, functionArgs: unknown[] = []) {
  const result = await withRetry(() => fetchCallReadOnlyFunction({
    contractAddress: DEPLOYER,
    contractName: POOL_NAME,
    functionName,
    functionArgs: functionArgs as Parameters<typeof fetchCallReadOnlyFunction>[0]["functionArgs"],
    network: getNetwork(),
    senderAddress: DEPLOYER,
  }));
  const json = cvToJSON(result);
  if (json?.type === "(err uint)" || String(json?.value).includes("NoSuchContract")) {
    throw new ContractNotDeployedError();
  }
  return result;
}

async function readOnlyDual(functionName: string, functionArgs: unknown[] = []) {
  try {
    const result = await withRetry(() => fetchCallReadOnlyFunction({
      contractAddress: DEPLOYER,
      contractName: DUAL_STACKING_NAME,
      functionName,
      functionArgs: functionArgs as Parameters<typeof fetchCallReadOnlyFunction>[0]["functionArgs"],
      network: getNetwork(),
      senderAddress: DEPLOYER,
    }));
    return result;
  } catch (error) {
    // Dual stacking calls are optional - fail gracefully
    console.warn(`Dual stacking call failed: ${functionName}`, error);
    return null;
  }
}

function uint(v: { value: unknown }): number {
  return parseInt(String(v.value));
}

function sbtcContractArgs() {
  const [addr, name] = SBTC_CONTRACT.split(".");
  return contractPrincipalCV(addr, name);
}

// ─── Protocol-level reads ────────────────────────────────────────────────────

export async function getPoolStatus(): Promise<ProtocolStats> {
  try {
    const r = await readOnly("get-pool-status");
    const v = cvToJSON(r).value;
    console.log(v)
    return {
      totalSbtcDeposits: uint(v.value["total-sbtc-deposits"]),
      totalStxBorrowed: uint(v.value["total-stx-borrowed"]),
      totalStxAvailable: uint(v.value["total-stx-available"]),
      stxPerSbtc: uint(v.value["stx-per-sbtc"]),
      dualStackingEnrolled: v["dual-stacking-enrolled"]?.value ?? false,
      protocolPaused: v["protocol-paused"]?.value ?? false,
    };
  } catch (e) {
    console.error("getPoolStatus error:", e);
    return {
      totalSbtcDeposits: 0,
      totalStxBorrowed: 0,
      totalStxAvailable: 0,
      stxPerSbtc: 4000,
      dualStackingEnrolled: false,
      protocolPaused: false,
    };
  }
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  return getPoolStatus();
}

export async function getFlashLoanStats(): Promise<FlashLoanStats> {
  try {
    const r = await readOnly("get-flash-loan-stats");
    const v = cvToJSON(r).value;
    return {
      enabled: v.value["enabled"] ?? false,
      feeBps: uint(v.value["fee-bps"]),
      totalVolume: uint(v.value["total-volume"]),
      totalFees: uint(v.value["total-fees"]),
      availableLiquidity: uint(v.value["available-liquidity"]),
    };
  } catch {
    return { enabled: false, feeBps: 9, totalVolume: 0, totalFees: 0, availableLiquidity: 0 };
  }
}

export async function getSwapStats(): Promise<SwapStats> {
  try {
    const r = await readOnly("get-swap-stats");
    const v = cvToJSON(r).value;
    console.log(v)
    return {
      enabled: v.value["enabled"] ?? false,
      feeBps: uint(v.value["fee-bps"]),
      totalVolumeSbtc: uint(v.value["total-volume-sbtc"]),
      totalVolumeStx: uint(v.value["total-volume-stx"]),
      totalFeesSbtc: uint(v.value["total-fees-sbtc"]),
      totalFeesStx: uint(v.value["total-fees-stx"]),
      sbtcReserve: uint(v.value["sbtc-reserve"]),
      stxLiquidity: uint(v.value["stx-liquidity"]),
      price: uint(v.value["price"]),
    };
  } catch {
    return {
      enabled: false,
      feeBps: 100,
      totalVolumeSbtc: 0,
      totalVolumeStx: 0,
      totalFeesSbtc: 0,
      totalFeesStx: 0,
      sbtcReserve: 0,
      stxLiquidity: 0,
      price: 4000,
    };
  }
}

export async function getDualStackingStatus(): Promise<DualStackingStatus> {
  try {
    const r = await readOnly("get-dual-stacking-status");
    const v = cvToJSON(r).value;
    return {
      enrolled: v.value["enrolled"] ?? false,
      totalRewards: uint(v.value["total-rewards"]),
      poolBalance: uint(v.value["pool-balance"]),
      eligibleForEnrollment: v["eligible-for-enrollment"]?.value ?? false,
    };
  } catch {
    return { enrolled: false, totalRewards: 0, poolBalance: 0, eligibleForEnrollment: false };
  }
}

export async function getStxPerSbtc(): Promise<number> {
  try {
    const r = await readOnly("get-stx-per-sbtc");
    return uint(cvToJSON(r));
  } catch {
    return 4000;
  }
}

export async function getFlashLoanFee(amount: number): Promise<number> {
  try {
    const r = await readOnly("get-flash-loan-fee", [uintCV(amount)]);
    return uint(cvToJSON(r).value);
  } catch {
    return 0;
  }
}

// ─── Swap quotes ─────────────────────────────────────────────────────────────

export async function getSwapQuoteSbtcToStx(sbtcAmount: number): Promise<SwapQuote> {
  try {
    const r = await readOnly("get-swap-quote-sbtc-to-stx", [uintCV(sbtcAmount)]);
    const v = cvToJSON(r).value;
    return {
      inputAmount: uint(v.value["input-sbtc"]),
      outputAmount: uint(v.value["output-stx"]),
      fee: uint(v.value["fee-stx"]),
      price: uint(v.value["price"]),
    };
  } catch {
    return { inputAmount: sbtcAmount, outputAmount: 0, fee: 0, price: 4000 };
  }
}

export async function getSwapQuoteStxToSbtc(stxAmount: number): Promise<SwapQuote> {
  try {
    const r = await readOnly("get-swap-quote-stx-to-sbtc", [uintCV(stxAmount)]);
    const v = cvToJSON(r).value;
    return {
      inputAmount: uint(v.value["input-stx"]),
      outputAmount: uint(v.value["output-sbtc"]),
      fee: uint(v.value["fee-sbtc"]),
      price: uint(v.value["price"]),
    };
  } catch {
    return { inputAmount: stxAmount, outputAmount: 0, fee: 0, price: 4000 };
  }
}

// ─── Dual Stacking reads ─────────────────────────────────────────────────────

export async function getCycleInfo(): Promise<CycleInfo> {
  try {
    const r = await readOnlyDual("get-cycle-info");
    if (!r) return { cycleId: 0, snapshotCount: 0, totalRewards: 0, finalized: false };
    const v = cvToJSON(r).value;
    return {
      cycleId: uint(v.value["cycle-id"]),
      snapshotCount: uint(v.value["snapshot-count"]),
      totalRewards: uint(v.value["total-rewards"]),
      finalized: v.value["finalized"] ?? false,
    };
  } catch {
    return { cycleId: 0, snapshotCount: 0, totalRewards: 0, finalized: false };
  }
}

export async function getParticipantInfo(
  participant: string
): Promise<ParticipantInfo | null> {
  try {
    const r = await readOnlyDual("get-participant-info", [
      principalCV(participant),
    ]);
    if (!r) return null;
    const json = cvToJSON(r);
    if (json.type?.includes("err")) return null;
    const v = json.value;
    return {
      enrolled: v.value["enrolled"] ?? false,
      rewardedAddress: v.value["rewarded-address"] ?? "",
      sbtcBalance: uint(v.value["sbtc-balance"]),
      stxRatio: uint(v.value["stx-ratio"]),
      lastCycleProcessed: uint(v.value["last-cycle-processed"]),
    };
  } catch {
    return null;
  }
}

// ─── User reads ──────────────────────────────────────────────────────────────

export async function getUserDeposit(
  user: string
): Promise<UserDeposit | null> {
  try {
    const r = await readOnly("get-user-deposit", [principalCV(user)]);
    const json = cvToJSON(r);
    
    const inner = json.value;
    
    const v = inner.value;
   
    return {
      amount: uint(v.value["amount"]),
      depositTime: uint(v.value["deposit-time"]),
      shares: uint(v.value["shares"]),
    };
  } catch {
    return null;
  }
}

export async function getUserCollateral(
  user: string
): Promise<UserCollateral | null> {
  try {
    const r = await readOnly("get-user-collateral", [principalCV(user)]);
    const json = cvToJSON(r);
    const inner = json.value;
    if (!inner || inner.type === "none") return null;
    const v = inner.value.value ?? inner;
    return {
      amount: uint(v.value["amount"]),
      asset: v.value["asset"] ?? "sBTC",
    };
  } catch {
    return null;
  }
}

export async function getUserLoan(user: string): Promise<UserLoan | null> {
  try {
    const r = await readOnly("get-user-loan", [principalCV(user)]);
    const json = cvToJSON(r);
    const inner = json.value;
    if (!inner || inner.type === "none") return null;
    const v = inner.value ?? inner;
    return {
      principalAmount: uint(v.value["principal-amount"]),
      interestAccrued: uint(v.value["interest-accrued"]),
      borrowTime: uint(v.value["borrow-time"]),
      lastInterestUpdate: uint(v.value["last-interest-update"]),
    };
  } catch {
    return null;
  }
}

export async function getLoanStatus(user: string): Promise<LoanStatus> {
  try {
    const r = await readOnly("get-loan-status", [principalCV(user)]);
    const v = cvToJSON(r).value;
    return {
      principal: uint(v.value["principal"]),
      interest: uint(v.value["interest"]),
      totalDebtStx: uint(v.value["total-debt-stx"]),
      collateralSbtcSats: uint(v.value["collateral-sbtc-sats"]),
      collateralStxValue: uint(v.value["collateral-stx-value"]),
      healthFactor: uint(v.value["health-factor"]),
      isHealthy: v.value["is-healthy"] ?? true,
      dualStacking: v.value["dual-stacking"] ?? false,
      stxPerSbtc: uint(v.value["stx-per-sbtc"]),
    };
  } catch {
    return {
      principal: 0,
      interest: 0,
      totalDebtStx: 0,
      collateralSbtcSats: 0,
      collateralStxValue: 0,
      healthFactor: 0,
      isHealthy: true,
      dualStacking: false,
      stxPerSbtc: 4000,
    };
  }
}

export async function getCurrentInterest(user: string): Promise<number> {
  try {
    const r = await readOnly("calculate-current-interest", [
      principalCV(user),
    ]);
    return uint(cvToJSON(r).value);
  } catch {
    return 0;
  }
}

export async function getPendingRewards(user: string): Promise<number> {
  try {
    const r = await readOnly("get-pending-rewards", [principalCV(user)]);
    return uint(cvToJSON(r).value);
  } catch {
    return 0;
  }
}

// ─── Write functions ─────────────────────────────────────────────────────────

type TxCallbacks = {
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
};

function write(
  functionName: string,
  functionArgs: unknown[],
  { onFinish, onCancel }: TxCallbacks
) {
  openContractCall({
    contractAddress: DEPLOYER,
    contractName: POOL_NAME,
    functionName,
    functionArgs: functionArgs as Parameters<typeof openContractCall>[0]["functionArgs"],
    postConditionMode: PostConditionMode.Allow,
    network: getNetwork(),
    onFinish: (data) => onFinish?.(data),
    onCancel: () => onCancel?.(),
  });
}

// Deposit sBTC
export function deposit(amount: number, cb: TxCallbacks) {
  write("deposit", [uintCV(amount), sbtcContractArgs()], cb);
}

// Withdraw sBTC
export function withdraw(amount: number, cb: TxCallbacks) {
  write("withdraw", [uintCV(amount), sbtcContractArgs()], cb);
}

// Add sBTC collateral
export function addCollateral(amount: number, cb: TxCallbacks) {
  write("add-collateral", [uintCV(amount), sbtcContractArgs()], cb);
}

// Withdraw sBTC collateral
export function withdrawCollateral(amount: number, cb: TxCallbacks) {
  write("withdraw-collateral", [uintCV(amount), sbtcContractArgs()], cb);
}

// Borrow STX (amount in microSTX)
export function borrow(amount: number, cb: TxCallbacks) {
  write("borrow", [uintCV(amount)], cb);
}

// Repay STX (amount in microSTX)
export function repay(amount: number, cb: TxCallbacks) {
  write("repay", [uintCV(amount)], cb);
}

// Liquidate unhealthy position
export function liquidate(borrower: string, repayAmount: number, cb: TxCallbacks) {
  write("liquidate", [principalCV(borrower), uintCV(repayAmount), sbtcContractArgs()], cb);
}

// Dual Stacking
export function enrollInDualStacking(cb: TxCallbacks) {
  write("enroll-in-dual-stacking", [], cb);
}

export function claimDualStackingRewards(cb: TxCallbacks) {
  write("claim-dual-stacking-rewards", [sbtcContractArgs()], cb);
}

export function claimUserRewards(cb: TxCallbacks) {
  write("claim-user-rewards", [sbtcContractArgs()], cb);
}

// Swap functions
export function swapSbtcForStx(sbtcAmount: number, cb: TxCallbacks) {
  write("swap-sbtc-for-stx", [uintCV(sbtcAmount), sbtcContractArgs()], cb);
}

export function swapStxForSbtc(stxAmount: number, cb: TxCallbacks) {
  write("swap-stx-for-sbtc", [uintCV(stxAmount), sbtcContractArgs()], cb);
}

// ─── STX Lending Functions ────────────────────────────────────────────────────

import type { StxLendingStats, StxLenderApy, UserStxDeposit } from "@/types/lending";

// Deposit STX to earn interest from borrowers
export function depositStx(amount: number, cb: TxCallbacks) {
  write("deposit-stx", [uintCV(amount)], cb);
}

// Withdraw STX from lending pool
export function withdrawStx(amount: number, cb: TxCallbacks) {
  write("withdraw-stx", [uintCV(amount)], cb);
}

// Get STX lending pool stats
export async function getStxLendingStats(): Promise<StxLendingStats> {
  try {
    const r = await readOnly("get-stx-lending-stats");
    const v = cvToJSON(r).value;
   
    return {
      totalStxDeposited: uint(v.value["total-stx-deposited"]),
      totalStxBorrowed: uint(v.value["total-stx-borrowed"]),
      totalStxAvailable: uint(v.value["total-stx-available"]),
      utilizationBps: uint(v.value["utilization-bps"]),
      interestRateBps: uint(v.value["interest-rate-bps"]),
      totalShares: uint(v.value["total-shares"]),
    };
  } catch {
    return {
      totalStxDeposited: 0,
      totalStxBorrowed: 0,
      totalStxAvailable: 0,
      utilizationBps: 0,
      interestRateBps: 500,
      totalShares: 0,
    };
  }
}

// Get estimated APY for STX lenders
export async function getStxLenderApy(): Promise<StxLenderApy> {
  try {
    const r = await readOnly("get-stx-lender-apy");
    const v = cvToJSON(r).value.value;
    console.log("getStxLenderApy value:", v);
    return {
      utilizationBps: uint(v.value["utilization-bps"]),
      borrowRateBps: uint(v.value["borrow-rate-bps"]),
      lenderApyBps: uint(v.value["lender-apy-bps"]),
    };
  } catch {
    return {
      utilizationBps: 0,
      borrowRateBps: 500,
      lenderApyBps: 0,
    };
  }
}

// Get user's STX deposit
export async function getUserStxDeposit(user: string): Promise<UserStxDeposit | null> {
  try {
    const r = await readOnly("get-user-stx-deposit", [principalCV(user)]);
    const json = cvToJSON(r);
    const inner = json.value;
    
    const v = inner.value;
    return {
      amount: uint(v.value["amount"]),
      shares: uint(v.value["shares"]),
      depositTime: uint(v.value["deposit-time"]),
    };
  } catch {
    return null;
  }
}

// ─── USDCx Lending Functions ──────────────────────────────────────────────────

import type {
  UsdcxLendingStats,
  UsdcxLenderApy,
  UserUsdcxDeposit,
  UserUsdcxLoan,
  UsdcxSwapStats,
  PoolAllocation,
} from "@/types/lending";

// USDCx token contract (testnet)
const USDCX_CONTRACT =
  process.env.NEXT_PUBLIC_USDCX_CONTRACT ||
  "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx-v1";

function usdcxContractArgs() {
  const [addr, name] = USDCX_CONTRACT.split(".");
  return contractPrincipalCV(addr, name);
}

// Deposit USDCx to earn interest
export function depositUsdcx(amount: number, cb: TxCallbacks) {
  write("deposit-usdcx", [uintCV(amount), usdcxContractArgs()], cb);
}

// Withdraw USDCx from lending pool
export function withdrawUsdcx(amount: number, cb: TxCallbacks) {
  write("withdraw-usdcx", [uintCV(amount), usdcxContractArgs()], cb);
}

// Borrow USDCx against sBTC collateral
export function borrowUsdcx(amount: number, cb: TxCallbacks) {
  write("borrow-usdcx", [uintCV(amount), usdcxContractArgs()], cb);
}

// Repay USDCx loan
export function repayUsdcx(amount: number, cb: TxCallbacks) {
  write("repay-usdcx", [uintCV(amount), usdcxContractArgs()], cb);
}

// Swap sBTC for USDCx
export function swapSbtcToUsdcx(sbtcAmount: number, cb: TxCallbacks) {
  write("swap-sbtc-to-usdcx", [uintCV(sbtcAmount), sbtcContractArgs(), usdcxContractArgs()], cb);
}

// Swap USDCx for sBTC
export function swapUsdcxToSbtc(usdcxAmount: number, cb: TxCallbacks) {
  write("swap-usdcx-to-sbtc", [uintCV(usdcxAmount), usdcxContractArgs(), sbtcContractArgs()], cb);
}

// Swap STX for USDCx
export function swapStxToUsdcx(stxAmount: number, cb: TxCallbacks) {
  write("swap-stx-to-usdcx", [uintCV(stxAmount), usdcxContractArgs()], cb);
}

// Swap USDCx for STX
export function swapUsdcxToStx(usdcxAmount: number, cb: TxCallbacks) {
  write("swap-usdcx-to-stx", [uintCV(usdcxAmount), usdcxContractArgs()], cb);
}

// Get USDCx lending stats
export async function getUsdcxLendingStats(): Promise<UsdcxLendingStats> {
  try {
    const r = await readOnly("get-usdcx-lending-stats");
    const v = cvToJSON(r).value;
    return {
      totalUsdcxDeposited: uint(v.value["total-usdcx-deposited"]),
      totalUsdcxBorrowed: uint(v.value["total-usdcx-borrowed"]),
      totalUsdcxAvailable: uint(v.value["total-usdcx-available"]),
      utilizationBps: uint(v.value["utilization-bps"]),
      interestRateBps: uint(v.value["interest-rate-bps"]),
      totalShares: uint(v.value["total-shares"]),
    };
  } catch {
    return {
      totalUsdcxDeposited: 0,
      totalUsdcxBorrowed: 0,
      totalUsdcxAvailable: 0,
      utilizationBps: 0,
      interestRateBps: 400,
      totalShares: 0,
    };
  }
}

// Get USDCx lender APY
export async function getUsdcxLenderApy(): Promise<UsdcxLenderApy> {
  try {
    const r = await readOnly("get-usdcx-lender-apy");
    const v = cvToJSON(r).value;
    return {
      utilizationBps: uint(v.value["utilization-bps"]),
      borrowRateBps: uint(v.value["borrow-rate-bps"]),
      lenderApyBps: uint(v.value["lender-apy-bps"]),
    };
  } catch {
    return {
      utilizationBps: 0,
      borrowRateBps: 400,
      lenderApyBps: 0,
    };
  }
}

// Get USDCx swap stats
export async function getUsdcxSwapStats(): Promise<UsdcxSwapStats> {
  try {
    const r = await readOnly("get-usdcx-swap-stats");
    const v = cvToJSON(r).value;
    return {
      swapEnabled: v["swap-enabled"]?.value ?? false,
      totalVolume: uint(v.value["total-volume"]),
      totalFees: uint(v.value["total-fees"]),
      sbtcUsdcxPrice: uint(v.value["sbtc-usdcx-price"]),
      stxUsdcxPrice: uint(v.value["stx-usdcx-price"]),
    };
  } catch {
    return {
      swapEnabled: false,
      totalVolume: 0,
      totalFees: 0,
      sbtcUsdcxPrice: 4000,
      stxUsdcxPrice: 1000000,
    };
  }
}

// Get pool allocation (stacking vs liquidity split)
export async function getPoolAllocation(): Promise<PoolAllocation> {
  try {
    const r = await readOnly("get-pool-allocation");
    const v = cvToJSON(r).value;
    return {
      stackingAllocationBps: uint(v.value["stacking-allocation-bps"]),
      liquidityAllocationBps: uint(v.value["liquidity-allocation-bps"]),
      totalSbtc: uint(v.value["total-sbtc"]),
      sbtcInStacking: uint(v.value["sbtc-in-stacking"]),
      sbtcInLiquidity: uint(v.value["sbtc-in-liquidity"]),
    };
  } catch {
    return {
      stackingAllocationBps: 7000,
      liquidityAllocationBps: 3000,
      totalSbtc: 0,
      sbtcInStacking: 0,
      sbtcInLiquidity: 0,
    };
  }
}

// Get user's USDCx deposit
export async function getUserUsdcxDeposit(user: string): Promise<UserUsdcxDeposit | null> {
  try {
    const r = await readOnly("get-user-usdcx-deposit", [principalCV(user)]);
    const json = cvToJSON(r);
    const inner = json.value;
    if (!inner || inner.type === "none") return null;
    const v = inner.value ?? inner;
    return {
      amount: uint(v.amount),
      shares: uint(v.shares),
      depositTime: uint(v.value["deposit-time"]),
    };
  } catch {
    return null;
  }
}

// Get user's USDCx loan
export async function getUserUsdcxLoan(user: string): Promise<UserUsdcxLoan | null> {
  try {
    const r = await readOnly("get-user-usdcx-loan", [principalCV(user)]);
    const json = cvToJSON(r);
    const inner = json.value;
    if (!inner || inner.type === "none") return null;
    const v = inner.value ?? inner;
    return {
      principalAmount: uint(v.value["principal-amount"]),
      interestAccrued: uint(v.value["interest-accrued"]),
      borrowTime: uint(v.value["borrow-time"]),
      lastInterestUpdate: uint(v.value["last-interest-update"]),
    };
  } catch {
    return null;
  }
}

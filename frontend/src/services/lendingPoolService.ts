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
  } catch (error: any) {
    // Check for rate limiting or network errors
    if (retries > 0 && (error?.message?.includes("429") || error?.message?.includes("Failed to fetch"))) {
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

function uint(v: any): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseInt(v, 10);
  if (v?.value !== undefined) return uint(v.value);
  return 0;
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
    return {
      totalSbtcDeposits: uint(v["total-sbtc-deposits"]),
      totalStxBorrowed: uint(v["total-stx-borrowed"]),
      totalStxAvailable: uint(v["total-stx-available"]),
      stxPerSbtc: uint(v["stx-per-sbtc"]),
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
      enabled: v.enabled?.value ?? false,
      feeBps: uint(v["fee-bps"]),
      totalVolume: uint(v["total-volume"]),
      totalFees: uint(v["total-fees"]),
      availableLiquidity: uint(v["available-liquidity"]),
    };
  } catch {
    return { enabled: false, feeBps: 9, totalVolume: 0, totalFees: 0, availableLiquidity: 0 };
  }
}

export async function getSwapStats(): Promise<SwapStats> {
  try {
    const r = await readOnly("get-swap-stats");
    const v = cvToJSON(r).value;
    return {
      enabled: v.enabled?.value ?? false,
      feeBps: uint(v["fee-bps"]),
      totalVolumeSbtc: uint(v["total-volume-sbtc"]),
      totalVolumeStx: uint(v["total-volume-stx"]),
      totalFeesSbtc: uint(v["total-fees-sbtc"]),
      totalFeesStx: uint(v["total-fees-stx"]),
      sbtcReserve: uint(v["sbtc-reserve"]),
      stxLiquidity: uint(v["stx-liquidity"]),
      price: uint(v.price),
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
      enrolled: v.enrolled?.value ?? false,
      totalRewards: uint(v["total-rewards"]),
      poolBalance: uint(v["pool-balance"]),
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
      inputAmount: uint(v["input-sbtc"]),
      outputAmount: uint(v["output-stx"]),
      fee: uint(v["fee-stx"]),
      price: uint(v.price),
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
      inputAmount: uint(v["input-stx"]),
      outputAmount: uint(v["output-sbtc"]),
      fee: uint(v["fee-sbtc"]),
      price: uint(v.price),
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
      cycleId: uint(v["cycle-id"]),
      snapshotCount: uint(v["snapshot-count"]),
      totalRewards: uint(v["total-rewards"]),
      finalized: v.finalized?.value ?? false,
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
      enrolled: v.enrolled?.value ?? false,
      rewardedAddress: v["rewarded-address"]?.value ?? "",
      sbtcBalance: uint(v["sbtc-balance"]),
      stxRatio: uint(v["stx-ratio"]),
      lastCycleProcessed: uint(v["last-cycle-processed"]),
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
    if (!inner || inner.type === "none") return null;
    const v = inner.value ?? inner;
    return {
      amount: uint(v.amount),
      depositTime: uint(v["deposit-time"]),
      shares: uint(v.shares),
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
    const v = inner.value ?? inner;
    return {
      amount: uint(v.amount),
      asset: v.asset?.value ?? "sBTC",
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
      principalAmount: uint(v["principal-amount"]),
      interestAccrued: uint(v["interest-accrued"]),
      borrowTime: uint(v["borrow-time"]),
      lastInterestUpdate: uint(v["last-interest-update"]),
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
      principal: uint(v.principal),
      interest: uint(v.interest),
      totalDebtStx: uint(v["total-debt-stx"]),
      collateralSbtcSats: uint(v["collateral-sbtc-sats"]),
      collateralStxValue: uint(v["collateral-stx-value"]),
      healthFactor: uint(v["health-factor"]),
      isHealthy: v["is-healthy"]?.value ?? true,
      dualStacking: v["dual-stacking"]?.value ?? false,
      stxPerSbtc: uint(v["stx-per-sbtc"]),
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
      totalStxDeposited: uint(v["total-stx-deposited"]),
      totalStxBorrowed: uint(v["total-stx-borrowed"]),
      totalStxAvailable: uint(v["total-stx-available"]),
      utilizationBps: uint(v["utilization-bps"]),
      interestRateBps: uint(v["interest-rate-bps"]),
      totalShares: uint(v["total-shares"]),
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
    const v = cvToJSON(r).value;
    return {
      utilizationBps: uint(v["utilization-bps"]),
      borrowRateBps: uint(v["borrow-rate-bps"]),
      lenderApyBps: uint(v["lender-apy-bps"]),
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
    if (!inner || inner.type === "none") return null;
    const v = inner.value ?? inner;
    return {
      amount: uint(v.amount),
      shares: uint(v.shares),
      depositTime: uint(v["deposit-time"]),
    };
  } catch {
    return null;
  }
}

"use client";

import { useLendingPool } from "@/hooks/useLendingPool";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wallet, AlertTriangle } from "lucide-react";
import { CollateralPanel } from "./CollateralPanel";
import { LoanPanel } from "./LoanPanel";

export function BorrowInterface() {
  const { poolData, userData, isLoading, error, refetch } = useLendingPool();

  const SAT = 100_000_000;
  const MICRO_STX = 1_000_000;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Borrow</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Deposit sBTC as collateral to borrow STX at 150% collateralization
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">STX Available</p>
          <p className="text-xl font-mono font-bold mt-1">
            {(poolData.protocolStats.totalStxAvailable / MICRO_STX).toFixed(2)} STX
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Borrowed</p>
          <p className="text-xl font-mono font-bold mt-1">
            {(poolData.protocolStats.totalStxBorrowed / MICRO_STX).toFixed(2)} STX
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Collateral</p>
          <p className="text-xl font-mono font-bold mt-1">
            {userData.collateral ? (userData.collateral.amount / SAT).toFixed(8) : "0"} sBTC
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Debt</p>
          <p className="text-xl font-mono font-bold mt-1 flex items-center gap-2">
            {userData.loan ? (
              <>
                {(userData.loanStatus.totalDebtStx / MICRO_STX).toFixed(2)} STX
                {!userData.loanStatus.isHealthy && (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                )}
              </>
            ) : (
              <span className="text-muted-foreground">0 STX</span>
            )}
          </p>
        </div>
      </div>

      {/* Price info */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Current price: <span className="font-mono font-medium">{poolData.protocolStats.stxPerSbtc}</span> microSTX per sat
          {" "}({((poolData.protocolStats.stxPerSbtc * SAT) / MICRO_STX).toFixed(0)} STX per sBTC)
        </p>
      </div>

      {error === "CONTRACT_NOT_DEPLOYED" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-600 dark:text-yellow-400">Contract not deployed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deploy the lending pool contract to testnet first.
          </p>
        </div>
      )}

      {poolData.protocolStats.totalStxAvailable === 0 && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-600 dark:text-yellow-400">No STX Liquidity</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The admin needs to fund the STX pool before borrowing is available.
            You can still add collateral in preparation.
          </p>
        </div>
      )}

      {isLoading && !poolData.protocolStats.totalSbtcDeposits ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Collateral Management */}
          <CollateralPanel
            userData={userData}
            stxAvailable={poolData.protocolStats.totalStxAvailable}
            onRefetch={refetch}
          />

          {/* Borrow & Repay */}
          <LoanPanel
            userData={userData}
            stxAvailable={poolData.protocolStats.totalStxAvailable}
            onRefetch={refetch}
          />
        </div>
      )}
    </div>
  );
}

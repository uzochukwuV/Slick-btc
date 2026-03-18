"use client";

import { useLendingPool } from "@/hooks/useLendingPool";
import { useWallet } from "@/contexts/WalletContext";
import { DepositPanel } from "@/components/lending/DepositPanel";
import { DualStackingPanel } from "@/components/lending/DualStackingPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, Shield } from "lucide-react";

const ADMIN_ADDRESS = process.env.NEXT_PUBLIC_LENDING_DEPLOYER_ADDRESS || "";

export function EarnInterface() {
  const { poolData, userData, isLoading, error, refetch } = useLendingPool();
  const { address } = useWallet();

  const isAdmin = !!address && address === ADMIN_ADDRESS;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold">Earn</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Deposit sBTC to earn interest from borrowers + dual stacking rewards
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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Deposits</p>
          <p className="text-xl font-mono font-bold mt-1">
            {(poolData.protocolStats.totalSbtcDeposits / 100_000_000).toFixed(4)} sBTC
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Deposit</p>
          <p className="text-xl font-mono font-bold mt-1">
            {userData.deposit ? (userData.deposit.amount / 100_000_000).toFixed(8) : "0"} sBTC
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Dual Stacking</p>
          <p className="text-xl font-mono font-bold mt-1 flex items-center gap-2">
            {poolData.dualStackingStatus.enrolled ? (
              <>
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-green-500">Active</span>
              </>
            ) : (
              <span className="text-muted-foreground">Not Enrolled</span>
            )}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Rewards</p>
          <p className="text-xl font-mono font-bold mt-1 text-green-500">
            {(userData.pendingRewards / 100_000_000).toFixed(8)} sBTC
          </p>
        </div>
      </div>

      {error === "CONTRACT_NOT_DEPLOYED" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-600 dark:text-yellow-400">Contract not deployed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deploy the lending pool contract to testnet first.
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
          {/* Deposit & Withdraw */}
          <DepositPanel userData={userData} onRefetch={refetch} />

          {/* Dual Stacking Rewards */}
          <DualStackingPanel
            poolData={poolData}
            userData={userData}
            isAdmin={isAdmin}
            onRefetch={refetch}
          />
        </div>
      )}
    </div>
  );
}

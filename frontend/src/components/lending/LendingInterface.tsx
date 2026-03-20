"use client";

import Link from "next/link";
import { useLendingPool } from "@/hooks/useLendingPool";
import { useWallet } from "@/contexts/WalletContext";
import { ProtocolStatsBar } from "./ProtocolStatsBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, TrendingUp, Wallet, ArrowRight, Zap } from "lucide-react";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;

export function LendingInterface() {
  const { poolData, userData, isLoading, error, refetch } = useLendingPool();
  useWallet();

  return (
    <div className="space-y-0">
      {/* Protocol Stats Bar */}
      <ProtocolStatsBar data={poolData} />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">sBTC Lending Pool</h1>
            <p className="text-sm text-muted-foreground">
              Deposit sBTC to earn yield, or borrow STX against your collateral
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

        {error === "CONTRACT_NOT_DEPLOYED" && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">Contract not deployed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <code className="font-mono">{process.env.NEXT_PUBLIC_LENDING_DEPLOYER_ADDRESS}.{process.env.NEXT_PUBLIC_LENDING_POOL_CONTRACT}</code>{" "}
              was not found on {process.env.NEXT_PUBLIC_NETWORK || "testnet"}.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Quick Actions Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Earn Card */}
              <Card className="hover:border-green-500/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Earn Yield
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Deposit sBTC to earn interest from borrowers + dual stacking rewards
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Deposit</span>
                      <span className="font-mono">
                        {userData.deposit ? (userData.deposit.amount / SAT).toFixed(4) : "0"} sBTC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pending Rewards</span>
                      <span className="font-mono text-green-500">
                        {(userData.pendingRewards / SAT).toFixed(8)} sBTC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dual Stacking</span>
                      <span className={poolData.dualStackingStatus.enrolled ? "text-green-500" : "text-muted-foreground"}>
                        {poolData.dualStackingStatus.enrolled ? "Active" : "Not Enrolled"}
                      </span>
                    </div>
                  </div>
                  <Link href="/earn">
                    <Button className="w-full gap-2">
                      Go to Earn
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Borrow Card */}
              <Card className="hover:border-blue-500/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-500" />
                    Borrow STX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Deposit sBTC as collateral to borrow STX at 150% collateralization
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Collateral</span>
                      <span className="font-mono">
                        {userData.collateral ? (userData.collateral.amount / SAT).toFixed(4) : "0"} sBTC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Debt</span>
                      <span className="font-mono">
                        {(userData.loanStatus.totalDebtStx / MICRO_STX).toFixed(2)} STX
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Health Factor</span>
                      <span className={`font-mono ${userData.loanStatus.isHealthy ? "text-green-500" : "text-destructive"}`}>
                        {userData.loan ? `${userData.loanStatus.healthFactor}%` : "—"}
                      </span>
                    </div>
                  </div>
                  <Link href="/borrow">
                    <Button variant="outline" className="w-full gap-2">
                      Go to Borrow
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Flash Loans Card */}
              <Card className="hover:border-purple-500/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    Flash Loans
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Borrow sBTC with no collateral - repay in same transaction
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Liquidity</span>
                      <span className="font-mono">
                        {(poolData.flashLoanStats.availableLiquidity / SAT).toFixed(4)} sBTC
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fee</span>
                      <span className="font-mono">
                        {(poolData.flashLoanStats.feeBps / 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Volume</span>
                      <span className="font-mono">
                        {(poolData.flashLoanStats.totalVolume / SAT).toFixed(4)} sBTC
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-full" disabled>
                    For Developers
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Protocol Overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total sBTC Deposits</p>
                <p className="text-xl font-mono font-bold mt-1">
                  {(poolData.protocolStats.totalSbtcDeposits / SAT).toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total STX Borrowed</p>
                <p className="text-xl font-mono font-bold mt-1">
                  {(poolData.protocolStats.totalStxBorrowed / MICRO_STX).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">STX Available</p>
                <p className="text-xl font-mono font-bold mt-1">
                  {(poolData.protocolStats.totalStxAvailable / MICRO_STX).toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">sBTC/STX Price</p>
                <p className="text-xl font-mono font-bold mt-1">
                  {((poolData.protocolStats.stxPerSbtc * SAT) / MICRO_STX).toFixed(0)} STX
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

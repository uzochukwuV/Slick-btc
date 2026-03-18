"use client";

import { useState } from "react";
import { useLendingPool } from "@/hooks/useLendingPool";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw,
  Coins,
  TrendingUp,
  Percent,
  ArrowDown,
  ArrowUp,
  Info,
  Users,
} from "lucide-react";
import { depositStx, withdrawStx } from "@/services/lendingPoolService";

const MICRO_STX = 1_000_000;

const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);

export function LendStxInterface() {
  const { poolData, userData, isLoading, error, refetch } = useLendingPool();
  const { isConnected, connect } = useWallet();
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const { stxLendingStats } = poolData;
  const { stxDeposit } = userData;

  // Calculate APY
  const utilizationPercent = stxLendingStats.utilizationBps / 100;
  const borrowApr = stxLendingStats.interestRateBps / 100;
  const lenderApy = (borrowApr * utilizationPercent) / 100;

  const cb = (label: string) => ({
    onFinish: (d: { txId: string }) => {
      console.log(`${label} tx:`, d.txId);
      setPending(null);
      setTimeout(refetch, 50000);
    },
    onCancel: () => setPending(null),
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold">Lend STX</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Deposit STX to earn interest from borrowers
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

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Lender APY
            </div>
            <p className="text-2xl font-mono font-bold mt-1 text-green-500">
              {lenderApy.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Percent className="h-4 w-4" />
              Utilization
            </div>
            <p className="text-2xl font-mono font-bold mt-1">
              {utilizationPercent.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Total Deposited
            </div>
            <p className="text-2xl font-mono font-bold mt-1">
              {fmtStx(stxLendingStats.totalStxDeposited)} STX
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Coins className="h-4 w-4" />
              Your Deposit
            </div>
            <p className="text-2xl font-mono font-bold mt-1">
              {stxDeposit ? fmtStx(stxDeposit.amount) : "0"} STX
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pool Utilization */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Pool Utilization</span>
            <span className="text-sm font-mono">{utilizationPercent.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationPercent} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Available: {fmtStx(stxLendingStats.totalStxAvailable)} STX</span>
            <span>Borrowed: {fmtStx(stxLendingStats.totalStxBorrowed)} STX</span>
          </div>
        </CardContent>
      </Card>

      {error === "CONTRACT_NOT_DEPLOYED" && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-yellow-600 dark:text-yellow-400">Contract not deployed</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Deploy the lending pool contract to testnet first.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Deposit Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDown className="h-5 w-5 text-green-500" />
                Deposit STX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your wallet to deposit STX
                  </p>
                  <Button onClick={connect} className="w-full">Connect Wallet</Button>
                </div>
              ) : (
                <>
                  {/* How it works */}
                  <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">How it works:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Deposit STX to the lending pool</li>
                          <li>sBTC holders borrow your STX</li>
                          <li>Earn {borrowApr}% APR on borrowed funds</li>
                          <li>Current APY: {lenderApy.toFixed(2)}% based on utilization</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount in STX"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        min="0"
                        step="0.000001"
                      />
                      <Button
                        disabled={!depositAmt || pending === "deposit"}
                        onClick={() => {
                          setPending("deposit");
                          depositStx(toMicroStx(depositAmt), cb("deposit-stx"));
                        }}
                      >
                        {pending === "deposit" ? "Depositing…" : "Deposit"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Withdraw Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUp className="h-5 w-5 text-blue-500" />
                Withdraw STX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your wallet to withdraw STX
                  </p>
                  <Button onClick={connect} className="w-full">Connect Wallet</Button>
                </div>
              ) : !stxDeposit ? (
                <div className="text-center py-8">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    You don't have any STX deposited yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Deposit STX to start earning interest.
                  </p>
                </div>
              ) : (
                <>
                  {/* Current Position */}
                  <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Deposit</span>
                      <span className="font-mono font-medium">{fmtStx(stxDeposit.amount)} STX</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Shares</span>
                      <span className="font-mono">{stxDeposit.shares}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Since</span>
                      <span className="font-mono">
                        {new Date(stxDeposit.depositTime * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Amount in STX"
                        value={withdrawAmt}
                        onChange={(e) => setWithdrawAmt(e.target.value)}
                        min="0"
                        step="0.000001"
                        max={fmtStx(stxDeposit.amount)}
                      />
                      <Button
                        variant="outline"
                        disabled={!withdrawAmt || pending === "withdraw"}
                        onClick={() => {
                          setPending("withdraw");
                          withdrawStx(toMicroStx(withdrawAmt), cb("withdraw-stx"));
                        }}
                      >
                        {pending === "withdraw" ? "Withdrawing…" : "Withdraw"}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setWithdrawAmt(fmtStx(stxDeposit.amount))}
                    >
                      Withdraw all ({fmtStx(stxDeposit.amount)} STX)
                    </Button>
                    {stxLendingStats.totalStxAvailable < stxDeposit.amount && (
                      <p className="text-xs text-yellow-500 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Some funds are currently borrowed. Max withdraw: {fmtStx(stxLendingStats.totalStxAvailable)} STX
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* APY Explanation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium">How APY is Calculated</h3>
              <p className="text-sm text-muted-foreground">
                Borrowers pay <span className="font-mono">{borrowApr}%</span> APR on their loans.
                Your actual yield depends on pool utilization:
              </p>
              <div className="text-sm space-y-1">
                <p><span className="font-mono">Lender APY = Borrow APR × Utilization Rate</span></p>
                <p className="text-muted-foreground">
                  Current: <span className="font-mono">{borrowApr}%</span> × <span className="font-mono">{utilizationPercent.toFixed(1)}%</span> = <span className="font-mono text-green-500">{lenderApy.toFixed(2)}%</span> APY
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

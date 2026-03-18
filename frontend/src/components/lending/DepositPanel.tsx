"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import { deposit, withdraw, claimUserRewards } from "@/services/lendingPoolService";
import type { UserLendingData } from "@/types/lending";

const SAT = 100_000_000;
const fmt = (sats: number) => (sats / SAT).toFixed(8);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);

interface Props {
  userData: UserLendingData;
  onRefetch: () => void;
}

export function DepositPanel({ userData, onRefetch }: Props) {
  const { isConnected, connect } = useWallet();
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const { deposit: dep, pendingRewards, participantInfo } = userData;

  const cb = (label: string) => ({
    onFinish: (d: { txId: string }) => {
      console.log(`${label} tx:`, d.txId);
      setPending(null);
      setTimeout(onRefetch, 30000);
    },
    onCancel: () => setPending(null),
  });

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deposit sBTC</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} className="w-full">Connect Wallet</Button>
        </CardContent>
      </Card>
    );
  }

  const sharesToBurn = dep && depositAmt
    ? dep.shares > 0 && dep.amount > 0
      ? ((toSats(withdrawAmt) / dep.amount) * dep.shares).toFixed(2)
      : "0"
    : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deposit sBTC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current position */}
        {dep ? (
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposited</span>
              <span className="font-mono">{fmt(dep.amount)} sBTC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pool Shares</span>
              <span className="font-mono">{dep.shares}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Since</span>
              <span className="font-mono">
                {new Date(dep.depositTime * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active deposit.</p>
        )}

        {/* Dual stacking snapshot info */}
        {participantInfo && (
          <>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Dual Stacking Snapshot
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Snapshot Balance</span>
                <span className="font-mono">{fmt(participantInfo.sbtcBalance)} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STX Ratio</span>
                <span className="font-mono">{participantInfo.stxRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Cycle Processed</span>
                <span className="font-mono">{participantInfo.lastCycleProcessed}</span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Pending rewards */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Claimable Rewards</p>
            <p className="text-xs text-muted-foreground font-mono">{fmt(pendingRewards)} sBTC</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pendingRewards === 0 || pending === "claim"}
            onClick={() => {
              setPending("claim");
              claimUserRewards(cb("claim-user-rewards"));
            }}
          >
            {pending === "claim" ? "Claiming…" : "Claim"}
          </Button>
        </div>

        <Separator />

        {/* Deposit form */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deposit</p>
          {dep && (
            <p className="text-xs text-blue-500">
              Pool will auto-enroll in Dual Stacking once 0.001 sBTC threshold is reached.
            </p>
          )}
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount in sBTC"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
              min="0"
              step="0.00000001"
            />
            <Button
              disabled={!depositAmt || pending === "deposit"}
              onClick={() => {
                setPending("deposit");
                deposit(toSats(depositAmt), cb("deposit"));
              }}
            >
              {pending === "deposit" ? "Depositing…" : "Deposit"}
            </Button>
          </div>
        </div>

        {/* Withdraw form */}
        {dep && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Withdraw</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount in sBTC"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                max={fmt(dep.amount)}
                min="0"
                step="0.00000001"
              />
              <Button
                variant="outline"
                disabled={!withdrawAmt || pending === "withdraw"}
                onClick={() => {
                  setPending("withdraw");
                  withdraw(toSats(withdrawAmt), cb("withdraw"));
                }}
              >
                {pending === "withdraw" ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
            {withdrawAmt && (
              <p className="text-xs text-muted-foreground">
                Shares to burn: <span className="font-mono">{sharesToBurn}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

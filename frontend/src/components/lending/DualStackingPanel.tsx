"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import {
  enrollInDualStacking,
  claimDualStackingRewards,
  claimUserRewards,
} from "@/services/lendingPoolService";
import type { LendingPoolData, UserLendingData } from "@/types/lending";

const SAT = 100_000_000;
const MIN_ENROLL_SATS = 100_000; // 0.001 sBTC
const fmt = (sats: number) => (sats / SAT).toFixed(8);

interface Props {
  poolData: LendingPoolData;
  userData: UserLendingData;
  isAdmin?: boolean;
  onRefetch: () => void;
}

export function DualStackingPanel({ poolData, userData, isAdmin }: Props) {
  const { isConnected, connect } = useWallet();
  const [pending, setPending] = useState<string | null>(null);

  const { dualStackingStatus, cycleInfo } = poolData;
  const { pendingRewards, participantInfo } = userData;

  const enrollProgress = Math.min(
    (dualStackingStatus.poolBalance / MIN_ENROLL_SATS) * 100,
    100
  );

  // Boost = 1 + (10 × √stx-ratio)  — stx-ratio stored as integer, treat as fraction /1e6
  const stxRatioFraction = participantInfo
    ? participantInfo.stxRatio / 1_000_000
    : 0;
  const boost = participantInfo
    ? (1 + 10 * Math.sqrt(stxRatioFraction)).toFixed(2)
    : "1.00";

  const cb = (label: string) => ({
    onFinish: (d: { txId: string }) => {
      console.log(`${label} tx:`, d.txId);
      setPending(null);
      // setTimeout(onRefetch, 200000);
    },
    onCancel: () => setPending(null),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Dual Stacking</CardTitle>
          <Badge variant={dualStackingStatus.enrolled ? "default" : "secondary"}>
            {dualStackingStatus.enrolled ? "Enrolled" : "Not Enrolled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enrollment progress */}
        {!dualStackingStatus.enrolled && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Pool balance toward enrollment threshold</span>
              <span className="font-mono">
                {fmt(dualStackingStatus.poolBalance)} / 0.00100000 sBTC
              </span>
            </div>
            <Progress value={enrollProgress} className="h-2" />
          </div>
        )}

        {/* Pool stats */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pool Balance</span>
            <span className="font-mono">{fmt(dualStackingStatus.poolBalance)} sBTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lifetime Rewards</span>
            <span className="font-mono">{fmt(dualStackingStatus.totalRewards)} sBTC</span>
          </div>
        </div>

        <Separator />

        {/* Cycle info */}
        <div className="space-y-1.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Current Cycle
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cycle #</span>
            <span className="font-mono">{cycleInfo.cycleId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cycle Rewards</span>
            <span className="font-mono">{fmt(cycleInfo.totalRewards)} sBTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={cycleInfo.finalized ? "default" : "secondary"} className="text-xs">
              {cycleInfo.finalized ? "Finalized" : "In Progress"}
            </Badge>
          </div>
        </div>

        {/* Participant snapshot info */}
        {participantInfo && (
          <>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Snapshot Data
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Snapshot Balance</span>
                <span className="font-mono">{fmt(participantInfo.sbtcBalance)} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STX Ratio</span>
                <span className="font-mono">{participantInfo.stxRatio}</span>
              </div>
            </div>

            {/* Boost formula */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium">Boost Formula</p>
              <p className="text-xs font-mono text-muted-foreground">
                Boost = 1 + (10 × √stx-ratio)
              </p>
              <p className="text-sm font-bold">
                Estimated Boost:{" "}
                <span className="text-primary">{boost}×</span>
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* User pending rewards */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Your Pending Rewards</p>
              <p className="text-xs font-mono text-muted-foreground">
                {fmt(pendingRewards)} sBTC
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pendingRewards === 0 || pending === "claim-user"}
              onClick={() => {
                setPending("claim-user");
                claimUserRewards(cb("claim-user-rewards"));
              }}
            >
              {pending === "claim-user" ? "Claiming…" : "Claim"}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {/* Admin: enroll */}
          {isAdmin && !dualStackingStatus.enrolled && dualStackingStatus.eligibleForEnrollment && (
            <Button
              disabled={pending === "enroll"}
              onClick={() => {
                setPending("enroll");
                enrollInDualStacking(cb("enroll-in-dual-stacking"));
              }}
            >
              {pending === "enroll" ? "Enrolling…" : "Enroll Pool in Dual Stacking"}
            </Button>
          )}

          {/* Anyone: claim pool-level rewards after cycle finalized */}
          <Button
            variant="outline"
            disabled={!dualStackingStatus.enrolled || !cycleInfo.finalized || pending === "claim-pool"}
            onClick={() => {
              setPending("claim-pool");
              claimDualStackingRewards(cb("claim-dual-stacking-rewards"));
            }}
          >
            {pending === "claim-pool" ? "Distributing…" : "Distribute Cycle Rewards"}
          </Button>
        </div>

        {!isConnected && (
          <Button variant="ghost" className="w-full" onClick={connect}>
            Connect Wallet to Claim
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

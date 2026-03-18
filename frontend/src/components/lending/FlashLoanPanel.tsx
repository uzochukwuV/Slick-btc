"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Zap, RefreshCw, ShieldCheck } from "lucide-react";
import { getFlashLoanFee } from "@/services/lendingPoolService";
import type { FlashLoanStats } from "@/types/lending";

const SAT = 100_000_000;
const fmt = (sats: number) => (sats / SAT).toFixed(8);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);

const USE_CASES = [
  {
    icon: Zap,
    title: "Arbitrage",
    description:
      "Borrow sBTC, buy low on DEX A, sell high on DEX B, repay loan + fee in one atomic transaction.",
  },
  {
    icon: ShieldCheck,
    title: "Self-Liquidation",
    description:
      "Repay your own undercollateralized loan to avoid the 10% liquidation penalty from external liquidators.",
  },
  {
    icon: RefreshCw,
    title: "Collateral Swap",
    description:
      "Atomically swap STX collateral to sBTC collateral without closing your position.",
  },
];

interface Props {
  stats: FlashLoanStats;
}

export function FlashLoanPanel({ stats }: Props) {
  const [calcAmt, setCalcAmt] = useState("");
  const [calcFee, setCalcFee] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  async function handleCalc() {
    const sats = toSats(calcAmt);
    if (!sats) return;
    setCalcLoading(true);
    const fee = await getFlashLoanFee(sats);
    setCalcFee(fee);
    setCalcLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Flash Loans</CardTitle>
          <Badge variant={stats.enabled ? "default" : "destructive"}>
            {stats.enabled ? "Active" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Fee Rate</p>
            <p className="font-mono font-medium">{stats.feeBps} bps (0.09%)</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Available Liquidity</p>
            <p className="font-mono font-medium">{fmt(stats.availableLiquidity)} sBTC</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">All-time Volume</p>
            <p className="font-mono font-medium">{fmt(stats.totalVolume)} sBTC</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Fees Earned by Pool</p>
            <p className="font-mono font-medium">{fmt(stats.totalFees)} sBTC</p>
          </div>
        </div>

        <Separator />

        {/* Fee calculator */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Fee Calculator
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount to borrow (sBTC)"
              value={calcAmt}
              onChange={(e) => {
                setCalcAmt(e.target.value);
                setCalcFee(null);
              }}
              min="0"
              step="0.00000001"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!calcAmt || calcLoading}
              onClick={handleCalc}
            >
              {calcLoading ? "…" : "Calc"}
            </Button>
          </div>
          {calcFee !== null && calcAmt && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Borrow Amount</span>
                <span className="font-mono">{fmt(toSats(calcAmt))} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (0.09%)</span>
                <span className="font-mono">{fmt(calcFee)} sBTC</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total to Repay</span>
                <span className="font-mono">{fmt(toSats(calcAmt) + calcFee)} sBTC</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Use case cards */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Use Cases
          </p>
          {USE_CASES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 rounded-lg border p-3"
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <a
          href="https://docs.stacks.co/reference/clarity/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Build on Flash Loans — Clarity Docs
        </a>
      </CardContent>
    </Card>
  );
}

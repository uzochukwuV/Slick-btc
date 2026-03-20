"use client";

import type { LendingPoolData } from "@/types/lending";
import { Badge } from "@/components/ui/badge";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;

const fmtSats = (sats: number) => (sats / SAT).toFixed(6);
const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(2);

interface Props {
  data: LendingPoolData;
}

export function ProtocolStatsBar({ data }: Props) {
  const { protocolStats, dualStackingStatus } = data;

  const utilizationRate = protocolStats.totalStxAvailable > 0
    ? (protocolStats.totalStxBorrowed / (protocolStats.totalStxAvailable + protocolStats.totalStxBorrowed)) * 100
    : 0;

  const stats = [
    { label: "sBTC Deposits", value: `${fmtSats(protocolStats.totalSbtcDeposits)} sBTC` },
    { label: "STX Borrowed", value: `${fmtStx(protocolStats.totalStxBorrowed)} STX` },
    { label: "STX Available", value: `${fmtStx(protocolStats.totalStxAvailable)} STX` },
    { label: "Utilization", value: `${utilizationRate.toFixed(1)}%` },
    { label: "Price", value: `${protocolStats.stxPerSbtc} μSTX/sat` },
    { label: "Dual Stacking", value: dualStackingStatus.enrolled ? "Active" : "Inactive", badge: true },
  ];

  return (
    <div className="w-full border-b bg-muted/30">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              {s.badge ? (
                <Badge variant={s.value === "Active" ? "default" : "secondary"} className="text-xs">
                  {s.value}
                </Badge>
              ) : (
                <span className="font-mono font-medium">{s.value}</span>
              )}
            </div>
          ))}
          {protocolStats.protocolPaused && (
            <Badge variant="destructive" className="animate-pulse">
              Protocol Paused
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Props {
  healthFactor: number;
}

export function HealthFactorGauge({ healthFactor }: Props) {
  const isZero = healthFactor === 0;
  const isSafe = healthFactor >= 150;
  const isWarning = healthFactor >= 120 && healthFactor < 150;
  const isDanger = healthFactor > 0 && healthFactor < 120;

  const label = isZero ? "No Loan" : isSafe ? "Safe" : isWarning ? "Warning" : "Liquidatable";
  const color = isZero
    ? "text-muted-foreground"
    : isSafe
    ? "text-green-500"
    : isWarning
    ? "text-yellow-500"
    : "text-red-500";

  // Clamp fill: 0–200 range mapped to 0–100%
  const fillPct = isZero ? 0 : Math.min((healthFactor / 200) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Health Factor</span>
        <span className={cn("font-bold text-lg", color)}>
          {isZero ? "—" : healthFactor}
        </span>
      </div>

      {/* Bar */}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isSafe ? "bg-green-500" : isWarning ? "bg-yellow-500" : isDanger ? "bg-red-500" : "bg-muted"
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="text-red-500">120 Liq.</span>
        <span className="text-yellow-500">150 Safe</span>
        <span className="text-green-500">200+</span>
      </div>

      <div className={cn("text-xs font-medium", color)}>{label}</div>

      {isDanger && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Position is below liquidation threshold. Repay or add collateral immediately.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import { addCollateral, withdrawCollateral } from "@/services/lendingPoolService";
import { HealthFactorGauge } from "@/components/lending/HealthFactorGauge";
import type { UserLendingData } from "@/types/lending";
import { Shield, Plus, Minus } from "lucide-react";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;

const fmtSats = (sats: number) => (sats / SAT).toFixed(8);
const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);

interface Props {
  userData: UserLendingData;
  stxAvailable: number;
  onRefetch: () => void;
}

export function CollateralPanel({ userData }: Props) {
  const { isConnected, connect } = useWallet();
  const [addAmt, setAddAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const { collateral, loan, loanStatus } = userData;

  const cb = (label: string) => ({
    onFinish: (d: { txId: string }) => {
      console.log(`${label} tx:`, d.txId);
      setPending(null);
      // setTimeout(onRefetch, 200000);
    },
    onCancel: () => setPending(null),
  });

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Collateral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to manage collateral
          </p>
          <Button onClick={connect} className="w-full">Connect Wallet</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Collateral (sBTC)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Factor */}
        {loan && <HealthFactorGauge healthFactor={loanStatus.healthFactor} />}

        {/* Current Position */}
        <div className="rounded-lg bg-muted/40 p-4 space-y-2">
          {collateral ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Collateral Deposited</span>
                <span className="font-mono font-medium">{fmtSats(collateral.amount)} sBTC</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value in STX</span>
                <span className="font-mono">{fmtStx(loanStatus.collateralStxValue)} STX</span>
              </div>
              {loan && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Health Factor</span>
                  <span className={`font-mono font-medium ${loanStatus.isHealthy ? "text-green-500" : "text-destructive"}`}>
                    {loanStatus.healthFactor}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No collateral deposited yet. Add sBTC collateral to borrow STX.
            </p>
          )}
        </div>

        <Separator />

        {/* Add Collateral */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Add Collateral
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount in sBTC"
              value={addAmt}
              onChange={(e) => setAddAmt(e.target.value)}
              min="0"
              step="0.00000001"
            />
            <Button
              disabled={!addAmt || pending === "add"}
              onClick={() => {
                setPending("add");
                addCollateral(toSats(addAmt), cb("add-collateral"));
              }}
            >
              {pending === "add" ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>

        {/* Withdraw Collateral */}
        {collateral && collateral.amount > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Minus className="h-3 w-3" />
              Withdraw Collateral
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount in sBTC"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                min="0"
                step="0.00000001"
                max={fmtSats(collateral.amount)}
              />
              <Button
                variant="outline"
                disabled={!withdrawAmt || pending === "withdraw"}
                onClick={() => {
                  setPending("withdraw");
                  withdrawCollateral(toSats(withdrawAmt), cb("withdraw-collateral"));
                }}
              >
                {pending === "withdraw" ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
            {!loan && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => setWithdrawAmt(fmtSats(collateral.amount))}
              >
                Withdraw all ({fmtSats(collateral.amount)} sBTC)
              </Button>
            )}
            {loan && (
              <p className="text-xs text-muted-foreground">
                You can only withdraw excess collateral while you have an active loan.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import { borrow, repay } from "@/services/lendingPoolService";
import type { UserLendingData } from "@/types/lending";
import { Banknote, ArrowDown, ArrowUp, AlertTriangle, Info } from "lucide-react";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;
const COLLATERAL_RATIO = 150;

const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);

interface Props {
  userData: UserLendingData;
  stxAvailable: number;
  onRefetch: () => void;
}

export function LoanPanel({ userData, stxAvailable, onRefetch }: Props) {
  const { isConnected, connect } = useWallet();
  const [borrowAmt, setBorrowAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const { collateral, loan, loanStatus, currentInterest } = userData;

  // Calculate max borrow based on collateral value
  const maxBorrowFromCollateral = loanStatus.collateralStxValue
    ? Math.floor((loanStatus.collateralStxValue * 100) / COLLATERAL_RATIO) - loanStatus.totalDebtStx
    : 0;

  // Limit by available STX liquidity
  const maxBorrow = Math.min(Math.max(0, maxBorrowFromCollateral), stxAvailable);
  const totalDebt = loanStatus.totalDebtStx;

  const cb = (label: string) => ({
    onFinish: (d: { txId: string }) => {
      console.log(`${label} tx:`, d.txId);
      setPending(null);
      setTimeout(onRefetch, 50000);
    },
    onCancel: () => setPending(null),
  });

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Borrow STX
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to borrow STX
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
          <Banknote className="h-5 w-5" />
          Borrow & Repay (STX)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Loan Position */}
        <div className="rounded-lg bg-muted/40 p-4 space-y-2">
          {loan ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-mono">{fmtStx(loanStatus.principal)} STX</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accrued Interest</span>
                <span className="font-mono">{fmtStx(currentInterest)} STX</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-medium">
                <span>Total Debt</span>
                <span className="font-mono">{fmtStx(totalDebt)} STX</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={loanStatus.isHealthy ? "secondary" : "destructive"}>
                  {loanStatus.isHealthy ? "Healthy" : "At Risk"}
                </Badge>
              </div>
              {!loanStatus.isHealthy && (
                <div className="flex items-center gap-2 text-destructive text-xs mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Add collateral or repay to avoid liquidation</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No active loan. Add collateral first, then borrow STX.
            </p>
          )}
        </div>

        <Separator />

        {/* Borrow Form */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <ArrowDown className="h-3 w-3" />
            Borrow STX
          </p>

          {!collateral ? (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Info className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Add collateral first to enable borrowing
              </p>
            </div>
          ) : maxBorrow <= 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Info className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {stxAvailable === 0
                  ? "No STX liquidity available for borrowing"
                  : "Max borrow capacity reached. Add more collateral or repay existing debt."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Max: ${fmtStx(maxBorrow)} STX`}
                  value={borrowAmt}
                  onChange={(e) => setBorrowAmt(e.target.value)}
                  min="0"
                  step="0.000001"
                  max={fmtStx(maxBorrow)}
                />
                <Button
                  disabled={!borrowAmt || pending === "borrow"}
                  onClick={() => {
                    setPending("borrow");
                    borrow(toMicroStx(borrowAmt), cb("borrow"));
                  }}
                >
                  {pending === "borrow" ? "Borrowing…" : "Borrow"}
                </Button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Available to borrow:</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setBorrowAmt(fmtStx(maxBorrow))}
                >
                  {fmtStx(maxBorrow)} STX (max)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                150% collateralization required. Interest accrues at 5% APR.
              </p>
            </>
          )}
        </div>

        {/* Repay Form */}
        {loan && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                Repay STX
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`Total debt: ${fmtStx(totalDebt)} STX`}
                  value={repayAmt}
                  onChange={(e) => setRepayAmt(e.target.value)}
                  min="0"
                  step="0.000001"
                />
                <Button
                  variant="outline"
                  disabled={!repayAmt || pending === "repay"}
                  onClick={() => {
                    setPending("repay");
                    repay(toMicroStx(repayAmt), cb("repay"));
                  }}
                >
                  {pending === "repay" ? "Repaying…" : "Repay"}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => setRepayAmt(fmtStx(totalDebt))}
              >
                Repay full debt ({fmtStx(totalDebt)} STX)
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/contexts/WalletContext";
import { addCollateral, withdrawCollateral, borrow, repay } from "@/services/lendingPoolService";
import { HealthFactorGauge } from "./HealthFactorGauge";
import type { UserLendingData } from "@/types/lending";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;
const COLLATERAL_RATIO = 150;

const fmtSats = (sats: number) => (sats / SAT).toFixed(8);
const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);

interface Props {
  userData: UserLendingData;
  onRefetch: () => void;
}

export function BorrowPanel({ userData }: Props) {
  const { isConnected, connect } = useWallet();
  const [collateralAmt, setCollateralAmt] = useState("");
  const [withdrawCollateralAmt, setWithdrawCollateralAmt] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const { collateral, loan, loanStatus, currentInterest } = userData;

  // Max borrow in microSTX = (collateral value in STX) / collateral ratio
  const maxBorrowStx = loanStatus.collateralStxValue
    ? Math.floor((loanStatus.collateralStxValue * 100) / COLLATERAL_RATIO) - loanStatus.totalDebtStx
    : 0;
  const totalDebtStx = loanStatus.totalDebtStx;

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
          <CardTitle className="text-base">Collateral & Borrowing</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={connect} className="w-full">Connect Wallet</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Collateral & Borrowing</CardTitle>
        <p className="text-xs text-muted-foreground">
          Deposit sBTC as collateral to borrow STX
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health factor */}
        <HealthFactorGauge healthFactor={loanStatus.healthFactor} />

        <Separator />

        {/* Collateral position */}
        <div className="space-y-1.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collateral (sBTC)</p>
          {collateral ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposited</span>
                <span className="font-mono">{fmtSats(collateral.amount)} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Value in STX</span>
                <span className="font-mono">{fmtStx(loanStatus.collateralStxValue)} STX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Borrow</span>
                <span className="font-mono">{fmtStx(Math.max(0, maxBorrowStx))} STX</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Price</span>
                <span className="font-mono">{loanStatus.stxPerSbtc} microSTX/sat</span>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No collateral deposited.</p>
          )}
        </div>

        {/* Add collateral */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Add collateral (sBTC)"
              value={collateralAmt}
              onChange={(e) => setCollateralAmt(e.target.value)}
              min="0"
              step="0.00000001"
            />
            <Button
              size="sm"
              disabled={!collateralAmt || pending === "collateral"}
              onClick={() => {
                setPending("collateral");
                addCollateral(toSats(collateralAmt), cb("add-collateral"));
              }}
            >
              {pending === "collateral" ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>

        {/* Withdraw collateral */}
        {collateral && collateral.amount > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Withdraw collateral (sBTC)"
                value={withdrawCollateralAmt}
                onChange={(e) => setWithdrawCollateralAmt(e.target.value)}
                min="0"
                step="0.00000001"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!withdrawCollateralAmt || pending === "withdraw-collateral"}
                onClick={() => {
                  setPending("withdraw-collateral");
                  withdrawCollateral(toSats(withdrawCollateralAmt), cb("withdraw-collateral"));
                }}
              >
                {pending === "withdraw-collateral" ? "Withdrawing…" : "Withdraw"}
              </Button>
            </div>
            {!loan && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setWithdrawCollateralAmt(fmtSats(collateral.amount))}
              >
                Withdraw all ({fmtSats(collateral.amount)} sBTC)
              </Button>
            )}
          </div>
        )}

        <Separator />

        {/* Loan position */}
        <div className="space-y-1.5 text-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Loan (STX)</p>
          {loan ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-mono">{fmtStx(loanStatus.principal)} STX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accrued Interest</span>
                <span className="font-mono">{fmtStx(currentInterest)} STX</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total Debt</span>
                <span className="font-mono">{fmtStx(totalDebtStx)} STX</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Opened</span>
                <span>{new Date(loan.borrowTime * 1000).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge variant={loanStatus.isHealthy ? "secondary" : "destructive"} className="text-xs">
                  {loanStatus.isHealthy ? "Healthy" : "At Risk"}
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No active loan.</p>
          )}
        </div>

        {/* Borrow form */}
        {collateral && maxBorrowStx > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`Borrow up to ${fmtStx(maxBorrowStx)} STX`}
                value={borrowAmt}
                onChange={(e) => setBorrowAmt(e.target.value)}
                min="0"
                step="0.000001"
              />
              <Button
                disabled={!borrowAmt || pending === "borrow"}
                onClick={() => {
                  setPending("borrow");
                  borrow(toMicroStx(borrowAmt), cb("borrow"));
                }}
              >
                {pending === "borrow" ? "Borrowing…" : "Borrow STX"}
              </Button>
            </div>
            {borrowAmt && (
              <p className="text-xs text-muted-foreground">
                Max borrow: <span className="font-mono">{fmtStx(maxBorrowStx)} STX</span> (150% collateral ratio)
              </p>
            )}
          </div>
        )}

        {/* Repay form */}
        {loan && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Repay STX</p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`Total debt: ${fmtStx(totalDebtStx)} STX`}
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
              className="text-xs"
              onClick={() => setRepayAmt(fmtStx(totalDebtStx))}
            >
              Repay full debt ({fmtStx(totalDebtStx)} STX)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

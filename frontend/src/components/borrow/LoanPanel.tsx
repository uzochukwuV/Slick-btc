"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/contexts/WalletContext";
import { borrow, repay, borrowUsdcx, repayUsdcx } from "@/services/lendingPoolService";
import type { UserLendingData } from "@/types/lending";
import { Banknote, ArrowDown, ArrowUp, AlertTriangle, Info, DollarSign, Coins } from "lucide-react";

const MICRO_STX = 1_000_000;
const MICRO_USDCX = 1_000_000; // 6 decimals
const COLLATERAL_RATIO = 150;

const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const fmtUsdcx = (micro: number) => (micro / MICRO_USDCX).toFixed(2);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);
const toMicroUsdcx = (usdcx: string) => Math.floor(parseFloat(usdcx || "0") * MICRO_USDCX);

interface Props {
  userData: UserLendingData;
  stxAvailable: number;
  usdcxAvailable?: number;
  onRefetch: () => void;
}

export function LoanPanel({ userData, stxAvailable, usdcxAvailable = 0 }: Props) {
  const { isConnected, connect } = useWallet();
  const [borrowAmt, setBorrowAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");
  const [borrowUsdcxAmt, setBorrowUsdcxAmt] = useState("");
  const [repayUsdcxAmt, setRepayUsdcxAmt] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stx" | "usdcx">("stx");

  const { collateral, loan, loanStatus, currentInterest, usdcxLoan } = userData;

  // Calculate max borrow based on collateral value (for STX)
  const maxBorrowFromCollateral = loanStatus.collateralStxValue
    ? Math.floor((loanStatus.collateralStxValue * 100) / COLLATERAL_RATIO) - loanStatus.totalDebtStx
    : 0;

  // Limit by available STX liquidity
  const maxBorrow = Math.min(Math.max(0, maxBorrowFromCollateral), stxAvailable);
  const totalDebt = loanStatus.totalDebtStx;

  // Calculate max USDCx borrow (using collateral value converted to USD at 98% factor)
  const collateralValueUsd = loanStatus.collateralStxValue
    ? Math.floor((loanStatus.collateralStxValue * 98) / 100) // 98% collateral factor
    : 0;
  const existingUsdcxDebt = usdcxLoan ? usdcxLoan.principalAmount + usdcxLoan.interestAccrued : 0;
  const maxBorrowUsdcxFromCollateral = Math.floor((collateralValueUsd * 100) / COLLATERAL_RATIO) - existingUsdcxDebt;
  const maxBorrowUsdcx = Math.min(Math.max(0, maxBorrowUsdcxFromCollateral), usdcxAvailable);

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
            <Banknote className="h-5 w-5" />
            Borrow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your wallet to borrow STX or USDCx
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
          Borrow & Repay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "stx" | "usdcx")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="stx" className="gap-2">
              <Coins className="h-4 w-4" />
              STX
            </TabsTrigger>
            <TabsTrigger value="usdcx" className="gap-2">
              <DollarSign className="h-4 w-4" />
              USDCx
            </TabsTrigger>
          </TabsList>

          {/* STX Tab */}
          <TabsContent value="stx" className="space-y-4 mt-4">
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
                  No active STX loan. Add collateral first, then borrow.
                </p>
              )}
            </div>

            <Separator />

            {/* Borrow STX Form */}
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

            {/* Repay STX Form */}
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
          </TabsContent>

          {/* USDCx Tab */}
          <TabsContent value="usdcx" className="space-y-4 mt-4">
            {/* USDCx Info Banner */}
            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Borrow stablecoins pegged to $1 USD against your sBTC collateral.
                  4% APR with 98% collateral factor.
                </p>
              </div>
            </div>

            {/* Current USDCx Loan Position */}
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              {usdcxLoan ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Principal</span>
                    <span className="font-mono">${fmtUsdcx(usdcxLoan.principalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accrued Interest</span>
                    <span className="font-mono">${fmtUsdcx(usdcxLoan.interestAccrued)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total Debt</span>
                    <span className="font-mono">${fmtUsdcx(existingUsdcxDebt)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No active USDCx loan. Add collateral first, then borrow stablecoins.
                </p>
              )}
            </div>

            <Separator />

            {/* Borrow USDCx Form */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <ArrowDown className="h-3 w-3" />
                Borrow USDCx
              </p>

              {!collateral ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <Info className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Add collateral first to enable borrowing
                  </p>
                </div>
              ) : maxBorrowUsdcx <= 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <Info className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {usdcxAvailable === 0
                      ? "No USDCx liquidity available for borrowing"
                      : "Max borrow capacity reached. Add more collateral or repay existing debt."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder={`Max: ${fmtUsdcx(maxBorrowUsdcx)}`}
                        value={borrowUsdcxAmt}
                        onChange={(e) => setBorrowUsdcxAmt(e.target.value)}
                        min="0"
                        step="0.01"
                        className="pl-7"
                      />
                    </div>
                    <Button
                      disabled={!borrowUsdcxAmt || pending === "borrow-usdcx"}
                      onClick={() => {
                        setPending("borrow-usdcx");
                        borrowUsdcx(toMicroUsdcx(borrowUsdcxAmt), cb("borrow-usdcx"));
                      }}
                    >
                      {pending === "borrow-usdcx" ? "Borrowing…" : "Borrow"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Available to borrow:</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setBorrowUsdcxAmt(fmtUsdcx(maxBorrowUsdcx))}
                    >
                      ${fmtUsdcx(maxBorrowUsdcx)} (max)
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    150% collateralization required. Interest accrues at 4% APR.
                  </p>
                </>
              )}
            </div>

            {/* Repay USDCx Form */}
            {usdcxLoan && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <ArrowUp className="h-3 w-3" />
                    Repay USDCx
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder={`Total debt: ${fmtUsdcx(existingUsdcxDebt)}`}
                        value={repayUsdcxAmt}
                        onChange={(e) => setRepayUsdcxAmt(e.target.value)}
                        min="0"
                        step="0.01"
                        className="pl-7"
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={!repayUsdcxAmt || pending === "repay-usdcx"}
                      onClick={() => {
                        setPending("repay-usdcx");
                        repayUsdcx(toMicroUsdcx(repayUsdcxAmt), cb("repay-usdcx"));
                      }}
                    >
                      {pending === "repay-usdcx" ? "Repaying…" : "Repay"}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs w-full"
                    onClick={() => setRepayUsdcxAmt(fmtUsdcx(existingUsdcxDebt))}
                  >
                    Repay full debt (${fmtUsdcx(existingUsdcxDebt)})
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

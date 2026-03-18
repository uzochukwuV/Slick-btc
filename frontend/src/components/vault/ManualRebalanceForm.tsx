"use client";

import React, { useState } from "react";
import { ArrowRightLeft, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useWallet } from "@/contexts/WalletContext";
import { rebalancePools, getExplorerUrl } from "@/services/contractService";
import { clearUserCache } from "@/services/apiService";
import { toast } from "sonner";

interface PoolAllocation {
  name: string;
  amount: number;
  percentage: number;
  apy: number;
  color: string;
}

interface ManualRebalanceFormProps {
  vaultBalance: number;
  currentAlexAmount: number;
  currentVelarAmount: number;
  alexApy: number;
  velarApy: number;
  onSuccess?: () => void;
}

export const ManualRebalanceForm: React.FC<ManualRebalanceFormProps> = ({
  vaultBalance,
  currentAlexAmount,
  currentVelarAmount,
  alexApy,
  velarApy,
  onSuccess,
}) => {
  const { refreshBalances, address } = useWallet();
  const [alexAmount, setAlexAmount] = useState<string>(currentAlexAmount.toString());
  const [velarAmount, setVelarAmount] = useState<string>(currentVelarAmount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTotal = currentAlexAmount + currentVelarAmount;
  const newAlexAmount = parseFloat(alexAmount) || 0;
  const newVelarAmount = parseFloat(velarAmount) || 0;
  const newTotal = newAlexAmount + newVelarAmount;
  const remainingBalance = vaultBalance - newTotal;

  const isValid = newTotal <= vaultBalance && newTotal >= 0;
  const hasChanges = newAlexAmount !== currentAlexAmount || newVelarAmount !== currentVelarAmount;

  const currentAllocations: PoolAllocation[] = [
    {
      name: "ALEX",
      amount: currentAlexAmount,
      percentage: currentTotal > 0 ? (currentAlexAmount / currentTotal) * 100 : 0,
      apy: alexApy,
      color: "bg-blue-500",
    },
    {
      name: "Velar",
      amount: currentVelarAmount,
      percentage: currentTotal > 0 ? (currentVelarAmount / currentTotal) * 100 : 0,
      apy: velarApy,
      color: "bg-purple-500",
    },
  ];

  const newAllocations: PoolAllocation[] = [
    {
      name: "ALEX",
      amount: newAlexAmount,
      percentage: newTotal > 0 ? (newAlexAmount / newTotal) * 100 : 0,
      apy: alexApy,
      color: "bg-blue-500",
    },
    {
      name: "Velar",
      amount: newVelarAmount,
      percentage: newTotal > 0 ? (newVelarAmount / newTotal) * 100 : 0,
      apy: velarApy,
      color: "bg-purple-500",
    },
  ];

  const handleSetMax = (pool: "alex" | "velar") => {
    if (pool === "alex") {
      const maxAlex = vaultBalance - newVelarAmount;
      setAlexAmount(maxAlex.toString());
    } else {
      const maxVelar = vaultBalance - newAlexAmount;
      setVelarAmount(maxVelar.toString());
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !hasChanges) return;

    setIsSubmitting(true);

    try {
      // Convert to microunits (multiply by 1,000,000)
      const alexMicrounits = Math.floor(newAlexAmount * 1_000_000);
      const velarMicrounits = Math.floor(newVelarAmount * 1_000_000);

      await rebalancePools(
        alexMicrounits,
        velarMicrounits,
        async (data) => {
          toast.success("Funds rebalanced successfully!", {
            description: `Allocated ${newAlexAmount.toFixed(4)} sBTC to ALEX, ${newVelarAmount.toFixed(4)} sBTC to Velar`,
            action: {
              label: "View",
              onClick: () => window.open(getExplorerUrl(data.txId), "_blank"),
            },
          });

          // Clear the user cache to fetch fresh data
          if (address) {
            await clearUserCache(address);
          }

          refreshBalances();
          onSuccess?.();
          setIsSubmitting(false);
        },
        () => {
          toast.error("Transaction cancelled");
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error("Rebalance error:", error);
      toast.error("Failed to rebalance funds");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Manual Pool Allocation</p>
          <p className="text-xs text-muted-foreground">
            Manually allocate your vault balance between ALEX and Velar pools. This will withdraw from
            current pools and deposit into the new allocations.
          </p>
        </div>
      </div>

      {/* Vault Balance Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total in Vault</span>
            <span className="text-lg font-bold">{vaultBalance.toFixed(4)} sBTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Currently Allocated</span>
            <span className="text-sm font-medium">{currentTotal.toFixed(4)} sBTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Remaining After New Allocation</span>
            <span className={`text-sm font-medium ${remainingBalance < 0 ? "text-destructive" : ""}`}>
              {remainingBalance.toFixed(4)} sBTC
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pool Allocation Inputs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* ALEX Pool */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">ALEX Pool</CardTitle>
              <Badge variant="outline" className="text-xs">
                APY: {alexApy.toFixed(2)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="alex-amount">Amount (sBTC)</Label>
              <div className="flex gap-2">
                <Input
                  id="alex-amount"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={alexAmount}
                  onChange={(e) => setAlexAmount(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0.0000"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetMax("alex")}
                  disabled={isSubmitting}
                >
                  Max
                </Button>
              </div>
            </div>
            {newTotal > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Allocation</span>
                  <span className="font-medium">{newAllocations[0].percentage.toFixed(1)}%</span>
                </div>
                <Progress value={newAllocations[0].percentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Velar Pool */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Velar Pool</CardTitle>
              <Badge variant="outline" className="text-xs">
                APY: {velarApy.toFixed(2)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="velar-amount">Amount (sBTC)</Label>
              <div className="flex gap-2">
                <Input
                  id="velar-amount"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={velarAmount}
                  onChange={(e) => setVelarAmount(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="0.0000"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetMax("velar")}
                  disabled={isSubmitting}
                >
                  Max
                </Button>
              </div>
            </div>
            {newTotal > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Allocation</span>
                  <span className="font-medium">{newAllocations[1].percentage.toFixed(1)}%</span>
                </div>
                <Progress value={newAllocations[1].percentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Validation Error */}
      {!isValid && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Invalid Allocation</p>
            <p className="text-xs text-destructive/80">
              Total allocation ({newTotal.toFixed(4)} sBTC) exceeds vault balance ({vaultBalance.toFixed(4)} sBTC)
            </p>
          </div>
        </div>
      )}

      {/* Current vs New Comparison */}
      {hasChanges && isValid && (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Allocation Change Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Current</p>
                {currentAllocations.map((alloc) => (
                  <div key={alloc.name} className="flex items-center justify-between text-sm py-1">
                    <span>{alloc.name}</span>
                    <span className="font-medium">{alloc.amount.toFixed(4)} sBTC</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm py-1 border-t mt-2 pt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">{currentTotal.toFixed(4)} sBTC</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">New</p>
                {newAllocations.map((alloc) => (
                  <div key={alloc.name} className="flex items-center justify-between text-sm py-1">
                    <span>{alloc.name}</span>
                    <span className="font-medium text-primary">{alloc.amount.toFixed(4)} sBTC</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm py-1 border-t mt-2 pt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-primary">{newTotal.toFixed(4)} sBTC</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className="w-full transition-smooth hover:scale-105"
        disabled={isSubmitting || !isValid || !hasChanges}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Rebalancing Pools...
          </>
        ) : (
          <>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {!hasChanges
              ? "No Changes to Apply"
              : !isValid
              ? "Invalid Allocation"
              : "Rebalance Pools"}
          </>
        )}
      </Button>

      {!hasChanges && isValid && (
        <p className="text-xs text-center text-muted-foreground">
          Adjust the allocation amounts to rebalance your funds
        </p>
      )}
    </div>
  );
};

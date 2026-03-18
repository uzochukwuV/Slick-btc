"use client";

import React from "react";
import { Vault, TrendingUp, Users, RefreshCw, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DepositForm } from "./DepositForm";
import { WithdrawalForm } from "./WithdrawalForm";
import { DepositForForm } from "./DepositForForm";
import { RiskPreferenceForm } from "./RiskPreferenceForm";
import { ManualRebalanceForm } from "./ManualRebalanceForm";
import { TransactionHistory } from "./TransactionHistory";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/contexts/WalletContext";
import { useBitYield } from "@/hooks/useBitYield";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export const VaultInterface: React.FC = () => {
  const { isConnected, address } = useWallet();
  const { vaultData, isPaused, isLoading, error } = useContract();
  const { pools, userBalance: bityieldBalance, isLoading: bityieldLoading, refetch: refetchBityield } =
    useBitYield(address || undefined, false);

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>yieldr Vault</CardTitle>
          <CardDescription>
            Connect your wallet to interact with the vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Vault className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to deposit or withdraw sBTC.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Show contract not deployed warning
  if (error === "CONTRACT_NOT_DEPLOYED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>yieldr Vault</CardTitle>
          <CardDescription>Contract deployment required</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  The vault contract is not deployed yet.
                </p>
                <p className="text-sm">
                  The contract needs to be deployed to{" "}
                  {process.env.NEXT_PUBLIC_NETWORK || "testnet"} before you can
                  interact with it.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-semibold text-sm">To deploy the contract:</h4>
            <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
              <li>Navigate to the project root directory</li>
              <li>
                Run:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  clarinet deployments apply --testnet
                </code>
              </li>
              <li>
                Update{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  NEXT_PUBLIC_CONTRACT_ADDRESS
                </code>{" "}
                in{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded">
                  .env.local
                </code>
              </li>
              <li>Restart the development server</li>
            </ol>
            <p className="text-sm text-muted-foreground mt-3">
              See{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded">
                frontend/DEPLOYMENT-GUIDE.md
              </code>{" "}
              for detailed instructions.
            </p>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Current contract address:</strong>
              <br />
              <code className="text-xs">
                {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}
              </code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vault Statistics */}
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in">
        <Card className="hover-lift transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Balance</CardTitle>
            <Vault className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {vaultData.userBalance.toFixed(4)} sBTC
                </div>
                <p className="text-xs text-muted-foreground mt-1">In vault</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {vaultData.totalTvl.toFixed(2)} sBTC
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total value locked
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="hover-lift transition-smooth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depositors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {vaultData.depositorCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Unique depositors
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BitYield Pool Information */}
      {!bityieldBalance && !bityieldLoading && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>BitYield Smart Allocation</CardTitle>
              </div>
              <Button onClick={refetchBityield} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Pool Data
              </Button>
            </div>
            <CardDescription>
              Your sBTC is automatically optimized across ALEX and Velar pools
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Pool Allocations & APY Display */}
      {bityieldBalance && pools && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>BitYield Smart Allocation</CardTitle>
              </div>
              <Button onClick={refetchBityield} size="sm" variant="outline" disabled={bityieldLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${bityieldLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <CardDescription>
              Your sBTC is automatically optimized across ALEX and Velar pools for maximum yield
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Yield Earned */}
            {bityieldBalance.yield.amount > 0 && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Yield Earned</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {bityieldBalance.yield.amountFormatted}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            )}

            {/* Pool Allocations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Pool Allocations</h4>
                <span className="text-sm text-muted-foreground">
                  Total: {bityieldBalance.vaultBalanceFormatted}
                </span>
              </div>

              {/* ALEX Pool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="font-medium">ALEX Pool</span>
                    <Badge variant="secondary" className="text-xs">
                      {pools.alex.apyFormatted}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{bityieldBalance.allocations.alex.amountFormatted}</p>
                    <p className="text-xs text-muted-foreground">{bityieldBalance.allocations.alex.percentage}%</p>
                  </div>
                </div>
                <Progress
                  value={parseFloat(bityieldBalance.allocations.alex.percentage)}
                  className="h-2"
                />
              </div>

              {/* Velar Pool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="font-medium">Velar Pool</span>
                    <Badge variant="secondary" className="text-xs">
                      {pools.velar.apyFormatted}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{bityieldBalance.allocations.velar.amountFormatted}</p>
                    <p className="text-xs text-muted-foreground">{bityieldBalance.allocations.velar.percentage}%</p>
                  </div>
                </div>
                <Progress
                  value={parseFloat(bityieldBalance.allocations.velar.percentage)}
                  className="h-2"
                />
              </div>
            </div>

            {/* Risk Preference */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Preference</span>
                <Badge variant="outline">{bityieldBalance.riskPreference.name}</Badge>
              </div>
            </div>

            {/* Total Value with Yield */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value with Yield</span>
                <span className="font-bold">{bityieldBalance.totalValueWithYield.amountFormatted}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pause Warning */}
      {isPaused && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            The vault contract is currently paused. Deposits and withdrawals are
            temporarily disabled.
          </AlertDescription>
        </Alert>
      )}

      {/* Deposit/Withdrawal Interface */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vault Operations</CardTitle>
              <CardDescription>Deposit or withdraw your sBTC</CardDescription>
            </div>
            <Badge variant={isPaused ? "destructive" : "default"}>
              {isPaused ? "Paused" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deposit" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="deposit" disabled={isPaused}>
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" disabled={isPaused}>
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="gift" disabled={isPaused}>
                Gift
              </TabsTrigger>
              <TabsTrigger value="risk-preference" disabled={isPaused}>
                Risk
              </TabsTrigger>
              <TabsTrigger value="rebalance" disabled={isPaused}>
                Rebalance
              </TabsTrigger>
            </TabsList>

            <Separator className="my-6" />

            <TabsContent value="deposit" className="space-y-4">
              <DepositForm />
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4">
              <WithdrawalForm />
            </TabsContent>

            <TabsContent value="gift" className="space-y-4">
              <DepositForForm />
            </TabsContent>

            <TabsContent value="risk-preference" className="space-y-4">
              <RiskPreferenceForm
                currentRisk={bityieldBalance?.riskPreference?.value || 2}
                onSuccess={refetchBityield}
              />
            </TabsContent>

            <TabsContent value="rebalance" className="space-y-4">
              <ManualRebalanceForm
                vaultBalance={vaultData.userBalance}
                currentAlexAmount={bityieldBalance?.allocations?.alex?.amountBTC || 0}
                currentVelarAmount={bityieldBalance?.allocations?.velar?.amountBTC || 0}
                alexApy={pools?.alex?.apy || 0}
                velarApy={pools?.velar?.apy || 0}
                onSuccess={refetchBityield}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  );
};

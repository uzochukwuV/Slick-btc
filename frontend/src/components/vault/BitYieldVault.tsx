"use client";

import React from "react";
import { Vault, TrendingUp, Users, RefreshCw, Sparkles, Wallet, Clock, AlertCircle, AlertTriangle } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { DepositForm } from "./DepositForm";
import { WithdrawalForm } from "./WithdrawalForm";
import { DepositForForm } from "./DepositForForm";
import { RiskPreferenceForm } from "./RiskPreferenceForm";
import { ManualRebalanceForm } from "./ManualRebalanceForm";
import { TransactionHistory } from "./TransactionHistory";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/contexts/WalletContext";
import { useBitYield } from "@/hooks/useBitYield";

export const BitYieldVault: React.FC = () => {
  const { isConnected, address } = useWallet();
  const { vaultData, isPaused, isLoading, error } = useContract();
  const { pools, userBalance: bityieldBalance, isLoading: bityieldLoading, error: bityieldError, refetch: refetchBityield, lastUpdated } =
    useBitYield(address || undefined, true); // Auto-fetch when connected

  // Format last updated time
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BitYield Vault</CardTitle>
          <CardDescription>
            Connect your wallet to interact with the vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your wallet to deposit or withdraw sBTC and view your allocations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Contract not deployed warning
  if (error === "CONTRACT_NOT_DEPLOYED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>BitYield Vault</CardTitle>
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Section */}
      <div className="space-y-4">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Your Portfolio</h2>
            <p className="text-sm text-muted-foreground">
              Overview of your sBTC deposits and yield earnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatLastUpdated(lastUpdated)}</span>
              </div>
            )}
            <Button onClick={refetchBityield} disabled={bityieldLoading} size="sm" variant="outline">
              <RefreshCw className={`h-4 w-4 ${bityieldLoading ? "animate-spin" : ""} md:mr-2`} />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4 animate-fade-in">
          {/* Your Balance */}
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

          {/* Earned Yield */}
          <Card className="hover-lift transition-smooth border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earned Yield</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {bityieldLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {bityieldBalance?.yield.amountFormatted || "0.00000000 BTC"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total earnings</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total TVL */}
          <Card className="hover-lift transition-smooth">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
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

          {/* Depositors */}
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
                    Active users
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pool Allocations Section */}
      {bityieldBalance && pools && (
        <Card className="animate-fade-in border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Smart Pool Allocations</CardTitle>
              </div>
              <Badge variant="outline">{bityieldBalance.riskPreference.name}</Badge>
            </div>
            <CardDescription>
              Your sBTC is automatically optimized across ALEX and Velar pools for maximum yield
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pool Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* ALEX Pool */}
              <Card className="border-green-200 dark:border-green-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">ALEX Pool</CardTitle>
                    <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                      {pools.alex.apyFormatted}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Automated Liquidity Exchange on Stacks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your Allocation</span>
                      <div className="text-right">
                        <p className="font-semibold">{bityieldBalance.allocations.alex.amountFormatted}</p>
                        <p className="text-xs text-muted-foreground">{bityieldBalance.allocations.alex.percentage}%</p>
                      </div>
                    </div>
                    <Progress
                      value={parseFloat(bityieldBalance.allocations.alex.percentage)}
                      className="h-2 bg-green-100 dark:bg-green-950"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pool TVL</span>
                    <span className="font-medium">{pools.alex.tvlFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${pools.alex.isPaused ? "text-red-600" : "text-green-600"}`}>
                      {pools.alex.isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Velar Pool */}
              <Card className="border-blue-200 dark:border-blue-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Velar Pool</CardTitle>
                    <Badge variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {pools.velar.apyFormatted}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Advanced DEX protocol on Stacks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Your Allocation</span>
                      <div className="text-right">
                        <p className="font-semibold">{bityieldBalance.allocations.velar.amountFormatted}</p>
                        <p className="text-xs text-muted-foreground">{bityieldBalance.allocations.velar.percentage}%</p>
                      </div>
                    </div>
                    <Progress
                      value={parseFloat(bityieldBalance.allocations.velar.percentage)}
                      className="h-2 bg-blue-100 dark:bg-blue-950"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Pool TVL</span>
                    <span className="font-medium">{pools.velar.tvlFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${pools.velar.isPaused ? "text-red-600" : "text-blue-600"}`}>
                      {pools.velar.isPaused ? "Paused" : "Active"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Total Value Summary */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Value with Yield</span>
                <span className="text-lg font-bold text-primary">{bityieldBalance.totalValueWithYield.amountFormatted}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State for Pool Data */}
      {bityieldLoading && !bityieldBalance && (
        <Card className="animate-fade-in">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Data Error */}
      {bityieldError && !bityieldBalance && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Failed to load pool data</p>
              <p className="text-sm mt-1">{bityieldError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetchBityield} className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
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

      {/* Vault Operations Section */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vault Operations</CardTitle>
              <CardDescription>Manage your sBTC deposits and strategy</CardDescription>
            </div>
            <Badge variant={isPaused ? "destructive" : "default"}>
              {isPaused ? "Paused" : "Active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deposit-withdraw" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="deposit-withdraw" disabled={isPaused}>
                Deposit & Withdraw
              </TabsTrigger>
              <TabsTrigger value="strategy" disabled={isPaused}>
                Manage Strategy
              </TabsTrigger>
              <TabsTrigger value="gift" disabled={isPaused}>
                Gift Deposit
              </TabsTrigger>
            </TabsList>

            <Separator className="my-6" />

            {/* Tab 1: Deposit & Withdraw Combined */}
            <TabsContent value="deposit-withdraw" className="space-y-6">
              <Tabs defaultValue="deposit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="deposit">
                    <DepositForm />
                  </TabsContent>
                  <TabsContent value="withdraw">
                    <WithdrawalForm />
                  </TabsContent>
                </div>
              </Tabs>
            </TabsContent>

            {/* Tab 2: Manage Strategy (Risk + Rebalance) */}
            <TabsContent value="strategy" className="space-y-6">
              <div className="space-y-6">
                {/* Risk Preference Section */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">Risk Preference</h3>
                    <p className="text-sm text-muted-foreground">
                      Set your risk level to automatically adjust pool allocations
                    </p>
                  </div>
                  <RiskPreferenceForm
                    currentRisk={bityieldBalance?.riskPreference?.value || 2}
                    onSuccess={refetchBityield}
                  />
                </div>

                <Separator />

                {/* Manual Rebalance Section */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">Manual Rebalance</h3>
                    <p className="text-sm text-muted-foreground">
                      Manually allocate your funds between ALEX and Velar pools
                    </p>
                  </div>
                  <ManualRebalanceForm
                    vaultBalance={vaultData.userBalance}
                    currentAlexAmount={bityieldBalance?.allocations?.alex?.amountBTC || 0}
                    currentVelarAmount={bityieldBalance?.allocations?.velar?.amountBTC || 0}
                    alexApy={pools?.alex?.apy || 0}
                    velarApy={pools?.velar?.apy || 0}
                    onSuccess={refetchBityield}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Gift Deposit */}
            <TabsContent value="gift" className="space-y-4">
              <DepositForForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  );
};

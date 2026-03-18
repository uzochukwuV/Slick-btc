"use client";

import React from "react";
import { Wallet, TrendingUp, Users, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBitYield } from "@/hooks/useBitYield";
import { useWallet } from "@/contexts/WalletContext";

export const BitYieldDashboard: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { apy, vaultStats, pools, userBalance, isLoading, error, refetch, lastUpdated } =
    useBitYield(address || undefined, false); // autoFetch = false to avoid rate limiting

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

  // Initial state - show button to load data
  if (!lastUpdated && !isLoading && !error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col items-center justify-center py-12">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle>BitYield Vault Data</CardTitle>
              <CardDescription>
                Click the button below to load vault statistics and pool data
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={refetch} size="lg" className="gap-2">
                <RefreshCw className="h-5 w-5" />
                Load Vault Data
              </Button>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-4">
            Manual loading prevents API rate limiting
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pool Cards Skeleton */}
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="animate-fade-in">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Failed to load BitYield data</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="ml-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            BitYield Vault
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2">
            Automated yield optimization for your sBTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatLastUpdated(lastUpdated)}</span>
          </div>
          <Button onClick={refetch} disabled={isLoading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""} md:mr-2`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
        {/* Total TVL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Total TVL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vaultStats?.totalTvlFormatted || "0.00000000 BTC"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vault Balance
            </p>
          </CardContent>
        </Card>

        {/* Depositors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Depositors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vaultStats?.depositorCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active users
            </p>
          </CardContent>
        </Card>

        {/* ALEX APY */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              ALEX APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {apy?.alex.apyFormatted || "0.00%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current yield
            </p>
          </CardContent>
        </Card>

        {/* Velar APY */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Velar APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {apy?.velar.apyFormatted || "0.00%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current yield
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Balance (if connected) */}
      {isConnected && userBalance && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Your Position
            </CardTitle>
            <CardDescription>
              Your current balance and allocations in the vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Vault Balance</p>
                <p className="text-2xl font-bold mt-1">
                  {userBalance.vaultBalanceFormatted}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value with Yield</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {userBalance.totalValueWithYield.amountFormatted}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earned Yield</p>
                <p className="text-2xl font-bold mt-1 text-primary">
                  {userBalance.yield.amountFormatted}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-2">Pool Allocations</p>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <span className="text-sm font-medium">ALEX</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{userBalance.allocations.alex.amountFormatted}</p>
                    <p className="text-xs text-muted-foreground">{userBalance.allocations.alex.percentage}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <span className="text-sm font-medium">Velar</span>
                  <div className="text-right">
                    <p className="text-sm font-bold">{userBalance.allocations.velar.amountFormatted}</p>
                    <p className="text-xs text-muted-foreground">{userBalance.allocations.velar.percentage}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Risk Preference</p>
              <p className="text-lg font-semibold mt-1">{userBalance.riskPreference.name}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pool Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* ALEX Pool */}
        <Card>
          <CardHeader>
            <CardTitle>ALEX Pool</CardTitle>
            <CardDescription>
              Automated Liquidity Exchange on Stacks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">APY</span>
              <span className="text-lg font-bold text-green-600">
                {pools?.alex.apyFormatted || "0.00%"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pool TVL</span>
              <span className="text-sm font-medium">
                {pools?.alex.tvlFormatted || "0.00000000 BTC"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium ${pools?.alex.isPaused ? "text-red-600" : "text-green-600"}`}>
                {pools?.alex.isPaused ? "Paused" : "Active"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Velar Pool */}
        <Card>
          <CardHeader>
            <CardTitle>Velar Pool</CardTitle>
            <CardDescription>
              Advanced DEX protocol on Stacks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">APY</span>
              <span className="text-lg font-bold text-blue-600">
                {pools?.velar.apyFormatted || "0.00%"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pool TVL</span>
              <span className="text-sm font-medium">
                {pools?.velar.tvlFormatted || "0.00000000 BTC"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium ${pools?.velar.isPaused ? "text-red-600" : "text-green-600"}`}>
                {pools?.velar.isPaused ? "Paused" : "Active"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connect Wallet CTA (if not connected) */}
      {!isConnected && (
        <Alert className="animate-fade-in">
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Connect your wallet to see your position</p>
            <p className="text-sm mt-1">
              Connect your Stacks wallet to view your balance, allocations, and earned yield.
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

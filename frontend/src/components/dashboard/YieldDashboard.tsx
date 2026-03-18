"use client";

import React from "react";
import { RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProtocolCard } from "./ProtocolCard";
import { YieldCharts } from "./YieldCharts";
import { useYields } from "@/hooks/useYields";
import { DataSourceNotice } from "@/components/notifications/DataSourceNotice";

export const YieldDashboard: React.FC = () => {
  const { yields, isLoading, error, lastUpdated, refetch, sortedByApy } =
    useYields();

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

  // Loading state
  if (isLoading && yields.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Summary Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
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

        {/* Protocol Cards Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="flex flex-col h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="py-2 space-y-2">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
                <CardFooter className="mt-auto pt-4">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && yields.length === 0) {
    return (
      <Alert variant="destructive" className="animate-fade-in">
        <AlertDescription className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Failed to load yields</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const sortedYields = sortedByApy();

  return (
    <div className="space-y-6">
      {/* Data Source Notice */}
      <DataSourceNotice />

      {/* Header */}
      <div className="space-y-4 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
              Yield Opportunities
            </h2>
            <p className="text-base md:text-lg text-muted-foreground mt-2">
              Discover the best sBTC yields across DeFi protocols
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatLastUpdated(lastUpdated)}</span>
            </div>
            <Button
              onClick={refetch}
              disabled={isLoading}
              size="sm"
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""} md:mr-2`}
              />
              <span className="hidden md:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Highest APY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sortedYields[0]?.apy.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sortedYields[0]?.protocol} - {sortedYields[0]?.poolName}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total TVL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${yields.reduce((sum, y) => sum + y.tvl, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {yields.length} opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average APY</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                yields.reduce((sum, y) => sum + y.apy, 0) / yields.length
              ).toFixed(2)}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mean across all protocols
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Protocol Cards */}
      <div className="space-y-4">
        <h3 className="text-2xl font-semibold tracking-tight">Protocols</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedYields.map((opportunity, index) => (
            <ProtocolCard key={index} opportunity={opportunity} />
          ))}
        </div>
      </div>

      {/* Charts */}
      {yields.length > 0 && <YieldCharts opportunities={yields} />}
    </div>
  );
};

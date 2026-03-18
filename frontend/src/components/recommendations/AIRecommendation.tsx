"use client";

import React, { useState } from "react";
import {
  Bot,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Recommendation } from "@/types";

interface AIRecommendationProps {
  recommendation: Recommendation | null;
  isLoading: boolean;
  error: string | null;
  amount: number;
}

export const AIRecommendation: React.FC<AIRecommendationProps> = ({
  recommendation,
  isLoading,
  error,
  amount,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate projected earnings if backend returns zeros
  const calculateEarnings = (apy: number, amount: number) => {
    const yearlyEarnings = (amount * apy) / 100;
    const monthlyEarnings = yearlyEarnings / 12;
    const dailyEarnings = yearlyEarnings / 365;

    return {
      daily: dailyEarnings,
      monthly: monthlyEarnings,
      yearly: yearlyEarnings,
    };
  };

  // Get earnings - use backend values if provided, otherwise calculate
  const getProjectedEarnings = () => {
    if (!recommendation) return { daily: 0, monthly: 0, yearly: 0 };

    const backendEarnings = recommendation.projectedEarnings;

    // If backend returns zeros, calculate on frontend
    if (
      backendEarnings.daily === 0 &&
      backendEarnings.monthly === 0 &&
      backendEarnings.yearly === 0
    ) {
      return calculateEarnings(recommendation.recommended.expectedApy, amount);
    }

    return backendEarnings;
  };

  const projectedEarnings = getProjectedEarnings();

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary animate-pulse" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg border-2 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-7 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-full mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-full mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-full mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // No recommendation
  if (!recommendation) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          <div>
            <CardTitle className="flex items-center gap-2">
              AI Recommendation
              <Sparkles className="h-4 w-4 text-yellow-500" />
            </CardTitle>
            <CardDescription>
              Optimized for your {amount.toFixed(2)} sBTC deposit
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Recommended Protocol */}
        <div className="p-4 bg-background rounded-lg border-2 border-primary">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold">
              {recommendation.recommended.protocol}
            </h3>
            <Badge variant="default" className="text-lg px-3 py-1">
              {recommendation.recommended.expectedApy.toFixed(2)}% APY
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {recommendation.recommended.pool}
          </p>
        </div>

        {/* AI Reasoning */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Why this recommendation?
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.reasoning}
          </p>
        </div>

        {/* Risk Assessment */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Assessment
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {recommendation.riskAssessment}
          </p>
        </div>

        <Separator />

        {/* Projected Earnings */}
        <div>
          <h4 className="font-semibold mb-3">Projected Earnings (sBTC)</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {projectedEarnings.daily.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground">Daily</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {projectedEarnings.monthly.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground">Monthly</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {projectedEarnings.yearly.toFixed(4)}
              </p>
              <p className="text-xs text-muted-foreground">Yearly</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Based on {recommendation.recommended.expectedApy.toFixed(2)}% APY
            and {amount.toFixed(2)} sBTC deposit
          </p>
        </div>

        {/* Confidence Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Confidence</span>
            <span className="text-sm text-muted-foreground">
              {(recommendation.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${recommendation.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Alternative Options */}
        {recommendation.alternatives.length > 0 && (
          <>
            <Separator />
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between"
              >
                <span className="font-semibold">
                  Alternative Options ({recommendation.alternatives.length})
                </span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showDetails && (
                <div className="mt-4 space-y-3">
                  {recommendation.alternatives.map((alt, index) => (
                    <div
                      key={index}
                      className="p-3 bg-background rounded-lg border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold">{alt.protocol}</h5>
                        <Badge variant="secondary">
                          {alt.apy.toFixed(2)}% APY
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {alt.pool}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="font-medium text-green-600">Pros:</p>
                          <ul className="list-disc list-inside">
                            {alt.pros.map((pro, i) => (
                              <li key={i}>{pro}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-600">Cons:</p>
                          <ul className="list-disc list-inside">
                            {alt.cons.map((con, i) => (
                              <li key={i}>{con}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      <CardFooter>
        <Alert className="w-full">
          <AlertDescription className="text-sm">
            💡 To deploy to {recommendation.recommended.protocol}, visit their
            platform directly or contact support for integration assistance.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
};

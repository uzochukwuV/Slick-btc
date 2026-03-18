"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { YieldOpportunity } from "@/types";

interface ProtocolCardProps {
  opportunity: YieldOpportunity;
}

export const ProtocolCard: React.FC<ProtocolCardProps> = ({ opportunity }) => {
  const getRiskBadgeVariant = (
    risk: string
  ): "default" | "secondary" | "destructive" => {
    switch (risk) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Get protocol URL based on protocol name
  const getProtocolUrl = (protocol: string): string => {
    const urls: Record<string, string> = {
      VELAR: "https://www.velar.co",
      ALEX: "https://alexlab.co",
    };
    return urls[protocol.toUpperCase()] || "#";
  };

  // Format large numbers
  const formatTvl = (value: number) => {
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    } else if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card className="cursor-pointer hover-lift transition-smooth animate-fade-in flex flex-col h-full">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl truncate">
                  {opportunity.protocol}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {opportunity.poolName}
                </CardDescription>
              </div>
              <Badge
                variant={getRiskBadgeVariant(opportunity.riskLevel)}
                className="shrink-0"
              >
                {opportunity.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="space-y-3">
              {/* APY Display */}
              <div className="py-2">
                <p className="text-xs text-muted-foreground mb-1">APY</p>
                <p className="text-3xl font-bold text-primary">
                  {opportunity.apy.toFixed(2)}%
                </p>
              </div>

              {/* TVL Display */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">TVL</span>
                <span className="text-base font-semibold">
                  {formatTvl(opportunity.tvl)}
                </span>
              </div>

              {/* Protocol Type Display */}
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-base font-semibold capitalize truncate ml-2">
                  {opportunity.protocolType.replace("_", " ")}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="mt-auto pt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full transition-smooth hover:scale-105"
              asChild
            >
              <a
                href={getProtocolUrl(opportunity.protocol)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn More
                <ExternalLink className="ml-2 h-3 w-3" />
              </a>
            </Button>
          </CardFooter>
        </Card>
      </HoverCardTrigger>

      <HoverCardContent className="w-80">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Details</h4>
          <div className="space-y-1 text-sm">
            {opportunity.minDeposit !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min Deposit:</span>
                <span className="font-medium">
                  {formatTvl(opportunity.minDeposit)}
                </span>
              </div>
            )}
            {opportunity.lockPeriod !== undefined &&
              opportunity.lockPeriod > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lock Period:</span>
                  <span className="font-medium">
                    {opportunity.lockPeriod} days
                  </span>
                </div>
              )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impermanent Loss:</span>
              <span className="font-medium">
                {opportunity.impermanentLossRisk ? "Possible" : "None"}
              </span>
            </div>
            {opportunity.auditStatus && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audit Status:</span>
                <span className="font-medium capitalize">
                  {opportunity.auditStatus.replace("_", " ")}
                </span>
              </div>
            )}
            {opportunity.performanceFee > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Performance Fee:</span>
                <span className="font-medium">
                  {opportunity.performanceFee}%
                </span>
              </div>
            )}
            {opportunity.riskFactors && opportunity.riskFactors.length > 0 && (
              <div className="mt-2">
                <span className="text-muted-foreground">Risk Factors:</span>
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {opportunity.riskFactors.slice(0, 2).map((factor, idx) => (
                    <li key={idx}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

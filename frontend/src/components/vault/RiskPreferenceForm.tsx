"use client";

import React, { useState } from "react";
import { Shield, TrendingUp, Zap, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/contexts/WalletContext";
import { setRiskPreference, getExplorerUrl } from "@/services/contractService";
import { clearUserCache } from "@/services/apiService";
import { toast } from "sonner";

type RiskLevel = 1 | 2 | 3;

interface RiskOption {
  value: RiskLevel;
  name: string;
  description: string;
  allocation: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const riskOptions: RiskOption[] = [
  {
    value: 1,
    name: "Conservative",
    description: "Lower risk, stable returns",
    allocation: "80% High APY / 20% Low APY",
    icon: <Shield className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900",
  },
  {
    value: 2,
    name: "Moderate",
    description: "Balanced risk and reward",
    allocation: "60% High APY / 40% Low APY",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-900",
  },
  {
    value: 3,
    name: "Aggressive",
    description: "Higher risk, maximum returns",
    allocation: "50% High APY / 50% Low APY",
    icon: <Zap className="h-5 w-5" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-900",
  },
];

interface RiskPreferenceFormProps {
  currentRisk?: number;
  onSuccess?: () => void;
}

export const RiskPreferenceForm: React.FC<RiskPreferenceFormProps> = ({
  currentRisk = 2,
  onSuccess,
}) => {
  const { refreshBalances, address } = useWallet();
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>(currentRisk as RiskLevel);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      await setRiskPreference(
        selectedRisk,
        async (data) => {
          toast.success("Risk preference updated!", {
            description: `Set to ${riskOptions[selectedRisk - 1].name}`,
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
      console.error("Risk preference error:", error);
      toast.error("Failed to update risk preference");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
        <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Choose Your Risk Level</p>
          <p className="text-xs text-muted-foreground">
            Your risk preference determines how your funds are allocated between ALEX and Velar pools.
            Higher risk may offer higher returns but with more volatility.
          </p>
        </div>
      </div>

      {/* Risk Options */}
      <div className="grid gap-4 md:grid-cols-3">
        {riskOptions.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all hover:scale-105 ${
              selectedRisk === option.value
                ? `ring-2 ring-offset-2 ring-offset-background ${option.borderColor.replace('border-', 'ring-')}`
                : "hover:border-primary/50"
            }`}
            onClick={() => !isSubmitting && setSelectedRisk(option.value)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${option.bgColor}`}>
                  <div className={option.color}>{option.icon}</div>
                </div>
                {selectedRisk === option.value && (
                  <Badge variant="default" className="animate-fade-in">
                    Selected
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="font-semibold">{option.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              </div>

              <div className={`p-2 rounded ${option.bgColor} border ${option.borderColor}`}>
                <p className="text-xs font-medium">{option.allocation}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current vs New */}
      {currentRisk !== selectedRisk && (
        <div className="p-4 rounded-lg bg-muted/50 border space-y-2 animate-fade-in">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Preference</span>
            <span className="font-semibold">{riskOptions[currentRisk - 1]?.name || "Not Set"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">New Preference</span>
            <span className="font-semibold text-primary">
              {riskOptions[selectedRisk - 1].name}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className="w-full transition-smooth hover:scale-105"
        disabled={isSubmitting || currentRisk === selectedRisk}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Submitting Transaction...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            {currentRisk === selectedRisk
              ? "No Changes to Apply"
              : `Set Risk to ${riskOptions[selectedRisk - 1].name}`}
          </>
        )}
      </Button>

      {currentRisk === selectedRisk && (
        <p className="text-xs text-center text-muted-foreground">
          Select a different risk level to update your preference
        </p>
      )}
    </div>
  );
};

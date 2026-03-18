"use client";

import React from "react";
import { BitYieldVault } from "@/components/vault/BitYieldVault";
import { Sparkles } from "lucide-react";

export default function VaultPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/10 to-background p-6 md:p-8 lg:p-12 animate-fade-in">
        <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
        <div className="space-y-3 md:space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 animate-scale-in">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-primary" />
            <span className="text-xs md:text-sm font-medium text-primary">
              Smart Vault for sBTC
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            BitYield Vault
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl">
            Automated yield optimization across ALEX and Velar protocols with intelligent rebalancing
          </p>
        </div>
      </div>

      <BitYieldVault />
    </div>
  );
}

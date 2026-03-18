"use client";

import React from "react";
import Link from "next/link";
import { useLendingPool } from "@/hooks/useLendingPool";
import { useWallet } from "@/contexts/WalletContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  Zap,
  Shield,
  Coins,
  ArrowRight,
  CheckCircle2,
  Lock,
  Percent,
  Clock,
} from "lucide-react";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;

export default function HomePage() {
  const { isConnected, connect } = useWallet();
  const { poolData } = useLendingPool();

  // Calculate lender APY
  const utilizationPercent = poolData.stxLendingStats.utilizationBps / 100;
  const borrowApr = poolData.stxLendingStats.interestRateBps / 100;
  const lenderApy = (borrowApr * utilizationPercent) / 100;

  const stats = [
    {
      label: "sBTC Deposits",
      value: `${(poolData.protocolStats.totalSbtcDeposits / SAT).toFixed(4)} sBTC`,
      subtext: "earning dual stacking",
    },
    {
      label: "STX Lent",
      value: `${(poolData.stxLendingStats.totalStxDeposited / MICRO_STX).toFixed(0)} STX`,
      subtext: `${lenderApy.toFixed(2)}% APY`,
    },
    {
      label: "STX Borrowed",
      value: `${(poolData.protocolStats.totalStxBorrowed / MICRO_STX).toFixed(0)} STX`,
      subtext: `${utilizationPercent.toFixed(0)}% utilization`,
    },
    {
      label: "Dual Stacking",
      value: poolData.dualStackingStatus.enrolled ? "Active" : "Ready",
      subtext: poolData.dualStackingStatus.enrolled ? "earning rewards" : "awaiting deposits",
    },
  ];

  const features = [
    {
      icon: TrendingUp,
      title: "Earn sBTC Yield",
      description: "Deposit sBTC to earn dual stacking rewards from the Stacks network. Auto-enrolled when pool reaches threshold.",
      href: "/earn",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Coins,
      title: "Lend STX",
      description: `Deposit STX to earn ${lenderApy.toFixed(2)}% APY from borrowers. Your STX enables the lending market.`,
      href: "/lend-stx",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Wallet,
      title: "Borrow STX",
      description: "Use your sBTC as collateral to borrow STX at 150% collateralization with 5% APR interest.",
      href: "/borrow",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: ArrowLeftRight,
      title: "Swap Assets",
      description: "Seamlessly swap between sBTC and STX with low 1% fees using our integrated exchange.",
      href: "/swap",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Zap,
      title: "Flash Loans",
      description: "Access uncollateralized sBTC loans for arbitrage and liquidations - repay in the same transaction.",
      href: "/lending",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  const benefits = [
    {
      icon: Shield,
      title: "Non-Custodial",
      description: "Your assets remain in your control through smart contracts on the Stacks blockchain.",
    },
    {
      icon: Percent,
      title: "Competitive Rates",
      description: "5% APR on loans with transparent, on-chain interest calculation.",
    },
    {
      icon: Coins,
      title: "Dual Stacking Rewards",
      description: "Earn extra sBTC rewards through Stacks' innovative dual stacking mechanism.",
    },
    {
      icon: Clock,
      title: "Real-Time Interest",
      description: "Interest accrues block-by-block with Clarity 4's stacks-block-time precision.",
    },
  ];

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 -z-10" />
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm">
              Built on Stacks &bull; Powered by Bitcoin
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
                sBTC Lending
              </span>
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Protocol
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Deposit sBTC to earn yield, borrow STX against your Bitcoin,
              or swap between assets - all secured by smart contracts on Stacks.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isConnected ? (
                <>
                  <Link href="/earn">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      <TrendingUp className="h-5 w-5" />
                      Start Earning
                    </Button>
                  </Link>
                  <Link href="/borrow">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                      <Wallet className="h-5 w-5" />
                      Borrow STX
                    </Button>
                  </Link>
                </>
              ) : (
                <Button size="lg" className="gap-2" onClick={connect}>
                  Connect Wallet to Start
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="text-center">
              <CardContent className="pt-6">
                <p className="text-2xl md:text-3xl font-bold font-mono">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">What You Can Do</h2>
          <p className="text-muted-foreground mt-2">
            A complete DeFi suite for your Bitcoin on Stacks
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Link key={i} href={feature.href}>
                <Card className="h-full hover:border-primary/50 transition-all duration-300 hover:shadow-lg group cursor-pointer">
                  <CardContent className="p-6 flex gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        {feature.title}
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2">
            Simple steps to start using the protocol
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-primary">1</span>
            </div>
            <h3 className="text-xl font-semibold">Connect Wallet</h3>
            <p className="text-muted-foreground">
              Connect your Leather or Xverse wallet to access the protocol on Stacks testnet.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-primary">2</span>
            </div>
            <h3 className="text-xl font-semibold">Choose Your Action</h3>
            <p className="text-muted-foreground">
              Deposit sBTC to earn yield, add collateral to borrow STX, or swap between assets.
            </p>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-primary">3</span>
            </div>
            <h3 className="text-xl font-semibold">Earn & Manage</h3>
            <p className="text-muted-foreground">
              Track your positions, claim dual stacking rewards, and manage your portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 p-8 md:p-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Why Choose Us</h2>
            <p className="text-muted-foreground mt-2">
              Built with security and transparency in mind
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, i) => {
              const Icon = benefit.icon;
              return (
                <div key={i} className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-background border flex items-center justify-center mx-auto">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Protocol Details */}
      <section className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Lending Parameters
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">STX Lender APY</span>
                  <span className="font-mono font-medium text-green-500">{lenderApy.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Borrow APR</span>
                  <span className="font-mono font-medium">5%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Collateral Ratio</span>
                  <span className="font-mono font-medium">150%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Liquidation Threshold</span>
                  <span className="font-mono font-medium">120%</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Flash Loan Fee</span>
                  <span className="font-mono font-medium">0.09%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Swap Fee</span>
                  <span className="font-mono font-medium">1%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Protocol Features
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Two-sided lending: STX lenders earn yield from borrowers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>sBTC depositors earn dual stacking rewards</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Borrow STX using sBTC as collateral (150% ratio)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Flash loans for arbitrage and liquidations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>sBTC ↔ STX swaps with oracle pricing</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Share-based accounting for fair yield distribution</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4">
        <Card className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border-orange-500/20">
          <CardContent className="p-8 md:p-12 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              Ready to put your Bitcoin to work?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Join the sBTC lending protocol on Stacks testnet and start earning yield
              or borrowing STX against your Bitcoin today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isConnected ? (
                <>
                  <Link href="/earn">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      Start Earning
                      <TrendingUp className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/lending">
                    <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                      View Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </>
              ) : (
                <Button size="lg" className="gap-2" onClick={connect}>
                  Connect Wallet
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

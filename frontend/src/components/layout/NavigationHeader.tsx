"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, Home, TrendingUp, Wallet, Coins, ArrowLeftRight, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useWallet } from "@/contexts/WalletContext";
import { useContract } from "@/hooks/useContract";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Earn",
    href: "/earn",
    icon: TrendingUp,
  },
  {
    title: "Lend STX",
    href: "/lend-stx",
    icon: Coins,
  },
  {
    title: "Lend USDCx",
    href: "/lend-usdcx",
    icon: DollarSign,
  },
  {
    title: "Borrow",
    href: "/borrow",
    icon: Wallet,
  },
  {
    title: "Swap",
    href: "/swap",
    icon: ArrowLeftRight,
  },
];

export const NavigationHeader: React.FC = () => {
  const pathname = usePathname();
  const { network } = useWallet();
  const { isPaused } = useContract();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side - Logo & Brand & Desktop Nav */}
        <div className="flex items-center gap-6 md:gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 transition-smooth hover:opacity-80"
          >
            <Image src="/logo.svg" alt="yieldr logo" width={28} height={28} />
            <span className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              yieldr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2 transition-smooth",
                      isActive &&
                        "bg-primary/10 text-primary hover:bg-primary/15"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side - Status Badges & Wallet */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Status Indicators */}
          <div className="hidden sm:flex items-center gap-2">
            {isPaused && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertCircle className="h-3 w-3" />
                <span className="hidden md:inline">Paused</span>
              </Badge>
            )}

            <Badge
              variant={network === "mainnet" ? "default" : "secondary"}
              className="gap-1"
            >
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  network === "mainnet"
                    ? "bg-green-500 animate-pulse"
                    : "bg-yellow-500"
                )}
              />
              <span className="hidden lg:inline">
                {network === "mainnet" ? "Mainnet" : "Testnet"}
              </span>
            </Badge>
          </div>

          {/* Wallet Button */}
          <WalletButton />
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t bg-background/50 backdrop-blur">
        <nav className="container mx-auto flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full gap-1 flex-col h-auto py-2 transition-smooth",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

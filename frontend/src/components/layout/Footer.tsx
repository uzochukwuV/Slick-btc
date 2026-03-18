"use client";

import React from "react";
import Link from "next/link";
import { Bitcoin } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="yieldr logo" width={28} height={28} />
              <h3 className="text-lg font-bold">yieldr</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI-powered sBTC yield optimization on the Stacks blockchain.
              Maximize your Bitcoin returns with intelligent DeFi strategies.
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                <Bitcoin className="h-3 w-3 mr-1" />
                Stacks
              </Badge>
              <Badge variant="outline" className="text-xs">
                v0.1.0
              </Badge>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4 tracking-wider uppercase">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://docs.stacks.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Stacks Docs
                </a>
              </li>
              <li>
                <a
                  href="https://explorer.hiro.so"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Explorer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              Built on{" "}
              <span className="font-semibold text-foreground">Stacks</span>
            </span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1">
              Secured by{" "}
              <span className="font-semibold text-foreground">Bitcoin</span>
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-4">
            <span>© {currentYear} yieldr. All rights reserved.</span>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">
              ⚠️ Disclaimer:
            </span>{" "}
            DeFi investments carry inherent risks including smart contract
            vulnerabilities, impermanent loss, and market volatility. yieldr
            smart contracts are currently in beta and have not undergone a
            third-party security audit. Never invest more than you can afford to
            lose. Always do your own research (DYOR) before making any
            investment decisions.
          </p>
        </div>
      </div>
    </footer>
  );
};

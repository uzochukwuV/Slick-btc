"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowDownUp, RefreshCw, Info } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useLendingPool } from "@/hooks/useLendingPool";
import {
  getSwapQuoteSbtcToStx,
  getSwapQuoteStxToSbtc,
  swapSbtcForStx,
  swapStxForSbtc,
} from "@/services/lendingPoolService";
import type { SwapQuote } from "@/types/lending";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;

const fmtSats = (sats: number) => (sats / SAT).toFixed(8);
const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);

export function SwapInterface() {
  const { isConnected, connect } = useWallet();
  const { poolData, isLoading, refetch } = useLendingPool();
  const { swapStats } = poolData;

  const [direction, setDirection] = useState<"sbtc-to-stx" | "stx-to-sbtc">("sbtc-to-stx");
  const [inputAmount, setInputAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const fetchQuote = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    try {
      if (direction === "sbtc-to-stx") {
        const q = await getSwapQuoteSbtcToStx(toSats(inputAmount));
        setQuote(q);
      } else {
        const q = await getSwapQuoteStxToSbtc(toMicroStx(inputAmount));
        setQuote(q);
      }
    } catch (e) {
      console.error("Quote error:", e);
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [inputAmount, direction]);

  useEffect(() => {
    const timer = setTimeout(fetchQuote, 300);
    return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleSwitch = () => {
    setDirection(direction === "sbtc-to-stx" ? "stx-to-sbtc" : "sbtc-to-stx");
    setInputAmount("");
    setQuote(null);
  };

  const handleSwap = () => {
    if (!quote) return;
    setPending(true);

    const cb = {
      onFinish: (d: { txId: string }) => {
        console.log("Swap tx:", d.txId);
        setPending(false);
        setInputAmount("");
        setQuote(null);
        setTimeout(refetch, 3000);
      },
      onCancel: () => setPending(false),
    };

    if (direction === "sbtc-to-stx") {
      swapSbtcForStx(toSats(inputAmount), cb);
    } else {
      swapStxForSbtc(toMicroStx(inputAmount), cb);
    }
  };

  const inputToken = direction === "sbtc-to-stx" ? "sBTC" : "STX";
  const outputToken = direction === "sbtc-to-stx" ? "STX" : "sBTC";

  const outputFormatted = quote
    ? direction === "sbtc-to-stx"
      ? fmtStx(quote.outputAmount)
      : fmtSats(quote.outputAmount)
    : "0";

  const feeFormatted = quote
    ? direction === "sbtc-to-stx"
      ? `${fmtStx(quote.fee)} STX`
      : `${fmtSats(quote.fee)} sBTC`
    : "0";

  const availableLiquidity = direction === "sbtc-to-stx"
    ? `${fmtStx(swapStats.stxLiquidity)} STX`
    : `${fmtSats(swapStats.sbtcReserve)} sBTC`;

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Swap</CardTitle>
              <CardDescription>Exchange sBTC and STX with 1% fee</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Swap status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={swapStats.enabled ? "default" : "destructive"}>
              {swapStats.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">You pay</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={`0.00 ${inputToken}`}
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                min="0"
                step={direction === "sbtc-to-stx" ? "0.00000001" : "0.000001"}
                className="text-lg"
              />
              <Button variant="secondary" className="min-w-[80px]" disabled>
                {inputToken}
              </Button>
            </div>
          </div>

          {/* Switch button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwitch}
              className="rounded-full border"
            >
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Output */}
          <div className="space-y-2">
            <label className="text-sm font-medium">You receive</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center px-3 bg-muted rounded-md text-lg font-mono">
                {quoteLoading ? "..." : outputFormatted}
              </div>
              <Button variant="secondary" className="min-w-[80px]" disabled>
                {outputToken}
              </Button>
            </div>
          </div>

          {/* Quote details */}
          {quote && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-mono">{quote.price} μSTX/sat</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (1%)</span>
                <span className="font-mono">{feeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available liquidity</span>
                <span className="font-mono">{availableLiquidity}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Swap button */}
          {!isConnected ? (
            <Button onClick={connect} className="w-full">
              Connect Wallet
            </Button>
          ) : !swapStats.enabled ? (
            <Button disabled className="w-full">
              Swaps Disabled
            </Button>
          ) : (
            <Button
              onClick={handleSwap}
              disabled={!quote || pending || quote.outputAmount === 0}
              className="w-full"
            >
              {pending ? "Swapping..." : `Swap ${inputToken} for ${outputToken}`}
            </Button>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Swaps use the pool&apos;s oracle price ({swapStats.price} μSTX/sat).
              A 1% fee is charged on each swap.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats card */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Swap Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Volume (sBTC)</span>
            <span className="font-mono">{fmtSats(swapStats.totalVolumeSbtc)} sBTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Volume (STX)</span>
            <span className="font-mono">{fmtStx(swapStats.totalVolumeStx)} STX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fees Collected (sBTC)</span>
            <span className="font-mono">{fmtSats(swapStats.totalFeesSbtc)} sBTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fees Collected (STX)</span>
            <span className="font-mono">{fmtStx(swapStats.totalFeesStx)} STX</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">sBTC Reserve</span>
            <span className="font-mono">{fmtSats(swapStats.sbtcReserve)} sBTC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">STX Liquidity</span>
            <span className="font-mono">{fmtStx(swapStats.stxLiquidity)} STX</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

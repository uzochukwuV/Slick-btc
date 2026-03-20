"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownUp, RefreshCw, Info, Bitcoin, Coins, DollarSign } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useLendingPool } from "@/hooks/useLendingPool";
import {
  getSwapQuoteSbtcToStx,
  getSwapQuoteStxToSbtc,
  swapSbtcForStx,
  swapStxForSbtc,
  swapSbtcToUsdcx,
  swapUsdcxToSbtc,
  swapStxToUsdcx,
  swapUsdcxToStx,
} from "@/services/lendingPoolService";
import type { SwapQuote } from "@/types/lending";

const SAT = 100_000_000;
const MICRO_STX = 1_000_000;
const MICRO_USDCX = 1_000_000;

const fmtSats = (sats: number) => (sats / SAT).toFixed(8);
const fmtStx = (micro: number) => (micro / MICRO_STX).toFixed(6);
const fmtUsdcx = (micro: number) => (micro / MICRO_USDCX).toFixed(2);
const toSats = (btc: string) => Math.floor(parseFloat(btc || "0") * SAT);
const toMicroStx = (stx: string) => Math.floor(parseFloat(stx || "0") * MICRO_STX);
const toMicroUsdcx = (usdcx: string) => Math.floor(parseFloat(usdcx || "0") * MICRO_USDCX);

type SwapPair = "sbtc-stx" | "sbtc-usdcx" | "stx-usdcx";
type SwapDirection = "a-to-b" | "b-to-a";

export function SwapInterface() {
  const { isConnected, connect } = useWallet();
  const { poolData, isLoading, refetch } = useLendingPool();
  const { swapStats, usdcxSwapStats } = poolData;

  const [activePair, setActivePair] = useState<SwapPair>("sbtc-stx");
  const [direction, setDirection] = useState<SwapDirection>("a-to-b");
  const [inputAmount, setInputAmount] = useState("");
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pending, setPending] = useState(false);

  // Get token names based on pair and direction
  const getTokens = () => {
    switch (activePair) {
      case "sbtc-stx":
        return direction === "a-to-b"
          ? { input: "sBTC", output: "STX" }
          : { input: "STX", output: "sBTC" };
      case "sbtc-usdcx":
        return direction === "a-to-b"
          ? { input: "sBTC", output: "USDCx" }
          : { input: "USDCx", output: "sBTC" };
      case "stx-usdcx":
        return direction === "a-to-b"
          ? { input: "STX", output: "USDCx" }
          : { input: "USDCx", output: "STX" };
    }
  };

  const tokens = getTokens();

  const fetchQuote = useCallback(async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      return;
    }

    setQuoteLoading(true);
    try {
      // For sBTC/STX pair, use existing quote functions
      if (activePair === "sbtc-stx") {
        if (direction === "a-to-b") {
          const q = await getSwapQuoteSbtcToStx(toSats(inputAmount));
          setQuote(q);
        } else {
          const q = await getSwapQuoteStxToSbtc(toMicroStx(inputAmount));
          setQuote(q);
        }
      } else {
        // For USDCx pairs, calculate quote locally based on prices
        // USDCx is $1.00, sBTC price in STX, STX/USDCx from oracle
        const fee = 0.01; // 1% fee
        let outputAmount = 0;
        let feeAmount = 0;
        let price = 0;

        if (activePair === "sbtc-usdcx") {
          // sBTC to USDCx or vice versa
          // 1 sBTC sat = stxPerSbtc microSTX
          // 1 STX = stxUsdcxPrice micro-USDCx (scaled)
          const sbtcUsdPrice = usdcxSwapStats.sbtcUsdcxPrice; // USD value per sat (scaled)
          if (direction === "a-to-b") {
            // sBTC -> USDCx
            const inputSats = toSats(inputAmount);
            const grossOutput = (inputSats * sbtcUsdPrice) / SAT;
            feeAmount = Math.floor(grossOutput * fee);
            outputAmount = grossOutput - feeAmount;
            price = sbtcUsdPrice;
          } else {
            // USDCx -> sBTC
            const inputUsdcx = toMicroUsdcx(inputAmount);
            const grossOutput = (inputUsdcx * SAT) / sbtcUsdPrice;
            feeAmount = Math.floor(grossOutput * fee);
            outputAmount = grossOutput - feeAmount;
            price = sbtcUsdPrice;
          }
        } else if (activePair === "stx-usdcx") {
          // STX to USDCx or vice versa
          const stxUsdPrice = usdcxSwapStats.stxUsdcxPrice; // micro-USDCx per micro-STX (scaled)
          if (direction === "a-to-b") {
            // STX -> USDCx
            const inputMicro = toMicroStx(inputAmount);
            const grossOutput = (inputMicro * stxUsdPrice) / MICRO_STX;
            feeAmount = Math.floor(grossOutput * fee);
            outputAmount = grossOutput - feeAmount;
            price = stxUsdPrice;
          } else {
            // USDCx -> STX
            const inputUsdcx = toMicroUsdcx(inputAmount);
            const grossOutput = (inputUsdcx * MICRO_STX) / stxUsdPrice;
            feeAmount = Math.floor(grossOutput * fee);
            outputAmount = grossOutput - feeAmount;
            price = stxUsdPrice;
          }
        }

        setQuote({
          inputAmount: parseFloat(inputAmount),
          outputAmount: Math.floor(outputAmount),
          fee: Math.floor(feeAmount),
          price,
        });
      }
    } catch (e) {
      console.error("Quote error:", e);
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [inputAmount, activePair, direction, usdcxSwapStats]);

  useEffect(() => {
    fetchQuote()
    // const timer = setTimeout(fetchQuote, 200000);
    // return () => clearTimeout(timer);
  }, [fetchQuote]);

  const handleSwitch = () => {
    setDirection(direction === "a-to-b" ? "b-to-a" : "a-to-b");
    setInputAmount("");
    setQuote(null);
  };

  const handlePairChange = (pair: SwapPair) => {
    setActivePair(pair);
    setDirection("a-to-b");
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

    if (activePair === "sbtc-stx") {
      if (direction === "a-to-b") {
        swapSbtcForStx(toSats(inputAmount), cb);
      } else {
        swapStxForSbtc(toMicroStx(inputAmount), cb);
      }
    } else if (activePair === "sbtc-usdcx") {
      if (direction === "a-to-b") {
        swapSbtcToUsdcx(toSats(inputAmount), cb);
      } else {
        swapUsdcxToSbtc(toMicroUsdcx(inputAmount), cb);
      }
    } else if (activePair === "stx-usdcx") {
      if (direction === "a-to-b") {
        swapStxToUsdcx(toMicroStx(inputAmount), cb);
      } else {
        swapUsdcxToStx(toMicroUsdcx(inputAmount), cb);
      }
    }
  };

  // Format output based on token type
  const formatOutput = (amount: number, token: string) => {
    switch (token) {
      case "sBTC":
        return fmtSats(amount);
      case "STX":
        return fmtStx(amount);
      case "USDCx":
        return fmtUsdcx(amount);
      default:
        return amount.toString();
    }
  };

  // Format fee based on token type
  const formatFee = (amount: number, token: string) => {
    switch (token) {
      case "sBTC":
        return `${fmtSats(amount)} sBTC`;
      case "STX":
        return `${fmtStx(amount)} STX`;
      case "USDCx":
        return `$${fmtUsdcx(amount)}`;
      default:
        return amount.toString();
    }
  };

  // Get input step based on token
  const getInputStep = (token: string) => {
    switch (token) {
      case "sBTC":
        return "0.00000001";
      case "STX":
        return "0.000001";
      case "USDCx":
        return "0.01";
      default:
        return "0.01";
    }
  };

  // Get placeholder based on token
  const getPlaceholder = (token: string) => {
    switch (token) {
      case "USDCx":
        return "$0.00";
      default:
        return `0.00 ${token}`;
    }
  };

  // Check if swaps are enabled for the selected pair
  const isSwapEnabled = activePair === "sbtc-stx" ? swapStats.enabled : usdcxSwapStats.swapEnabled;

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Swap</CardTitle>
              <CardDescription>Exchange sBTC, STX, and USDCx with 1% fee</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={refetch} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pair selector */}
          <Tabs value={activePair} onValueChange={(v) => handlePairChange(v as SwapPair)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sbtc-stx" className="gap-1 text-xs">
                <Bitcoin className="h-3 w-3" />
                sBTC/STX
              </TabsTrigger>
              <TabsTrigger value="sbtc-usdcx" className="gap-1 text-xs">
                <Bitcoin className="h-3 w-3" />
                sBTC/$
              </TabsTrigger>
              <TabsTrigger value="stx-usdcx" className="gap-1 text-xs">
                <Coins className="h-3 w-3" />
                STX/$
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Swap status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={isSwapEnabled ? "default" : "destructive"}>
              {isSwapEnabled ? "Active" : "Disabled"}
            </Badge>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">You pay</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                {tokens.input === "USDCx" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                )}
                <Input
                  type="number"
                  placeholder={getPlaceholder(tokens.input)}
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  min="0"
                  step={getInputStep(tokens.input)}
                  className={`text-lg ${tokens.input === "USDCx" ? "pl-7" : ""}`}
                />
              </div>
              <Button variant="secondary" className="min-w-[80px]" disabled>
                {tokens.input === "USDCx" ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    USDCx
                  </span>
                ) : (
                  tokens.input
                )}
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
                {tokens.output === "USDCx" && <span className="text-muted-foreground mr-1">$</span>}
                {quoteLoading ? "..." : quote ? formatOutput(quote.outputAmount, tokens.output) : "0"}
              </div>
              <Button variant="secondary" className="min-w-[80px]" disabled>
                {tokens.output === "USDCx" ? (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    USDCx
                  </span>
                ) : (
                  tokens.output
                )}
              </Button>
            </div>
          </div>

          {/* Quote details */}
          {quote && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-mono">
                  {activePair === "sbtc-stx" && `${quote.price} μSTX/sat`}
                  {activePair === "sbtc-usdcx" && `$${(quote.price / SAT).toFixed(2)}/sBTC`}
                  {activePair === "stx-usdcx" && `$${(quote.price / MICRO_STX).toFixed(4)}/STX`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee (1%)</span>
                <span className="font-mono">{formatFee(quote.fee, tokens.output)}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Swap button */}
          {!isConnected ? (
            <Button onClick={connect} className="w-full">
              Connect Wallet
            </Button>
          ) : !isSwapEnabled ? (
            <Button disabled className="w-full">
              Swaps Disabled
            </Button>
          ) : (
            <Button
              onClick={handleSwap}
              disabled={!quote || pending || quote.outputAmount === 0}
              className="w-full"
            >
              {pending ? "Swapping..." : `Swap ${tokens.input} for ${tokens.output}`}
            </Button>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              {activePair === "sbtc-stx" && `Swaps use the pool's oracle price (${swapStats.price} μSTX/sat).`}
              {activePair === "sbtc-usdcx" && `USDCx is pegged to $1 USD. Price: $${(usdcxSwapStats.sbtcUsdcxPrice / SAT).toFixed(2)}/sBTC.`}
              {activePair === "stx-usdcx" && `USDCx is pegged to $1 USD. Price: $${(usdcxSwapStats.stxUsdcxPrice / MICRO_STX).toFixed(4)}/STX.`}
              {" "}A 1% fee is charged on each swap.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats card */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Swap Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* sBTC/STX Stats */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Bitcoin className="h-3 w-3" />
              sBTC / STX
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume (sBTC)</span>
                <span className="font-mono">{fmtSats(swapStats.totalVolumeSbtc)} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume (STX)</span>
                <span className="font-mono">{fmtStx(swapStats.totalVolumeStx)} STX</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">sBTC Reserve</span>
                <span className="font-mono">{fmtSats(swapStats.sbtcReserve)} sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STX Liquidity</span>
                <span className="font-mono">{fmtStx(swapStats.stxLiquidity)} STX</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* USDCx Stats */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-green-500" />
              USDCx Swaps
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-mono">${fmtUsdcx(usdcxSwapStats.totalVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fees Collected</span>
                <span className="font-mono">${fmtUsdcx(usdcxSwapStats.totalFees)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">sBTC/USDCx Price</span>
                <span className="font-mono">${(usdcxSwapStats.sbtcUsdcxPrice / SAT).toFixed(2)}/sBTC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">STX/USDCx Price</span>
                <span className="font-mono">${(usdcxSwapStats.stxUsdcxPrice / MICRO_STX).toFixed(4)}/STX</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

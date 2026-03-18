"use client";

import React, { useState } from "react";
import { Wallet, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/contexts/WalletContext";
import { Spinner } from "@/components/ui/spinner";

export const WalletButton: React.FC = () => {
  const {
    isConnected,
    address,
    stxBalance,
    sbtcBalance,
    connect,
    disconnect,
    refreshBalances,
    isLoading,
  } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Truncate address for display
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!isConnected) {
    return (
      <Button
        onClick={connect}
        disabled={isLoading}
        className="transition-smooth hover:scale-105"
      >
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Wallet className="mr-2 h-4 w-4" />
          {address ? truncateAddress(address) : "Connected"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-sm">
          <p className="font-medium mb-1">Address</p>
          <p className="text-muted-foreground font-mono text-xs break-all">
            {address}
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">STX Balance:</span>
            <span className="font-medium">{stxBalance.toFixed(2)} STX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">sBTC Balance:</span>
            <span className="font-medium">{sbtcBalance.toFixed(4)} sBTC</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          {isRefreshing ? "Refreshing..." : "Refresh Balances"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={disconnect}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ArrowDown, ArrowUp, Clock } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { getNetwork } from "@/services/walletService";

interface Transaction {
  txId: string;
  txStatus: string;
  type: "deposit" | "withdrawal" | "deposit-for";
  blockHeight: number;
  blockTime: number;
  amount?: number;
}

export const TransactionHistory: React.FC = () => {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const network = getNetwork();
        const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
        const contractName =
          process.env.NEXT_PUBLIC_CONTRACT_NAME || "bityield-vault-updated";

        // Fetch transactions involving this user and the vault contract
        const url = `${network.client.baseUrl}/extended/v1/address/${address}/transactions?limit=20`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }

        const data = await response.json();

        // Filter and parse vault-related transactions
        const vaultTxs: Transaction[] = data.results
          .filter(
            (tx: {
              tx_type: string;
              contract_call: { contract_id: string };
            }) => {
              // Check if transaction involves the vault contract
              if (tx.tx_type !== "contract_call") return false;

              const isVaultTx =
                tx.contract_call?.contract_id ===
                `${contractAddress}.${contractName}`;

              return isVaultTx;
            }
          )
          .map(
            (tx: {
              burn_block_time: number;
              block_height: number;
              tx_id: string;
              tx_status: string;
              contract_call: { function_name: string };
            }) => {
              const functionName = tx.contract_call?.function_name || "";

              let type: "deposit" | "withdrawal" | "deposit-for" = "deposit";
              if (functionName === "withdraw-sbtc") {
                type = "withdrawal";
              } else if (functionName === "deposit-for") {
                type = "deposit-for";
              }

              return {
                txId: tx.tx_id,
                txStatus: tx.tx_status,
                type,
                blockHeight: tx.block_height,
                blockTime: tx.burn_block_time,
              };
            }
          );

        setTransactions(vaultTxs);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transaction history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [address]);

  const getExplorerUrl = (txId: string) => {
    const network = getNetwork();
    const isMainnet = network.chainId === 1;
    return `https://explorer.hiro.so/txid/${txId}?chain=${isMainnet ? "mainnet" : "testnet"}`;
  };

  const getTypeIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
      case "deposit-for":
        return <ArrowDown className="h-4 w-4 text-green-500" />;
      case "withdrawal":
        return <ArrowUp className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeLabel = (type: Transaction["type"]) => {
    switch (type) {
      case "deposit":
        return "Deposit";
      case "deposit-for":
        return "Gift Deposit";
      case "withdrawal":
        return "Withdrawal";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="default">Success</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "failed":
      case "abort_by_response":
      case "abort_by_post_condition":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!address) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Your recent vault transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm mt-2">
              Your vault transactions will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.txId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getTypeIcon(tx.type)}
                  <div>
                    <div className="font-medium">{getTypeLabel(tx.type)}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(tx.blockTime)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Block #{tx.blockHeight.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(tx.txStatus)}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      window.open(getExplorerUrl(tx.txId), "_blank")
                    }
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

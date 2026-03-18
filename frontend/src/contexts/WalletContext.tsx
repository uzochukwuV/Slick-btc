"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { WalletState } from "@/types";
import {
  connectWallet as connectWalletService,
  disconnectWallet as disconnectWalletService,
  isWalletConnected,
  getUserAddress,
  fetchStxBalance,
  fetchSbtcBalance,
} from "@/services/walletService";

interface WalletContextType extends WalletState {
  connect: () => void;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    stxBalance: 0,
    sbtcBalance: 0,
    network:
      (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Refresh balances
  const refreshBalances = useCallback(async () => {
    if (!walletState.address) return;

    try {
      const [stxBalance, sbtcBalance] = await Promise.all([
        fetchStxBalance(walletState.address),
        fetchSbtcBalance(walletState.address),
      ]);

      setWalletState((prev) => ({
        ...prev,
        stxBalance,
        sbtcBalance,
      }));
    } catch (error) {
      console.error("Error refreshing balances:", error);
    }
  }, [walletState.address]);

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      setIsLoading(true);

      // Check if user is connected
      if (isWalletConnected()) {
        const address = getUserAddress();
        if (address) {
          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            address,
          }));

          // Fetch balances
          try {
            const [stxBalance, sbtcBalance] = await Promise.all([
              fetchStxBalance(address),
              fetchSbtcBalance(address),
            ]);

            setWalletState((prev) => ({
              ...prev,
              stxBalance,
              sbtcBalance,
            }));
          } catch (error) {
            console.error("Error fetching balances:", error);
          }
        }
      }

      setIsLoading(false);
    };

    checkConnection();
  }, []);

  // Poll balances every 30 seconds when connected
  useEffect(() => {
    if (!walletState.isConnected || !walletState.address) return;

    const interval = setInterval(() => {
      refreshBalances();
    }, 300000); // 30 seconds

    return () => clearInterval(interval);
  }, [walletState.isConnected, walletState.address, refreshBalances]);

  // Connect wallet
  const connect = useCallback(async () => {
    try {
      await connectWalletService(async () => {
        // After connection, update state
        const address = getUserAddress();
        if (address) {
          setWalletState((prev) => ({
            ...prev,
            isConnected: true,
            address,
          }));

          // Fetch balances
          try {
            const [stxBalance, sbtcBalance] = await Promise.all([
              fetchStxBalance(address),
              fetchSbtcBalance(address),
            ]);

            setWalletState((prev) => ({
              ...prev,
              stxBalance,
              sbtcBalance,
            }));
          } catch (error) {
            console.error("Error fetching balances:", error);
          }
        }
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    disconnectWalletService();
    setWalletState({
      isConnected: false,
      address: null,
      stxBalance: 0,
      sbtcBalance: 0,
      network:
        (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet",
    });
  }, []);

  return (
    <WalletContext.Provider
      value={{
        ...walletState,
        connect,
        disconnect,
        refreshBalances,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

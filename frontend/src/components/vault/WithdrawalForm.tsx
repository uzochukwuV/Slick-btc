"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ArrowUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/contexts/WalletContext";
import { withdrawSbtc, getExplorerUrl } from "@/services/contractService";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  amount: z
    .number()
    .min(0.0001, { message: "Minimum withdrawal is 0.0001 sBTC" })
    .max(1000, { message: "Maximum withdrawal is 1000 sBTC" }),
});

export const WithdrawalForm: React.FC = () => {
  const { refreshBalances } = useWallet();
  const { vaultData, refetch } = useContract();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0.1,
    },
  });

  // Set preset percentages
  const setPreset = (percentage: number) => {
    const amount = (vaultData.userBalance * percentage) / 100;
    form.setValue("amount", Math.max(0.0001, amount));
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.amount > vaultData.userBalance) {
      toast.error("Insufficient vault balance");
      return;
    }

    // Show confirmation dialog
    setPendingAmount(values.amount);
    setShowConfirmDialog(true);
  };

  // Confirm withdrawal
  const confirmWithdrawal = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      await withdrawSbtc(
        pendingAmount,
        (data) => {
          toast.success("Withdrawal transaction submitted!", {
            description: `Transaction ID: ${data.txId.slice(0, 8)}...`,
            action: {
              label: "View",
              onClick: () => window.open(getExplorerUrl(data.txId), "_blank"),
            },
          });

          form.reset();
          refreshBalances();
          refetch();
          setIsSubmitting(false);
        },
        () => {
          toast.error("Transaction cancelled");
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error("Failed to submit withdrawal transaction");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Warning alert */}
          {vaultData.userBalance === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have no sBTC deposited in the vault. Please deposit first.
              </AlertDescription>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>sBTC Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.1"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    disabled={isSubmitting || vaultData.userBalance === 0}
                  />
                </FormControl>
                <FormDescription>
                  Vault Balance: {vaultData.userBalance.toFixed(4)} sBTC
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Preset buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(25)}
              disabled={isSubmitting || vaultData.userBalance === 0}
            >
              25%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(50)}
              disabled={isSubmitting || vaultData.userBalance === 0}
            >
              50%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(75)}
              disabled={isSubmitting || vaultData.userBalance === 0}
            >
              75%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(100)}
              disabled={isSubmitting || vaultData.userBalance === 0}
            >
              MAX
            </Button>
          </div>

          {/* Slider */}
          {vaultData.userBalance > 0 && (
            <div className="space-y-2">
              <FormLabel>Amount Slider</FormLabel>
              <Slider
                min={0.0001}
                max={vaultData.userBalance}
                step={0.0001}
                value={[form.watch("amount")]}
                onValueChange={([value]) => form.setValue("amount", value)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || vaultData.userBalance === 0}
            variant="secondary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowUp className="mr-2 h-4 w-4" />
                Withdraw sBTC
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to withdraw {pendingAmount.toFixed(4)} sBTC
              from the vault? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmWithdrawal}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

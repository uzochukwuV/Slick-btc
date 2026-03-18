"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Gift } from "lucide-react";
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
import { useWallet } from "@/contexts/WalletContext";
import { depositFor, getExplorerUrl } from "@/services/contractService";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  recipient: z
    .string()
    .min(1, { message: "Recipient address is required" })
    .regex(/^S[0-9A-Z]{39}$/, { message: "Invalid Stacks address" }),
  amount: z
    .number()
    .min(0.1, { message: "Minimum deposit is 0.1 sBTC" })
    .max(1000, { message: "Maximum deposit is 1000 sBTC" }),
});

export const DepositForForm: React.FC = () => {
  const { sbtcBalance, refreshBalances } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipient: "",
      amount: 0.1,
    },
  });

  // Set preset percentages
  const setPreset = (percentage: number) => {
    const amount = (sbtcBalance * percentage) / 100;
    form.setValue("amount", Math.max(0.1, Math.min(amount, 1000)));
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.amount > sbtcBalance) {
      toast.error("Insufficient sBTC balance");
      return;
    }

    setIsSubmitting(true);

    try {
      await depositFor(
        values.recipient,
        values.amount,
        (data) => {
          toast.success("Deposit-for transaction submitted!", {
            description: `Deposited ${values.amount} sBTC for ${values.recipient.slice(0, 10)}...`,
            action: {
              label: "View",
              onClick: () => window.open(getExplorerUrl(data.txId), "_blank"),
            },
          });

          form.reset();
          refreshBalances();
          setIsSubmitting(false);
        },
        () => {
          toast.error("Transaction cancelled");
          setIsSubmitting(false);
        }
      );
    } catch (error) {
      console.error("Deposit-for error:", error);
      toast.error("Failed to submit deposit-for transaction");
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Gift className="h-4 w-4" />
          <AlertDescription>
            Deposit sBTC on behalf of another user. You pay, they receive the
            vault balance.
          </AlertDescription>
        </Alert>

        {/* Recipient Address */}
        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                The Stacks address that will receive the deposit
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
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
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Your Available Balance: {sbtcBalance.toFixed(4)} sBTC
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
            disabled={isSubmitting}
          >
            25%
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(50)}
            disabled={isSubmitting}
          >
            50%
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(75)}
            disabled={isSubmitting}
          >
            75%
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreset(100)}
            disabled={isSubmitting}
          >
            MAX
          </Button>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <FormLabel>Amount Slider</FormLabel>
          <Slider
            min={0.1}
            max={Math.min(sbtcBalance, 1000)}
            step={0.01}
            value={[form.watch("amount")]}
            onValueChange={([value]) => form.setValue("amount", value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Gift className="mr-2 h-4 w-4" />
              Gift sBTC Deposit
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

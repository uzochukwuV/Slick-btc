"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDown, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import { useWallet } from "@/contexts/WalletContext";
import { depositSbtc, getExplorerUrl } from "@/services/contractService";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  amount: z
    .number()
    .min(0.1, { message: "Minimum deposit is 0.1 sBTC" })
    .max(1000, { message: "Maximum deposit is 1000 sBTC" }),
});

export const DepositForm: React.FC = () => {
  const { sbtcBalance, refreshBalances } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      await depositSbtc(
        values.amount,
        (data) => {
          toast.success("Deposit transaction submitted!", {
            description: `Transaction ID: ${data.txId.slice(0, 8)}...`,
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
      console.error("Deposit error:", error);
      toast.error("Failed to submit deposit transaction");
      setIsSubmitting(false);
    }
  };

  const currentAmount = form.watch("amount");
  const isValid = currentAmount >= 0.1 && currentAmount <= sbtcBalance;
  const percentageOfBalance =
    sbtcBalance > 0 ? (currentAmount / sbtcBalance) * 100 : 0;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 animate-fade-in"
      >
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-semibold">
                  sBTC Amount
                </FormLabel>
                {isValid && currentAmount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-600 animate-fade-in">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Valid amount</span>
                  </div>
                )}
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="0.1"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                    disabled={isSubmitting}
                    className="pr-16 text-lg font-medium transition-smooth"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    sBTC
                  </div>
                </div>
              </FormControl>
              <div className="flex items-center justify-between text-sm">
                <FormDescription className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Available:{" "}
                  <span className="font-semibold">
                    {sbtcBalance.toFixed(4)} sBTC
                  </span>
                </FormDescription>
                {percentageOfBalance > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {percentageOfBalance.toFixed(1)}% of balance
                  </span>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Preset buttons */}
        <div className="space-y-2">
          <FormLabel className="text-sm text-muted-foreground">
            Quick Select
          </FormLabel>
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(25)}
              disabled={isSubmitting}
              className="transition-smooth hover:scale-105 hover:border-primary"
            >
              25%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(50)}
              disabled={isSubmitting}
              className="transition-smooth hover:scale-105 hover:border-primary"
            >
              50%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(75)}
              disabled={isSubmitting}
              className="transition-smooth hover:scale-105 hover:border-primary"
            >
              75%
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreset(100)}
              disabled={isSubmitting}
              className="transition-smooth hover:scale-105 hover:border-primary font-semibold"
            >
              MAX
            </Button>
          </div>
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

        {/* Deposit Summary */}
        {currentAmount >= 0.1 && (
          <div className="p-4 rounded-lg bg-muted/50 border space-y-2 animate-fade-in">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deposit Amount</span>
              <span className="font-semibold">
                {currentAmount.toFixed(4)} sBTC
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining Balance</span>
              <span className="font-semibold">
                {Math.max(0, sbtcBalance - currentAmount).toFixed(4)} sBTC
              </span>
            </div>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full transition-smooth hover:scale-105"
          disabled={isSubmitting || !isValid}
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Submitting Transaction...
            </>
          ) : (
            <>
              <ArrowDown className="mr-2 h-4 w-4" />
              Deposit {currentAmount > 0 ? currentAmount.toFixed(4) : ""} sBTC
            </>
          )}
        </Button>

        {!isValid && currentAmount > 0 && (
          <p className="text-xs text-center text-destructive animate-fade-in">
            {currentAmount < 0.1
              ? "Minimum deposit is 0.1 sBTC"
              : "Insufficient balance"}
          </p>
        )}
      </form>
    </Form>
  );
};

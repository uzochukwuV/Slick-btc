import { LendingInterface } from "@/components/lending/LendingInterface";

export const metadata = {
  title: "sBTC Lending Pool",
  description: "Deposit, borrow, and earn dual stacking rewards on Bitcoin.",
};

export default function LendingPage() {
  return <LendingInterface />;
}

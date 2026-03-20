import { LendUsdcxInterface } from "@/components/lend-usdcx/LendUsdcxInterface";

export const metadata = {
  title: "Lend USDCx | sBTC Lending Pool",
  description: "Deposit USDCx stablecoins to earn interest from sBTC borrowers.",
};

export default function LendUsdcxPage() {
  return <LendUsdcxInterface />;
}

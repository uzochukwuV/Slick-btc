import { BorrowInterface } from "@/components/borrow/BorrowInterface";

export const metadata = {
  title: "Borrow | sBTC Lending Pool",
  description: "Borrow STX against your sBTC collateral.",
};

export default function BorrowPage() {
  return <BorrowInterface />;
}

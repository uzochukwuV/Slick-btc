"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BitYieldPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the unified vault page
    router.replace("/vault");
  }, [router]);

  return null;
}

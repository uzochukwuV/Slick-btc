"use client";

import React, { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { getLatestDataSource } from "@/services/apiService";

export const DataSourceNotice: React.FC = () => {
  const [dataSource, setDataSource] = useState<{
    network: string;
    note?: string;
  } | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check for data source info periodically
    const checkDataSource = () => {
      const source = getLatestDataSource();
      if (source) {
        setDataSource(source);
      }
    };

    checkDataSource();
    const interval = setInterval(checkDataSource, 5000);

    return () => clearInterval(interval);
  }, []);

  // Don't show if dismissed or no data source info
  if (isDismissed || !dataSource || !dataSource.note) {
    return null;
  }

  // Only show for mainnet data
  if (dataSource.network !== "mainnet") {
    return null;
  }

  return (
    <div className="mb-6 relative">
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20 dark:border-blue-900">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          <span className="font-semibold">Data Source: </span>
          {dataSource.note}
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="flex-shrink-0 rounded-md p-1 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </button>
      </div>
    </div>
  );
};

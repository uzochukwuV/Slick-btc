"use client";

import React from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YieldOpportunity } from "@/types";

interface YieldChartsProps {
  opportunities: YieldOpportunity[];
}

// Color palette for protocols
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"];

export const YieldCharts: React.FC<YieldChartsProps> = ({ opportunities }) => {
  // Prepare data for APY comparison bar chart
  const apyData = opportunities.map((opp) => ({
    name: opp.protocol,
    apy: opp.apy,
    fill: getProtocolColor(opp.protocol),
  }));

  // Prepare data for TVL pie chart - only include protocols with TVL > 0
  const tvlData = opportunities
    .reduce((acc, opp) => {
      // Find existing protocol entry
      const existing = acc.find((item) => item.name === opp.protocol);
      if (existing) {
        existing.value += opp.tvl;
      } else {
        acc.push({
          name: opp.protocol,
          value: opp.tvl,
        });
      }
      return acc;
    }, [] as Array<{ name: string; value: number }>)
    .filter((item) => item.value > 0); // Filter out zero-TVL protocols

  function getProtocolColor(protocol: string): string {
    const index = opportunities.findIndex((opp) => opp.protocol === protocol);
    return COLORS[index % COLORS.length];
  }

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      color: string;
      dataKey?: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}:{" "}
              {typeof entry.value === "number"
                ? entry.value.toFixed(2)
                : entry.value}
              {entry.name === "apy" ||
              (entry.dataKey && entry.dataKey.includes("apy"))
                ? "%"
                : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yield Analytics</CardTitle>
        <CardDescription>
          Visual analysis of yield opportunities across protocols
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bar">APY Comparison</TabsTrigger>
            <TabsTrigger value="pie">TVL Distribution</TabsTrigger>
          </TabsList>

          {/* APY Bar Chart */}
          <TabsContent value="bar" className="mt-6">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={350} minWidth={300}>
                <BarChart data={apyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs md:text-sm" tick={{ fontSize: 12 }} />
                  <YAxis
                    label={{
                      value: "APY (%)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12 }
                    }}
                    className="text-xs md:text-sm"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="apy" radius={[8, 8, 0, 0]}>
                    {apyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* TVL Pie Chart */}
          <TabsContent value="pie" className="mt-6">
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={350} minWidth={300}>
                <PieChart>
                  <Pie
                    data={tvlData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {tvlData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm">
                              TVL: ${(data.value as number).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/**
 * Size-wise Sales Report Dashboard
 *
 * PHASE 17: DASHBOARDS & VISUAL ANALYTICS
 * ========================================
 *
 * Size Performance:
 * - Bar chart (sizes by revenue/quantity)
 * - Toggle: Revenue / Quantity
 * - Pie chart for distribution
 *
 * Data from:
 * - /reports/by-size/
 */
"use client";

import * as React from "react";
import {
  Ruler,
  BarChart3,
  DollarSign,
  Package,
  ShoppingCart,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  KPICard,
  ChartSkeleton,
  ErrorBanner,
  EmptyState,
  DashboardFilterBar,
  SectionCard,
} from "@/components/dashboard";
import { useDashboardFilters, useSizeSales } from "@/hooks";

// Format currency
function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 1000000) {
    return `₹${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `₹${(num / 1000).toFixed(0)}K`;
  }
  return `₹${num.toFixed(0)}`;
}

// Format full currency
function formatFullCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Colors for pie chart
const COLORS = [
  "#3B82F6",
  "#10B981",
  "#C6A15B",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
];

export default function SizeReportsPage() {
  const { filters } = useDashboardFilters();
  const [metric, setMetric] = React.useState<"revenue" | "quantity">("revenue");

  // Fetch size sales
  const {
    data: sizeData,
    isLoading,
    error,
    refetch,
  } = useSizeSales({
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    warehouseId: filters.warehouseId || undefined,
    pageSize: 50,
  });

  const handleRefresh = () => {
    refetch();
  };

  // Prepare bar chart data
  const barChartData = React.useMemo(() => {
    if (!sizeData?.results) return [];

    return sizeData.results.slice(0, 15).map((item) => ({
      name: item.size,
      fullName: item.size,
      revenue: parseFloat(item.revenue),
      quantity: item.quantitySold,
      orders: item.orderCount,
      products: item.productCount,
    }));
  }, [sizeData]);

  // Prepare pie chart data
  const pieChartData = React.useMemo(() => {
    if (!sizeData?.results) return [];

    const top8 = sizeData.results.slice(0, 8);
    const others = sizeData.results.slice(8);

    const result = top8.map((item) => ({
      name: item.size,
      value:
        metric === "revenue" ? parseFloat(item.revenue) : item.quantitySold,
    }));

    if (others.length > 0) {
      const othersTotal = others.reduce(
        (sum, item) =>
          sum +
          (metric === "revenue" ? parseFloat(item.revenue) : item.quantitySold),
        0,
      );
      result.push({ name: "Others", value: othersTotal });
    }

    return result;
  }, [sizeData, metric]);

  // Loading state
  if (isLoading && !sizeData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Size-wise Sales</h1>
          <p className="text-sm text-white/40 mt-1">
            Sales breakdown by product size
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <KPICard key={i} title="" value="" loading />
          ))}
        </div>
        <ChartSkeleton height={350} />
        <ChartSkeleton height={350} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Size-wise Sales</h1>
          <p className="text-sm text-white/40 mt-1">
            Sales breakdown by product size
          </p>
        </div>
        <ErrorBanner
          message={(error as Error).message || "Failed to load size data"}
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Size-wise Sales</h1>
          <p className="text-sm text-white/40 mt-1">
            Sales breakdown by product size • Data from /reports/by-size/
          </p>
        </div>
        <DashboardFilterBar
          onRefresh={handleRefresh}
          isRefreshing={isLoading}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatFullCurrency(sizeData?.summary.totalRevenue || "0")}
          subtitle="From all sizes"
          icon={DollarSign}
        />
        <KPICard
          title="Items Sold"
          value={(sizeData?.summary.totalQuantity || 0).toLocaleString()}
          subtitle="Total quantity"
          icon={Package}
        />
        <KPICard
          title="Total Orders"
          value={(sizeData?.summary.totalOrders || 0).toLocaleString()}
          subtitle="Unique orders"
          icon={ShoppingCart}
        />
        <KPICard
          title="Sizes"
          value={(sizeData?.summary.sizeCount || 0).toLocaleString()}
          subtitle="Unique sizes"
          icon={Ruler}
        />
      </div>

      {/* Size Bar Chart */}
      <SectionCard
        title="Sales by Size"
        description={`By ${metric === "revenue" ? "revenue" : "quantity sold"}`}
        icon={BarChart3}
        action={
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setMetric("revenue")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                metric === "revenue"
                  ? "bg-[#C6A15B] text-black font-medium"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetric("quantity")}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                metric === "quantity"
                  ? "bg-[#C6A15B] text-black font-medium"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Quantity
            </button>
          </div>
        }
      >
        {barChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={barChartData}
              margin={{ left: 10, right: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickFormatter={(value) =>
                  metric === "revenue"
                    ? formatCurrency(value)
                    : value.toLocaleString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(26, 27, 35, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value, name) => {
                  if (value === undefined) return ["-", name];
                  const numValue = Number(value);
                  return [
                    name === "revenue"
                      ? formatFullCurrency(numValue)
                      : numValue.toLocaleString(),
                    name === "revenue" ? "Revenue" : "Quantity",
                  ];
                }}
                labelStyle={{
                  color: "rgba(255,255,255,0.8)",
                  fontWeight: "bold",
                }}
              />
              <Bar dataKey={metric} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No size sales data"
            description="Size sales will appear once you have completed sales with size variants."
          />
        )}
      </SectionCard>

      {/* Size Distribution Pie Chart */}
      <SectionCard
        title="Size Distribution"
        description={`${metric === "revenue" ? "Revenue" : "Quantity"} share by size`}
        icon={PieChart}
      >
        {pieChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <RechartsPie>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(26, 27, 35, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value) =>
                  metric === "revenue"
                    ? formatFullCurrency(Number(value))
                    : Number(value).toLocaleString()
                }
              />
              <Legend
                wrapperStyle={{ color: "rgba(255,255,255,0.6)" }}
                formatter={(value) => (
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>
                    {value}
                  </span>
                )}
              />
            </RechartsPie>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={PieChart}
            title="No distribution data"
            description="Distribution chart will appear once you have sales data."
          />
        )}
      </SectionCard>

      {/* Data Source Attribution */}
      <div className="text-xs text-white/30 text-center py-4">
        Data derived from SaleItem aggregation by product variant size • No
        frontend calculations
      </div>
    </div>
  );
}

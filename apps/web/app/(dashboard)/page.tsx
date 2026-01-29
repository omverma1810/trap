/**
 * Dashboard Overview Page
 *
 * PHASE 17: DASHBOARDS & VISUAL ANALYTICS
 * ========================================
 *
 * Core Rule: Dashboards visualize answers. They do not calculate them.
 * All data comes from Phase 16 report APIs.
 *
 * KPIs displayed from /reports/sales/summary/
 * Trend chart from /reports/sales/trends/
 */
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Percent,
  TrendingUp,
  Package,
  FileText,
  LayoutDashboard,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageTransition } from "@/components/layout";
import {
  reportsService,
  SalesSummaryReport,
  SalesTrendsReport,
} from "@/services";
import {
  KPICard,
  ChartSkeleton,
  ErrorBanner,
  EmptyState,
} from "@/components/dashboard";

// Format currency helper
function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Format date for chart
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SalesSummaryReport | null>(null);
  const [trends, setTrends] = useState<SalesTrendsReport | null>(null);
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendsRes] = await Promise.all([
        reportsService.getSalesSummary(),
        reportsService.getSalesTrends({ groupBy }),
      ]);
      setSummary(summaryRes);
      setTrends(trendsRes);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupBy]);

  // Loading state
  if (loading && !summary) {
    return (
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-sm text-white/40 mt-1">
                Analytics overview from report APIs
              </p>
            </div>
          </div>

          {/* KPI Skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <KPICard key={i} title="" value="" loading />
            ))}
          </div>

          {/* Chart Skeleton */}
          <ChartSkeleton height={400} />
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">
              Analytics overview from report APIs
            </p>
          </div>
          <ErrorBanner message={error} onRetry={fetchData} />
        </div>
      </PageTransition>
    );
  }

  // Empty state
  if (!summary || summary.invoiceCount === 0) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">
              Analytics overview from report APIs
            </p>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10">
            <EmptyState
              icon={LayoutDashboard}
              title="No sales data yet"
              description="Start making sales through the POS system to see analytics here. All data is derived from your sales and inventory records."
              action={{
                label: "Go to POS",
                onClick: () => (window.location.href = "/pos"),
              }}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Prepare chart data
  const chartData =
    trends?.results?.map((item) => ({
      period: formatDate(item.period),
      revenue: parseFloat(item.totalSales),
      orders: item.invoiceCount,
      items: item.totalItems,
    })) || [];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-white/40 mt-1">
              Data derived from Phase 16 report APIs • No frontend calculations
            </p>
          </div>

          {/* Period Toggle */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/40" />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "day" | "month")}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50"
            >
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
            </select>
          </div>
        </div>

        {/* KPI Cards - Data from /reports/sales/summary/ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total Revenue"
            value={formatCurrency(summary.totalSales)}
            subtitle="All completed sales"
            icon={DollarSign}
          />
          <KPICard
            title="Total Orders"
            value={summary.invoiceCount}
            subtitle="Invoices generated"
            icon={ShoppingCart}
          />
          <KPICard
            title="Items Sold"
            value={summary.totalItemsSold}
            subtitle="Total quantity"
            icon={Package}
          />
          <KPICard
            title="GST Collected"
            value={formatCurrency(summary.totalGst)}
            subtitle="Tax liability"
            icon={Receipt}
          />
          <KPICard
            title="Discounts Given"
            value={formatCurrency(summary.totalDiscount)}
            subtitle="Total discounts"
            icon={Percent}
          />
        </div>

        {/* Sales Trend Chart - Data from /reports/sales/trends/ */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Sales Trend</h2>
              <p className="text-sm text-white/40">
                {groupBy === "day" ? "Daily" : "Monthly"} revenue from completed
                sales
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#C6A15B]"></div>
                <span className="text-white/60">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-white/60">Orders</span>
              </div>
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
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
                      name === "revenue" ? formatCurrency(numValue) : numValue,
                      name === "revenue" ? "Revenue" : "Orders",
                    ];
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#C6A15B"
                  strokeWidth={2}
                  dot={{ fill: "#C6A15B", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#C6A15B" }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: "#10B981", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#10B981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No trend data available"
              description="Sales trends will appear here once you have sales data across multiple periods."
            />
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-5">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Sale", icon: ShoppingCart, href: "/pos" },
                { label: "Inventory", icon: Package, href: "/inventory" },
                { label: "View Invoices", icon: FileText, href: "/invoices" },
                { label: "Stores", icon: TrendingUp, href: "/stores" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
                  >
                    <div className="p-2 rounded-md bg-[#C6A15B]/10 group-hover:bg-[#C6A15B]/15 transition-colors">
                      <Icon className="w-4 h-4 text-[#C6A15B] stroke-[1.5]" />
                    </div>
                    <span className="text-sm font-medium text-white">
                      {action.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Store Alerts Widget */}
          <StoreAlertsWidget />
        </div>
      </div>
    </PageTransition>
  );
}

// Store Alerts Widget Component - fetches low stock alerts from stores
function StoreAlertsWidget() {
  const [alerts, setAlerts] = React.useState<{
    totalAlerts: number;
    stores: Array<{
      storeId: string;
      storeName: string;
      storeCode: string;
      lowStockCount: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchAlerts() {
      try {
        const { storesService } = await import("@/services");
        const data = await storesService.getLowStockAlerts();
        setAlerts(data);
      } catch (err) {
        console.error("Failed to fetch store alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Store Alerts</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-white/40">Loading...</div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.totalAlerts === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Store Alerts</h2>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="p-3 rounded-full bg-emerald-500/10 mb-3">
            <Package className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-white/60 text-sm">All stores are well stocked</p>
          <a
            href="/stores"
            className="text-[#C6A15B] text-sm mt-2 hover:underline"
          >
            View all stores →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-500/5 backdrop-blur-sm rounded-xl border border-amber-500/20 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white">Store Alerts</h2>
        <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium">
          {alerts.totalAlerts} alert(s)
        </span>
      </div>
      <div className="space-y-3">
        {alerts.stores.slice(0, 3).map((store) => (
          <a
            key={store.storeId}
            href={`/stores/${store.storeId}`}
            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/10">
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
                  {store.storeName}
                </p>
                <p className="text-xs text-white/40">{store.storeCode}</p>
              </div>
            </div>
            <span className="text-amber-400 text-sm font-medium">
              {store.lowStockCount} low
            </span>
          </a>
        ))}
        {alerts.stores.length > 3 && (
          <a
            href="/stores"
            className="block text-center text-sm text-[#C6A15B] hover:underline py-2"
          >
            View all {alerts.stores.length} stores with alerts →
          </a>
        )}
      </div>
    </div>
  );
}

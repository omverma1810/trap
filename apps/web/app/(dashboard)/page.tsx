"use client";

import * as React from "react";
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard
} from "lucide-react";
import { PageTransition } from "@/components/layout";
import { EmptyState, emptyStates } from "@/components/ui/empty-state";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { usePerformanceOverview } from "@/hooks";

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = usePerformanceOverview();

  // Loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-40 w-full rounded-lg" />
            </div>
            <div className="p-6 rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (isError) {
    return (
      <PageTransition>
        <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
          <ErrorState 
            message="Could not connect to the server. Please check if backend is running."
            onRetry={() => refetch()}
          />
        </div>
      </PageTransition>
    );
  }

  // Empty state - no data
  if (!data || (data.kpis?.total_sales === 0 || !data.kpis)) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <EmptyState
              icon={LayoutDashboard}
              title={emptyStates.dashboard.title}
              description={emptyStates.dashboard.description}
              actions={[
                { label: "Go to Inventory", href: "/inventory", variant: "primary" },
                { label: "Open POS", href: "/pos", variant: "secondary" },
              ]}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  const { kpis, top_products } = data;

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(kpis.total_revenue || 0),
      change: `${kpis.revenue_delta > 0 ? '+' : ''}${kpis.revenue_delta?.toFixed(1)}%`,
      trend: (kpis.revenue_delta || 0) >= 0 ? "up" : "down",
      icon: TrendingUp,
    },
    {
      label: "Total Sales",
      value: (kpis.total_sales || 0).toString(),
      change: `${kpis.sales_delta > 0 ? '+' : ''}${kpis.sales_delta?.toFixed(1)}%`,
      trend: (kpis.sales_delta || 0) >= 0 ? "up" : "down",
      icon: ShoppingCart,
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(kpis.avg_order_value || 0),
      change: `${kpis.aov_delta > 0 ? '+' : ''}${kpis.aov_delta?.toFixed(1)}%`,
      trend: (kpis.aov_delta || 0) >= 0 ? "up" : "down",
      icon: FileText,
    },
    {
      label: "Profit",
      value: formatCurrency(kpis.profit || 0),
      change: `${kpis.profit_delta > 0 ? '+' : ''}${kpis.profit_delta?.toFixed(1)}%`,
      trend: (kpis.profit_delta || 0) >= 0 ? "up" : "down",
      icon: Package,
    },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div 
                key={stat.label} 
                className="p-5 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.12] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <p className="text-sm text-[#A1A4B3]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#F5F6FA] tracking-tight tabular-nums">
                      {stat.value}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="w-4 h-4 text-[#2ECC71] stroke-[2]" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-[#E74C3C] stroke-[2]" />
                      )}
                      <span className={`text-sm font-medium ${stat.trend === "up" ? "text-[#2ECC71]" : "text-[#E74C3C]"}`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-[#6F7285]">vs last month</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#C6A15B]/10">
                    <Icon className="w-5 h-5 text-[#C6A15B] stroke-[1.5]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="p-6 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA] mb-5">Top Products</h2>
            <div className="space-y-4">
              {top_products && top_products.length > 0 ? (
                top_products.slice(0, 4).map((product: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#C6A15B]/10 flex items-center justify-center text-[#C6A15B] font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F5F6FA]">{product.name}</p>
                        <p className="text-xs text-[#6F7285] mt-0.5">{product.units_sold} units sold</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#C6A15B] tabular-nums">
                      {formatCurrency(product.revenue || 0)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#6F7285] text-center py-4">No sales data yet</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA] mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Sale", icon: ShoppingCart, href: "/pos" },
                { label: "Add Product", icon: Package, href: "/inventory?openAddProduct=true" },
                { label: "View Invoices", icon: FileText, href: "/invoices" },
                { label: "Analytics", icon: TrendingUp, href: "/analytics" },
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
                    <span className="text-sm font-medium text-[#F5F6FA]">{action.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

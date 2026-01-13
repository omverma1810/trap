"use client";

import * as React from "react";
import { DollarSign, ShoppingCart, TrendingUp, Wallet, Calendar, Building2, ChevronDown } from "lucide-react";
import { PageTransition } from "@/components/layout";
import { KPICard, RevenueChart, InventoryHealth, DiscountImpact, PerformanceList } from "@/components/analytics";
import { mockAnalytics, formatCurrency } from "@/lib/data/analytics";

export default function AnalyticsPage() {
  const { kpis, revenueByDay, inventoryHealth, discountMetrics, topProducts, lowPerformers } = mockAnalytics;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Analytics</h1>
            <p className="text-sm text-[#6F7285] mt-1">Business intelligence & insights</p>
          </div>
          
          {/* Mock Selectors */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Calendar className="w-4 h-4 stroke-[1.5]" />
              <span>Last 30 Days</span>
              <ChevronDown className="w-4 h-4 text-[#6F7285]" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Building2 className="w-4 h-4 stroke-[1.5]" />
              <span>All Warehouses</span>
              <ChevronDown className="w-4 h-4 text-[#6F7285]" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Total Revenue"
            value={formatCurrency(kpis.totalRevenue)}
            delta={kpis.revenueDelta}
            icon={<DollarSign className="w-4 h-4 text-[#C6A15B]" />}
            delay={0}
          />
          <KPICard
            label="Total Sales"
            value={kpis.totalSales.toString()}
            delta={kpis.salesDelta}
            icon={<ShoppingCart className="w-4 h-4 text-[#C6A15B]" />}
            delay={0.05}
          />
          <KPICard
            label="Avg Order Value"
            value={formatCurrency(kpis.avgOrderValue)}
            delta={kpis.aovDelta}
            icon={<TrendingUp className="w-4 h-4 text-[#C6A15B]" />}
            delay={0.1}
          />
          <KPICard
            label="Profit"
            value={formatCurrency(kpis.profit)}
            delta={kpis.profitDelta}
            icon={<Wallet className="w-4 h-4 text-[#C6A15B]" />}
            delay={0.15}
          />
        </div>

        {/* Primary Chart */}
        <RevenueChart data={revenueByDay} />

        {/* Secondary Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InventoryHealth
            inStock={inventoryHealth.inStock}
            lowStock={inventoryHealth.lowStock}
            outOfStock={inventoryHealth.outOfStock}
          />
          <DiscountImpact
            discountedSales={discountMetrics.discountedSales}
            regularSales={discountMetrics.regularSales}
            totalDiscountAmount={discountMetrics.totalDiscountAmount}
          />
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PerformanceList
            title="Top Products"
            products={topProducts}
            type="top"
          />
          <PerformanceList
            title="Low Performers"
            products={lowPerformers}
            type="low"
          />
        </div>
      </div>
    </PageTransition>
  );
}

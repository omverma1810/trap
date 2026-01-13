"use client";

import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { PageTransition } from "@/components/layout";

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: "₹4,85,000", change: "+18%", up: true },
            { label: "Total Sales", value: "847", change: "+12%", up: true },
            { label: "Average Order", value: "₹572", change: "-3%", up: false },
            { label: "Discounts Given", value: "₹24,500", change: "+5%", up: true },
          ].map((kpi) => (
            <div key={kpi.label} className="p-5 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
              <div className="space-y-3">
                <p className="text-sm text-[#A1A4B3]">{kpi.label}</p>
                <p className="text-2xl font-bold text-[#F5F6FA] tabular-nums">{kpi.value}</p>
                <div className="flex items-center gap-1.5">
                  {kpi.up ? (
                    <TrendingUp className="w-4 h-4 text-[#2ECC71] stroke-[2]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#E74C3C] stroke-[2]" />
                  )}
                  <span className={`text-sm font-medium ${kpi.up ? "text-[#2ECC71]" : "text-[#E74C3C]"}`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.08]">
              <h2 className="text-lg font-semibold text-[#F5F6FA]">Sales Trends</h2>
            </div>
            <div className="px-6 py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C6A15B]/10 mb-4">
                  <BarChart3 className="w-8 h-8 text-[#C6A15B] stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">Chart Placeholder</h3>
                <p className="text-sm text-[#A1A4B3] text-center max-w-sm">
                  Sales trend chart will be integrated in Phase 3.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.08]">
              <h2 className="text-lg font-semibold text-[#F5F6FA]">Revenue by Category</h2>
            </div>
            <div className="px-6 py-16">
              <div className="flex flex-col items-center justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C6A15B]/10 mb-4">
                  <DollarSign className="w-8 h-8 text-[#C6A15B] stroke-[1.5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">Chart Placeholder</h3>
                <p className="text-sm text-[#A1A4B3] text-center max-w-sm">
                  Revenue breakdown chart will be integrated in Phase 3.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Products Placeholder */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Top Selling Products</h2>
          </div>
          <div className="px-6 py-12">
            <p className="text-sm text-[#A1A4B3] text-center">
              Product rankings will be displayed here after API integration.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

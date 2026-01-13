"use client";

import { 
  Package, 
  ShoppingCart, 
  FileText, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { PageTransition } from "@/components/layout";

const stats = [
  {
    label: "Total Products",
    value: "1,247",
    change: "+12%",
    trend: "up",
    icon: Package,
  },
  {
    label: "Today's Sales",
    value: "₹24,500",
    change: "+8%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    label: "Pending Invoices",
    value: "23",
    change: "-5%",
    trend: "down",
    icon: FileText,
  },
  {
    label: "Monthly Revenue",
    value: "₹4,85,000",
    change: "+18%",
    trend: "up",
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
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
          {/* Recent Activity */}
          <div className="p-6 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA] mb-5">Recent Activity</h2>
            <div className="space-y-4">
              {[
                { action: "Sale completed", detail: "₹1,250 • 3 items", time: "2 min ago", color: "#2ECC71" },
                { action: "Invoice generated", detail: "INV-2026-0042", time: "15 min ago", color: "#A1A4B3" },
                { action: "Low stock alert", detail: "Blue Denim Jacket", time: "1 hour ago", color: "#F5A623" },
                { action: "New product added", detail: "Premium T-Shirt", time: "3 hours ago", color: "#C6A15B" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#F5F6FA]">{item.action}</p>
                      <p className="text-xs text-[#6F7285] mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                  <span className="text-xs text-[#6F7285] bg-white/[0.05] px-2 py-1 rounded">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA] mb-5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "New Sale", icon: ShoppingCart, href: "/pos" },
                { label: "Add Product", icon: Package, href: "/inventory" },
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

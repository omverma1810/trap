"use client";

import { Package, Plus, Filter, Search } from "lucide-react";
import { PageTransition } from "@/components/layout";

export default function InventoryPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7285] stroke-[1.5]" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Filter className="w-4 h-4 stroke-[1.5]" /> Filters
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors">
            <Plus className="w-4 h-4 stroke-[2]" /> Add Product
          </button>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "In Stock", value: "1,124", icon: Package, color: "#2ECC71", bg: "rgba(46, 204, 113, 0.15)" },
            { label: "Low Stock", value: "45", icon: Package, color: "#F5A623", bg: "rgba(245, 166, 35, 0.15)" },
            { label: "Out of Stock", value: "12", icon: Package, color: "#E74C3C", bg: "rgba(231, 76, 60, 0.15)" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="p-5 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <Icon className="w-5 h-5 stroke-[1.5]" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-[#6F7285] uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#F5F6FA] tabular-nums mt-1">{stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Placeholder Table */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Products</h2>
          </div>
          <div className="px-6 py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.05] mb-4">
                <Package className="w-8 h-8 text-[#6F7285] stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">Product Table</h3>
              <p className="text-sm text-[#A1A4B3] max-w-md mx-auto">
                This is a placeholder for the inventory table. 
                Tables and data integration will be added in Phase 3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

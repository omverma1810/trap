"use client";

import { FileText, Plus, Download, Filter } from "lucide-react";
import { PageTransition } from "@/components/layout";

export default function InvoicesPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Filter className="w-4 h-4 stroke-[1.5]" /> Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Download className="w-4 h-4 stroke-[1.5]" /> Export
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors">
            <Plus className="w-4 h-4 stroke-[2]" /> New Invoice
          </button>
        </div>

        {/* Invoice Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Invoices", value: "1,247", dot: null },
            { label: "Paid", value: "1,180", dot: "#2ECC71" },
            { label: "Pending", value: "45", dot: "#F5A623" },
            { label: "Overdue", value: "22", dot: "#E74C3C" },
          ].map((stat) => (
            <div key={stat.label} className="p-5 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#6F7285] uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#F5F6FA] tabular-nums mt-1">{stat.value}</p>
                </div>
                {stat.dot && (
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: stat.dot }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Invoice List Placeholder */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Recent Invoices</h2>
          </div>
          <div className="px-6 py-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.05] mb-4">
                <FileText className="w-8 h-8 text-[#6F7285] stroke-[1.5]" />
              </div>
              <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">Invoice List</h3>
              <p className="text-sm text-[#A1A4B3] max-w-md mx-auto">
                This is a placeholder for the invoice list. 
                Data tables will be added in Phase 3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

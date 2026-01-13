"use client";

import * as React from "react";
import { FileText, ChevronRight, Banknote, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { Invoice, formatCurrency, formatDate } from "@/lib/data/invoices";

interface InvoiceTableProps {
  invoices: Invoice[];
  onInvoiceClick: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, onInvoiceClick }: InvoiceTableProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.05] mb-4">
          <FileText className="w-8 h-8 text-[#6F7285]" />
        </div>
        <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">No invoices found</h3>
        <p className="text-sm text-[#A1A4B3]">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-[120px_100px_1fr_100px_120px_100px_40px] gap-4 px-4 py-3 bg-[#1A1B23] border-b border-white/[0.08] text-xs font-medium text-[#6F7285] uppercase tracking-wide sticky top-0 z-10">
        <span>Invoice</span>
        <span>Date</span>
        <span>Customer</span>
        <span>Payment</span>
        <span className="text-right">Amount</span>
        <span>Status</span>
        <span></span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-white/[0.06] max-h-[500px] overflow-auto">
        {invoices.map((invoice, index) => {
          const isHovered = hoveredId === invoice.id;
          
          return (
            <motion.button
              key={invoice.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.02, 0.3) }}
              onClick={() => onInvoiceClick(invoice)}
              onMouseEnter={() => setHoveredId(invoice.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                w-full grid grid-cols-1 md:grid-cols-[120px_100px_1fr_100px_120px_100px_40px] gap-2 md:gap-4 px-4 py-4 text-left cursor-pointer
                transition-all duration-150 ease-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6A15B]
                ${isHovered ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}
              `}
            >
              {/* Invoice ID */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#6F7285] hidden md:block" />
                <span className="text-sm font-mono text-[#C6A15B]">
                  {invoice.invoiceNumber.slice(-7)}
                </span>
              </div>

              {/* Date */}
              <span className="hidden md:block text-sm text-[#A1A4B3] self-center">
                {formatDate(invoice.date)}
              </span>

              {/* Customer */}
              <span className="text-sm text-[#F5F6FA] self-center truncate">
                {invoice.customer.name}
              </span>

              {/* Mobile: Row 2 */}
              <div className="md:hidden flex items-center justify-between text-xs text-[#A1A4B3]">
                <span>{formatDate(invoice.date)}</span>
                <PaymentBadge method={invoice.paymentMethod} />
                <StatusBadge status={invoice.status} />
              </div>

              {/* Payment */}
              <div className="hidden md:flex items-center self-center">
                <PaymentBadge method={invoice.paymentMethod} />
              </div>

              {/* Amount */}
              <span className={`
                hidden md:block text-sm font-semibold self-center text-right tabular-nums
                ${invoice.status === "cancelled" ? "text-[#6F7285] line-through" : "text-[#F5F6FA]"}
              `}>
                {formatCurrency(invoice.total)}
              </span>

              {/* Status */}
              <div className="hidden md:flex items-center self-center">
                <StatusBadge status={invoice.status} />
              </div>

              {/* Chevron */}
              <div className="hidden md:flex items-center justify-end self-center">
                <ChevronRight 
                  className={`w-4 h-4 text-[#6F7285] transition-opacity duration-150 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>

              {/* Mobile: Amount */}
              <div className="md:hidden flex items-center justify-between">
                <span className="text-xs text-[#6F7285]">{invoice.items.length} items</span>
                <span className={`text-base font-semibold tabular-nums ${
                  invoice.status === "cancelled" ? "text-[#6F7285] line-through" : "text-[#C6A15B]"
                }`}>
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentBadge({ method }: { method: "cash" | "card" }) {
  return (
    <span className={`
      inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
      ${method === "cash" 
        ? "bg-[#2ECC71]/15 text-[#2ECC71]" 
        : "bg-[#3B82F6]/15 text-[#3B82F6]"}
    `}>
      {method === "cash" ? <Banknote className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
      {method === "cash" ? "Cash" : "Card"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    paid: { bg: "bg-[#2ECC71]/15", text: "text-[#2ECC71]", label: "Paid" },
    cancelled: { bg: "bg-[#E74C3C]/15", text: "text-[#E74C3C]", label: "Cancelled" },
    refunded: { bg: "bg-[#F5A623]/15", text: "text-[#F5A623]", label: "Refunded" },
  }[status] || { bg: "bg-white/[0.1]", text: "text-[#A1A4B3]", label: status };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

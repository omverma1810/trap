"use client";

import * as React from "react";
import { X, Download, Printer, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Invoice, storeInfo, formatCurrency, formatDate } from "@/lib/data/invoices";

interface InvoicePreviewProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreview({ invoice, isOpen, onClose }: InvoicePreviewProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!invoice) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
          >
            {/* Invoice Content - Light background for print-ready look */}
            <div className="bg-[#FAFAFA] text-[#1A1B23]">
              {/* Header Actions */}
              <div className="flex items-center justify-between p-4 bg-[#1A1B23] text-white">
                <h2 className="text-lg font-semibold">Invoice Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.1] text-sm hover:bg-white/[0.15] transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Invoice Body */}
              <div className="p-8">
                {/* Store Header */}
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#C6A15B] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <h1 className="text-2xl font-bold text-[#1A1B23]">{storeInfo.name}</h1>
                    </div>
                    <p className="text-sm text-gray-600">{storeInfo.address}</p>
                    <p className="text-sm text-gray-600">{storeInfo.phone}</p>
                    <p className="text-sm text-gray-600">GSTIN: {storeInfo.gstin}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#C6A15B] font-mono mb-1">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDate(invoice.date)} at {invoice.time}
                    </p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>

                {/* Customer Info */}
                <div className="mb-8">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Bill To</h3>
                  <p className="text-lg font-semibold text-[#1A1B23]">{invoice.customer.name}</p>
                  {invoice.customer.phone && (
                    <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                  )}
                  {invoice.customer.email && (
                    <p className="text-sm text-gray-600">{invoice.customer.email}</p>
                  )}
                </div>

                {/* Items Table */}
                <div className="mb-8">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Item</th>
                        <th className="py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Qty</th>
                        <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Price</th>
                        <th className="py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3">
                            <p className="font-medium text-[#1A1B23]">{item.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                          </td>
                          <td className="py-3 text-center text-gray-700 tabular-nums">{item.quantity}</td>
                          <td className="py-3 text-right text-gray-700 tabular-nums font-mono">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 text-right font-medium text-[#1A1B23] tabular-nums font-mono">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-mono text-[#1A1B23] tabular-nums">{formatCurrency(invoice.subtotal)}</span>
                    </div>
                    {invoice.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount ({invoice.discountPercent}%)</span>
                        <span className="font-mono text-[#2ECC71] tabular-nums">-{formatCurrency(invoice.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-gray-200">
                      <span className="text-lg font-semibold text-[#1A1B23]">Total</span>
                      <span className="text-xl font-bold text-[#C6A15B] font-mono tabular-nums">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                  <p className="text-sm text-gray-500">
                    Payment via {invoice.paymentMethod === "cash" ? "Cash" : "Card"} • Served by {invoice.cashier}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Thank you for shopping with us!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    paid: { bg: "bg-[#2ECC71]", text: "text-white", label: "PAID" },
    cancelled: { bg: "bg-[#E74C3C]", text: "text-white", label: "CANCELLED" },
    refunded: { bg: "bg-[#F5A623]", text: "text-white", label: "REFUNDED" },
  }[status] || { bg: "bg-gray-500", text: "text-white", label: status };

  return (
    <span className={`inline-block mt-2 px-3 py-1 rounded text-xs font-bold tracking-wide ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

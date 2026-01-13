"use client";

import * as React from "react";
import { FileText, DollarSign, Receipt } from "lucide-react";
import { PageTransition } from "@/components/layout";
import { InvoiceFilters, InvoiceTable, InvoicePreview, PaymentFilter, StatusFilter } from "@/components/invoices";
import { mockInvoices, Invoice, getInvoiceSummary, formatCurrency } from "@/lib/data/invoices";

export default function InvoicesPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentFilter, setPaymentFilter] = React.useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [dateRange, setDateRange] = React.useState("all");

  // Preview state
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Check active filters
  const hasActiveFilters = searchQuery !== "" || paymentFilter !== "all" || statusFilter !== "all" || dateRange !== "all";

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setPaymentFilter("all");
    setStatusFilter("all");
    setDateRange("all");
  };

  // Filter invoices
  const filteredInvoices = React.useMemo(() => {
    let result = [...mockInvoices];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.customer.name.toLowerCase().includes(query)
      );
    }

    // Payment filter
    if (paymentFilter !== "all") {
      result = result.filter((inv) => inv.paymentMethod === paymentFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.status === statusFilter);
    }

    // Date range filter (mock implementation)
    if (dateRange === "today") {
      result = result.filter((inv) => inv.date === "2026-01-13");
    } else if (dateRange === "week") {
      result = result.slice(0, 21); // Last 7 days
    } else if (dateRange === "month") {
      // All invoices are within the month
    }

    return result;
  }, [searchQuery, paymentFilter, statusFilter, dateRange]);

  // Get summary stats
  const summary = React.useMemo(() => getInvoiceSummary(filteredInvoices), [filteredInvoices]);

  // Open invoice preview
  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPreviewOpen(true);
  };

  // Close preview
  const handleClosePreview = () => {
    setPreviewOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Invoices</h1>
          <p className="text-sm text-[#6F7285] mt-1">Sales & billing history</p>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            icon={<Receipt className="w-4 h-4 text-[#C6A15B]" />}
            label="Total Invoices"
            value={summary.totalInvoices.toString()}
          />
          <SummaryCard
            icon={<DollarSign className="w-4 h-4 text-[#C6A15B]" />}
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue)}
          />
          <SummaryCard
            icon={<FileText className="w-4 h-4 text-[#C6A15B]" />}
            label="Avg Invoice"
            value={formatCurrency(summary.avgValue)}
          />
        </div>

        {/* Filters */}
        <InvoiceFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          paymentFilter={paymentFilter}
          onPaymentChange={setPaymentFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Invoice Table */}
        <InvoiceTable
          invoices={filteredInvoices}
          onInvoiceClick={handleInvoiceClick}
        />

        {/* Invoice Preview Modal */}
        <InvoicePreview
          invoice={selectedInvoice}
          isOpen={previewOpen}
          onClose={handleClosePreview}
        />
      </div>
    </PageTransition>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#1A1B23]/40 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-[#6F7285] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-[#F5F6FA] tabular-nums">{value}</p>
    </div>
  );
}

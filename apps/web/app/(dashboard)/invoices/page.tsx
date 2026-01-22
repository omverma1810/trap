"use client";

import * as React from "react";
import { FileText, DollarSign, Receipt } from "lucide-react";
import { PageTransition } from "@/components/layout";
import {
  InvoiceFilters,
  InvoiceTable,
  InvoicePreview,
  PaymentFilter,
  StatusFilter,
} from "@/components/invoices";
import { EmptyState, emptyStates } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useInvoices } from "@/hooks";
import { api } from "@/lib/api";

// Types matching component expectations
interface InvoiceItem {
  productId: string;
  name: string;
  sku?: string;
  variantDetails?: string;
  quantity: number;
  unitPrice?: number;
  total: number;
  gstPercentage?: number;
  gstAmount?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    gstin?: string;
  };
  items: InvoiceItem[];
  subtotal?: number;
  discount?: number;
  discountType?: string;
  discountPercent?: number;
  gstTotal?: number;
  total: number;
  paymentMethod: "cash" | "card";
  status: "paid" | "cancelled" | "refunded";
  cashier?: string;
}

// Transform API response from list endpoint (minimal data)
function transformInvoiceList(apiInvoice: any): Invoice {
  return {
    id: apiInvoice.id,
    invoiceNumber: apiInvoice.invoice_number || "",
    date: apiInvoice.invoice_date || "",
    time: "",
    customer: {
      name: apiInvoice.billing_name || "Walk-in Customer",
    },
    items: [], // Will be fetched on click
    subtotal: 0,
    discount: parseFloat(apiInvoice.discount_amount) || 0,
    discountType: apiInvoice.discount_type || "NONE",
    gstTotal: parseFloat(apiInvoice.gst_total) || 0,
    total: parseFloat(apiInvoice.total_amount) || 0,
    paymentMethod: "cash",
    status: "paid",
    cashier: "Admin",
  };
}

// Transform full invoice details
function transformInvoiceDetail(apiInvoice: any): Invoice {
  // Get payment method from sale_payments
  const paymentMethod =
    apiInvoice.sale_payments?.[0]?.method?.toLowerCase() || "cash";

  // Get cashier name from sale_created_by
  const cashierName =
    apiInvoice.sale_created_by?.name ||
    apiInvoice.sale_created_by?.username ||
    "Admin";

  return {
    id: apiInvoice.id,
    invoiceNumber: apiInvoice.invoice_number || "",
    date: apiInvoice.invoice_date || apiInvoice.created_at?.split("T")[0] || "",
    time: apiInvoice.created_at?.split("T")[1]?.slice(0, 5) || "",
    customer: {
      name: apiInvoice.billing_name || "Walk-in Customer",
      phone: apiInvoice.billing_phone || undefined,
      gstin: apiInvoice.billing_gstin || undefined,
    },
    items: (apiInvoice.items || []).map((item: any) => ({
      productId: item.id,
      // Use product_name, fall back to SKU if empty
      name: item.product_name || item.sku || "Unknown Product",
      sku: item.sku || "",
      variantDetails: item.variant_details || "",
      quantity: item.quantity || 0,
      unitPrice: parseFloat(item.unit_price) || 0,
      total: parseFloat(item.line_total) || 0,
      gstPercentage: parseFloat(item.gst_percentage) || 0,
      gstAmount: parseFloat(item.gst_amount) || 0,
    })),
    subtotal: parseFloat(apiInvoice.subtotal_amount) || 0,
    discount: parseFloat(apiInvoice.discount_amount) || 0,
    discountType: apiInvoice.discount_type || "NONE",
    discountPercent: parseFloat(apiInvoice.discount_value) || 0,
    gstTotal: parseFloat(apiInvoice.gst_total) || 0,
    total: parseFloat(apiInvoice.total_amount) || 0,
    paymentMethod: paymentMethod as "cash" | "card",
    status: "paid",
    cashier: cashierName,
  };
}

// Format currency helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function InvoicesPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [paymentFilter, setPaymentFilter] =
    React.useState<PaymentFilter>("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [dateRange, setDateRange] = React.useState("all");

  // Preview state
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [, setLoadingDetail] = React.useState(false);

  // API hook
  const {
    data: invoicesResponse,
    isLoading,
    isError,
    refetch,
  } = useInvoices({
    search: searchQuery || undefined,
    payment_method: paymentFilter !== "all" ? paymentFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Transform invoices for list display
  const invoices: Invoice[] = React.useMemo(() => {
    if (!invoicesResponse?.results) return [];
    return invoicesResponse.results.map(transformInvoiceList);
  }, [invoicesResponse]);

  // Filter check
  const hasActiveFilters =
    searchQuery !== "" ||
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    dateRange !== "all";

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setPaymentFilter("all");
    setStatusFilter("all");
    setDateRange("all");
  };

  // Summary stats
  const summary = React.useMemo(() => {
    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const avgValue =
      paidInvoices.length > 0
        ? Math.round(totalRevenue / paidInvoices.length)
        : 0;
    return {
      totalInvoices: invoices.length,
      totalRevenue,
      avgValue,
    };
  }, [invoices]);

  // Handlers
  const handleInvoiceClick = async (invoice: Invoice) => {
    // Fetch full invoice details
    setLoadingDetail(true);
    try {
      const fullInvoice = await api.get<any>(`/invoices/${invoice.id}/`);
      setSelectedInvoice(transformInvoiceDetail(fullInvoice));
      setPreviewOpen(true);
    } catch (error) {
      console.error("Failed to fetch invoice details:", error);
      // Fall back to showing what we have
      setSelectedInvoice(invoice);
      setPreviewOpen(true);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setTimeout(() => setSelectedInvoice(null), 300);
  };

  // Loading state
  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Invoices</h1>
            <p className="text-sm text-[#6F7285] mt-1">Loading invoices...</p>
          </div>
          <SkeletonTable rows={6} />
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (isError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Invoices</h1>
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <ErrorState
              message="Could not load invoices. Check if backend is running."
              onRetry={() => refetch()}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

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

        {/* Invoice Table or Empty State */}
        {invoices.length === 0 ? (
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <EmptyState
              icon={Receipt}
              title={emptyStates.invoices.title}
              description={emptyStates.invoices.description}
              actions={[
                { label: "Open POS", href: "/pos", variant: "primary" },
              ]}
            />
          </div>
        ) : (
          <InvoiceTable
            invoices={invoices}
            onInvoiceClick={handleInvoiceClick}
          />
        )}

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

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-[#1A1B23]/40 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-[#6F7285] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-[#F5F6FA] tabular-nums">{value}</p>
    </div>
  );
}

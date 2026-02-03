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
import { Pagination } from "@/components/ui/pagination";
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

interface PaymentDetail {
  method: string;
  amount: number;
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
  paymentMethod: "cash" | "card" | "upi" | "credit";
  paymentMethods?: PaymentDetail[];
  status: "paid" | "cancelled" | "refunded";
  cashier?: string;
}

// API uses CamelCaseJSONRenderer, so all fields are camelCase
interface ApiInvoice {
  id: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  createdAt?: string;
  billingName?: string;
  billingPhone?: string;
  billingGstin?: string;
  discountAmount?: string;
  discountType?: string;
  gstTotal?: string;
  totalAmount?: string;
  subtotalAmount?: string;
  discountValue?: string;
  salePayments?: Array<{ method?: string; amount?: string }>;
  saleCreatedBy?: { name?: string; username?: string };
  saleCreatedByName?: string;
  items?: Array<{
    id: string;
    productName?: string;
    sku?: string;
    variantDetails?: string;
    quantity?: number;
    unitPrice?: string;
    lineTotal?: string;
    gstPercentage?: string;
    gstAmount?: string;
  }>;
}

// Helper to get the primary payment method from payments array
// API returns payment methods in UPPERCASE (CASH, CARD, UPI, CREDIT)
function getPrimaryPaymentMethod(
  payments?: Array<{ method?: string; amount?: string }>,
): "cash" | "card" | "upi" | "credit" {
  if (!payments || payments.length === 0) return "cash";

  // Get the first (primary) payment method and normalize to lowercase
  const method = (payments[0]?.method || "CASH").toUpperCase();

  switch (method) {
    case "UPI":
      return "upi";
    case "CARD":
      return "card";
    case "CREDIT":
      return "credit";
    case "CASH":
    default:
      return "cash";
  }
}

// Helper to format date safely
function formatDateSafe(dateStr?: string): string {
  if (!dateStr) return "";
  // Handle ISO format (2026-01-31T10:30:00Z or 2026-01-31)
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  } catch {
    return "";
  }
}

// Transform API response from list endpoint (with payment info)
// API uses CamelCaseJSONRenderer, so all fields are camelCase
function transformInvoiceList(apiInvoice: ApiInvoice): Invoice {
  const paymentMethod = getPrimaryPaymentMethod(apiInvoice.salePayments);

  return {
    id: String(apiInvoice.id),
    invoiceNumber: apiInvoice.invoiceNumber || "",
    date:
      formatDateSafe(apiInvoice.invoiceDate) ||
      formatDateSafe(apiInvoice.createdAt),
    time: apiInvoice.createdAt?.split("T")[1]?.slice(0, 5) || "",
    customer: {
      name: apiInvoice.billingName || "Walk-in Customer",
      phone: apiInvoice.billingPhone || undefined,
    },
    items: [], // Will be fetched on click
    subtotal: parseFloat(apiInvoice.subtotalAmount || "0") || 0,
    discount: parseFloat(apiInvoice.discountAmount || "0") || 0,
    discountType: apiInvoice.discountType || "NONE",
    gstTotal: parseFloat(apiInvoice.gstTotal || "0") || 0,
    total: parseFloat(apiInvoice.totalAmount || "0") || 0,
    paymentMethod: paymentMethod,
    status: "paid",
    cashier: apiInvoice.saleCreatedByName || "Admin",
  };
}

// Transform full invoice details
// API uses CamelCaseJSONRenderer, so all fields are camelCase
function transformInvoiceDetail(apiInvoice: ApiInvoice): Invoice {
  // Get payment method from salePayments
  const paymentMethod = getPrimaryPaymentMethod(apiInvoice.salePayments);

  // Get all payment methods for display
  const paymentMethods = (apiInvoice.salePayments || []).map((p) => ({
    method: p.method || "CASH",
    amount: parseFloat(p.amount || "0") || 0,
  }));

  // Get cashier name from saleCreatedBy
  const cashierName =
    apiInvoice.saleCreatedBy?.name ||
    apiInvoice.saleCreatedBy?.username ||
    apiInvoice.saleCreatedByName ||
    "Admin";

  return {
    id: String(apiInvoice.id),
    invoiceNumber: apiInvoice.invoiceNumber || "",
    date:
      formatDateSafe(apiInvoice.invoiceDate) ||
      formatDateSafe(apiInvoice.createdAt),
    time: apiInvoice.createdAt?.split("T")[1]?.slice(0, 5) || "",
    customer: {
      name: apiInvoice.billingName || "Walk-in Customer",
      phone: apiInvoice.billingPhone || undefined,
      gstin: apiInvoice.billingGstin || undefined,
    },
    items: (apiInvoice.items || []).map((item) => ({
      productId: String(item.id),
      // Use productName, fall back to SKU if empty
      name: item.productName || item.sku || "Unknown Product",
      sku: item.sku || "",
      variantDetails: item.variantDetails || "",
      quantity: item.quantity || 0,
      unitPrice: parseFloat(item.unitPrice || "0") || 0,
      total: parseFloat(item.lineTotal || "0") || 0,
      gstPercentage: parseFloat(item.gstPercentage || "0") || 0,
      gstAmount: parseFloat(item.gstAmount || "0") || 0,
    })),
    subtotal: parseFloat(apiInvoice.subtotalAmount || "0") || 0,
    discount: parseFloat(apiInvoice.discountAmount || "0") || 0,
    discountType: apiInvoice.discountType || "NONE",
    discountPercent: parseFloat(apiInvoice.discountValue || "0") || 0,
    gstTotal: parseFloat(apiInvoice.gstTotal || "0") || 0,
    total: parseFloat(apiInvoice.totalAmount || "0") || 0,
    paymentMethod: paymentMethod,
    paymentMethods: paymentMethods,
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
  // Pagination state
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

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

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, paymentFilter, statusFilter, dateRange]);

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
    page,
    page_size: pageSize,
  });

  // Transform invoices for list display
  const invoices: Invoice[] = React.useMemo(() => {
    if (!invoicesResponse?.results) return [];
    return (invoicesResponse.results as unknown as ApiInvoice[]).map(
      transformInvoiceList,
    );
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
      const fullInvoice = await api.get<ApiInvoice>(`/invoices/${invoice.id}/`);
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
          <>
            <InvoiceTable
              invoices={invoices}
              onInvoiceClick={handleInvoiceClick}
            />
            {/* Pagination */}
            {invoicesResponse?.meta && (
              <Pagination
                page={invoicesResponse.meta.page}
                pageSize={invoicesResponse.meta.pageSize}
                total={invoicesResponse.meta.total}
                onPageChange={setPage}
              />
            )}
          </>
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

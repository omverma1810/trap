"use client";

import * as React from "react";
import { Suspense } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  ClipboardList,
  ChevronDown,
  Package,
  Send,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { PageTransition } from "@/components/layout";
import { SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { purchaseOrdersService, PurchaseOrderListItem } from "@/services";
import { cn } from "@/lib/utils";

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<PurchaseOrdersPageSkeleton />}>
      <PurchaseOrdersPageContent />
    </Suspense>
  );
}

function PurchaseOrdersPageSkeleton() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">
              Purchase Orders
            </h1>
            <p className="text-sm text-[#6F7285] mt-1">Loading...</p>
          </div>
        </div>
        <SkeletonTable rows={6} />
      </div>
    </PageTransition>
  );
}

function PurchaseOrdersPageContent() {
  const queryClient = useQueryClient();

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");

  // Fetch purchase orders
  const {
    data: ordersResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: () =>
      purchaseOrdersService.getPurchaseOrders({
        status: statusFilter || undefined,
      }),
  });

  const orders = React.useMemo(() => {
    if (!ordersResponse?.results) return [];
    if (!searchQuery) return ordersResponse.results;

    const query = searchQuery.toLowerCase();
    return ordersResponse.results.filter(
      (order) =>
        order.poNumber.toLowerCase().includes(query) ||
        order.supplierName.toLowerCase().includes(query)
    );
  }, [ordersResponse, searchQuery]);

  // Status counts
  const statusCounts = React.useMemo(() => {
    if (!ordersResponse?.results)
      return { draft: 0, submitted: 0, partial: 0, received: 0, cancelled: 0 };

    return ordersResponse.results.reduce(
      (acc, order) => {
        const key = order.status.toLowerCase() as keyof typeof acc;
        if (key in acc) acc[key]++;
        return acc;
      },
      { draft: 0, submitted: 0, partial: 0, received: 0, cancelled: 0 }
    );
  }, [ordersResponse]);

  if (isLoading) {
    return <PurchaseOrdersPageSkeleton />;
  }

  if (isError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Purchase Orders</h1>
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <ErrorState
              message="Could not load purchase orders. Check if backend is running."
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
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">
              Purchase Orders
            </h1>
            <p className="text-sm text-[#6F7285] mt-1">
              {orders.length} purchase orders
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors">
            <Plus className="w-4 h-4 stroke-[2]" />
            New Purchase Order
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatusCard
            label="Draft"
            value={statusCounts.draft}
            icon={ClipboardList}
            color="#6F7285"
            active={statusFilter === "DRAFT"}
            onClick={() =>
              setStatusFilter(statusFilter === "DRAFT" ? "" : "DRAFT")
            }
          />
          <StatusCard
            label="Submitted"
            value={statusCounts.submitted}
            icon={Send}
            color="#3498DB"
            active={statusFilter === "SUBMITTED"}
            onClick={() =>
              setStatusFilter(statusFilter === "SUBMITTED" ? "" : "SUBMITTED")
            }
          />
          <StatusCard
            label="Partial"
            value={statusCounts.partial}
            icon={Package}
            color="#F5A623"
            active={statusFilter === "PARTIAL"}
            onClick={() =>
              setStatusFilter(statusFilter === "PARTIAL" ? "" : "PARTIAL")
            }
          />
          <StatusCard
            label="Received"
            value={statusCounts.received}
            icon={CheckCircle}
            color="#2ECC71"
            active={statusFilter === "RECEIVED"}
            onClick={() =>
              setStatusFilter(statusFilter === "RECEIVED" ? "" : "RECEIVED")
            }
          />
          <StatusCard
            label="Cancelled"
            value={statusCounts.cancelled}
            icon={XCircle}
            color="#E74C3C"
            active={statusFilter === "CANCELLED"}
            onClick={() =>
              setStatusFilter(statusFilter === "CANCELLED" ? "" : "CANCELLED")
            }
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7285]" />
            <input
              type="text"
              placeholder="Search by PO number or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#1A1B23]/60 border border-white/[0.08] text-[#F5F6FA] text-sm placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B]/50"
            />
          </div>
          {statusFilter && (
            <button
              onClick={() => setStatusFilter("")}
              className="text-sm text-[#C6A15B] hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Orders Table or Empty State */}
        {orders.length === 0 ? (
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <EmptyState
              icon={ClipboardList}
              title="No purchase orders found"
              description={
                statusFilter
                  ? `No ${statusFilter.toLowerCase()} orders found`
                  : "Create your first purchase order to get started"
              }
              actions={[
                {
                  label: "New Purchase Order",
                  onClick: () => {},
                  variant: "primary",
                },
              ]}
            />
          </div>
        ) : (
          <PurchaseOrdersTable orders={orders} onRefresh={refetch} />
        )}
      </div>
    </PageTransition>
  );
}

function StatusCard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl backdrop-blur-xl border transition-all duration-200 text-left",
        active
          ? "bg-[#C6A15B]/20 border-[#C6A15B] ring-2 ring-[#C6A15B]/30"
          : "bg-[#1A1B23]/60 border-white/[0.08] hover:bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-xs text-[#6F7285] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className="text-2xl font-bold tabular-nums"
        style={{ color: active ? "#C6A15B" : "#F5F6FA" }}
      >
        {value}
      </p>
    </button>
  );
}

function PurchaseOrdersTable({
  orders,
  onRefresh,
}: {
  orders: PurchaseOrderListItem[];
  onRefresh: () => void;
}) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: {
        color: "bg-[#6F7285]/20 text-[#A1A4B3]",
        label: "Draft",
      },
      SUBMITTED: {
        color: "bg-[#3498DB]/20 text-[#3498DB]",
        label: "Submitted",
      },
      PARTIAL: {
        color: "bg-[#F5A623]/20 text-[#F5A623]",
        label: "Partial",
      },
      RECEIVED: {
        color: "bg-[#2ECC71]/20 text-[#2ECC71]",
        label: "Received",
      },
      CANCELLED: {
        color: "bg-[#E74C3C]/20 text-[#E74C3C]",
        label: "Cancelled",
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: "bg-white/10 text-white",
      label: status,
    };

    return (
      <span
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-medium",
          config.color
        )}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                PO Number
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Supplier
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Warehouse
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Order Date
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Items
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-[#6F7285] uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {orders.map((order) => (
              <motion.tr
                key={order.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <td className="px-4 py-4">
                  <span className="font-mono text-sm text-[#C6A15B]">
                    {order.poNumber}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-[#F5F6FA]">
                    {order.supplierName}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-[#A1A4B3]">
                    {order.warehouseName}
                  </span>
                </td>
                <td className="px-4 py-4">{getStatusBadge(order.status)}</td>
                <td className="px-4 py-4">
                  <span className="text-sm text-[#A1A4B3]">
                    {formatDate(order.orderDate)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-[#A1A4B3]">
                    {order.itemCount} items
                  </span>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="text-sm font-medium text-[#F5F6FA]">
                    {formatCurrency(order.total)}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

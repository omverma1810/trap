"use client";

import * as React from "react";
import {
  Search,
  X,
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  RotateCcw,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Info,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  KPICard,
  ChartSkeleton,
  ErrorBanner,
  EmptyState,
  DashboardFilterBar,
  SectionCard,
  ReportExportButtons,
} from "@/components/dashboard";
import type { ReportExportConfig } from "@/components/dashboard";
import {
  useDashboardFilters,
  useProductDetailReport,
} from "@/hooks";
import { useProducts, useCategories } from "@/hooks";
import type { Product } from "@/services";

const OPTION_CLASS = "bg-[#1A1B23] text-[#F5F6FA]";

function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatCurrencyCompact(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 1000000) return `₹${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toFixed(0)}`;
}

const MOVEMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PURCHASE: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Purchase" },
  OPENING: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Opening" },
  SALE: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Sale" },
  RETURN: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Return" },
  RETURN_INWARD: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Return In" },
  RETURN_OUTWARD: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Return Out" },
  ADJUSTMENT: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Adjustment" },
  DAMAGE: { bg: "bg-red-500/15", text: "text-red-400", label: "Damage" },
  TRANSFER_IN: { bg: "bg-teal-500/15", text: "text-teal-400", label: "Transfer In" },
  TRANSFER_OUT: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Transfer Out" },
};

export default function ProductDetailReportPage() {
  const { filters } = useDashboardFilters();

  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [brandFilter, setBrandFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, brandFilter]);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    search: debouncedSearch || undefined,
    category: categoryFilter || undefined,
    brand: brandFilter || undefined,
    page,
    page_size: 20,
  });

  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];

  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport,
  } = useProductDetailReport({
    productId: selectedProduct?.id,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const exportConfig: ReportExportConfig = React.useMemo(() => {
    if (!report || !selectedProduct) {
      return { title: "", filename: "", columns: [], data: [] };
    }
    return {
      title: `Product Detail Report — ${selectedProduct.name}`,
      filename: `product-report-${selectedProduct.sku}-${filters.dateFrom || "all"}-${filters.dateTo || "all"}`,
      subtitle: `SKU: ${selectedProduct.sku} | Brand: ${selectedProduct.brand} | Category: ${selectedProduct.category}`,
      columns: [
        { header: "Month", key: "month", width: 15 },
        { header: "Units Sold", key: "quantitySold", width: 15, align: "right" as const, type: "number" as const },
        { header: "Revenue (₹)", key: "revenue", width: 20, align: "right" as const, type: "currency" as const },
      ],
      data: report.monthlyTrend.map((item) => ({
        month: item.month,
        quantitySold: item.quantitySold,
        revenue: item.revenue,
      })),
      summary: {
        Product: selectedProduct.name,
        SKU: selectedProduct.sku,
        Brand: selectedProduct.brand,
        Category: selectedProduct.category,
        "Total Stock": report.totalStock.toString(),
        "Units Sold": report.salesSummary.totalQuantitySold.toString(),
        "Total Revenue": formatCurrency(report.salesSummary.totalRevenue),
        "GST Collected": formatCurrency(report.salesSummary.totalGst),
        "Total Returns": report.returnsSummary.totalReturned.toString(),
        Orders: report.salesSummary.orderCount.toString(),
      },
      dateRange:
        filters.dateFrom && filters.dateTo
          ? { from: filters.dateFrom, to: filters.dateTo }
          : undefined,
    };
  }, [report, selectedProduct, filters]);

  // Chart data
  const chartData = React.useMemo(() => {
    if (!report?.monthlyTrend) return [];
    return report.monthlyTrend.map((item) => ({
      month: item.month,
      revenue: parseFloat(item.revenue),
      units: item.quantitySold,
    }));
  }, [report]);

  // ─── Product picker view ────────────────────────────────────────────────────
  if (!selectedProduct) {
    const products = productsData?.results || [];
    const meta = productsData?.meta;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Report</h1>
          <p className="text-sm text-white/40 mt-1">
            Search and select a product to view its detailed report
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7285]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-[#6F7285]" />
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] cursor-pointer"
          >
            <option className={OPTION_CLASS} value="">All Categories</option>
            {categories.map((cat: { id: string; name: string }) => (
              <option className={OPTION_CLASS} key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            placeholder="Brand..."
            className="px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] w-36"
          />
        </div>

        {/* Product list */}
        <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/[0.06] text-xs font-semibold text-white/40 uppercase tracking-wider">
            <div className="col-span-5">Product</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-2">Brand</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1 text-right">Stock</div>
          </div>

          {productsLoading ? (
            <div className="divide-y divide-white/[0.04]">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-3 px-4 py-3.5">
                  <div className="col-span-5">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-full" />
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
                  </div>
                  <div className="col-span-2">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />
                  </div>
                  <div className="col-span-1">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Package}
                title="No products found"
                description="Try adjusting your search or filter criteria."
              />
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className="w-full grid grid-cols-12 gap-3 px-4 py-3.5 text-left hover:bg-white/[0.04] transition-colors group"
                >
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-[#F5F6FA] group-hover:text-[#C6A15B] transition-colors truncate">
                      {product.name}
                    </p>
                    {!product.isActive && (
                      <span className="text-xs text-red-400/70">Inactive</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs font-mono text-[#A1A4B3] bg-white/[0.05] px-1.5 py-0.5 rounded">
                      {product.sku}
                    </span>
                  </div>
                  <div className="col-span-2 text-sm text-[#A1A4B3] truncate">
                    {product.brand || "—"}
                  </div>
                  <div className="col-span-2 text-sm text-[#A1A4B3] truncate">
                    {product.category || "—"}
                  </div>
                  <div className="col-span-1 text-right">
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        product.totalStock === 0
                          ? "text-red-400"
                          : product.totalStock <= 5
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}
                    >
                      {product.totalStock}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <p className="text-xs text-white/40">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} of{" "}
                {meta.total} products
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!meta.hasPrev}
                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/50 tabular-nums">
                  {page} / {Math.ceil(meta.total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasNext}
                  className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Report view ────────────────────────────────────────────────────────────
  if (reportLoading && !report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProduct(null)}
            className="p-2 rounded-lg hover:bg-white/5 text-white/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/5 rounded animate-pulse mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <KPICard key={i} title="" value="" loading />
          ))}
        </div>
        <ChartSkeleton height={320} />
        <ChartSkeleton height={280} />
      </div>
    );
  }

  if (reportError) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedProduct(null)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to product list
        </button>
        <ErrorBanner
          message={(reportError as Error).message || "Failed to load product report"}
          onRetry={refetchReport}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedProduct(null)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to product list
          </button>
          <h1 className="text-2xl font-bold text-white">{selectedProduct.name}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs font-mono bg-white/[0.07] px-2 py-0.5 rounded text-[#A1A4B3]">
              {selectedProduct.sku}
            </span>
            {selectedProduct.brand && (
              <span className="text-xs bg-[#C6A15B]/10 text-[#C6A15B] px-2 py-0.5 rounded">
                {selectedProduct.brand}
              </span>
            )}
            {selectedProduct.category && (
              <span className="text-xs bg-white/[0.05] text-white/50 px-2 py-0.5 rounded">
                {selectedProduct.category}
              </span>
            )}
            {!selectedProduct.isActive && (
              <span className="text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <ReportExportButtons
            config={exportConfig}
            disabled={!report?.monthlyTrend}
          />
          <DashboardFilterBar onRefresh={refetchReport} isRefreshing={reportLoading} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Stock"
          value={(report?.totalStock ?? 0).toLocaleString()}
          subtitle="Current inventory"
          icon={Boxes}
        />
        <KPICard
          title="Units Sold"
          value={(report?.salesSummary.totalQuantitySold ?? 0).toLocaleString()}
          subtitle="In period"
          icon={Package}
        />
        <KPICard
          title="Revenue"
          value={formatCurrencyCompact(report?.salesSummary.totalRevenue ?? "0")}
          subtitle="In period"
          icon={DollarSign}
        />
        <KPICard
          title="GST Collected"
          value={formatCurrencyCompact(report?.salesSummary.totalGst ?? "0")}
          subtitle="In period"
          icon={TrendingUp}
        />
        <KPICard
          title="Returns"
          value={(report?.returnsSummary.totalReturned ?? 0).toLocaleString()}
          subtitle={`${(report?.returnsSummary.returnCount ?? 0)} return orders`}
          icon={RotateCcw}
        />
      </div>

      {/* Two-column middle: Stock by location + Product details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Location */}
        <SectionCard
          title="Stock by Location"
          description="Current stock in each warehouse"
          icon={Boxes}
        >
          {(report?.stockByLocation ?? []).length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No stock recorded"
              description="No inventory movements found for this product."
            />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {(report?.stockByLocation ?? []).map((loc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-[#A1A4B3]">{loc.warehouseName}</span>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      loc.stock === 0
                        ? "text-red-400"
                        : loc.stock <= 5
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {loc.stock} units
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5 pt-3 border-t border-white/10 mt-1">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-sm font-semibold text-[#C6A15B] tabular-nums">
                  {report?.totalStock ?? 0} units
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Product Details */}
        <SectionCard
          title="Product Details"
          description="Pricing and product information"
          icon={Info}
        >
          <div className="space-y-3">
            {report?.product.pricing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Cost Price", value: formatCurrency(report.product.pricing.costPrice) },
                    { label: "MRP", value: formatCurrency(report.product.pricing.mrp) },
                    { label: "Selling Price", value: formatCurrency(report.product.pricing.sellingPrice) },
                    { label: "GST Rate", value: `${report.product.pricing.gstPercentage}%` },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/[0.03] rounded-lg p-3">
                      <p className="text-xs text-white/40 mb-1">{item.label}</p>
                      <p className="text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                {report.product.pricing.marginPercentage && (
                  <div className="bg-[#C6A15B]/5 border border-[#C6A15B]/20 rounded-lg p-3">
                    <p className="text-xs text-[#C6A15B]/70 mb-1">Margin</p>
                    <p className="text-sm font-semibold text-[#C6A15B]">
                      {parseFloat(report.product.pricing.marginPercentage).toFixed(1)}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-white/30 italic">No pricing data available</p>
            )}

            <div className="pt-2 space-y-2 text-xs text-white/40 divide-y divide-white/[0.05]">
              {[
                { label: "Gender", value: report?.product.gender || "—" },
                { label: "Material", value: report?.product.material || "—" },
                { label: "Season", value: report?.product.season || "—" },
                { label: "Country", value: report?.product.countryOfOrigin || "—" },
                { label: "Supplier", value: report?.product.supplierName || "—" },
                { label: "Orders", value: `${report?.salesSummary.orderCount ?? 0} orders` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between py-1.5 first:pt-0">
                  <span>{row.label}</span>
                  <span className="text-white/60">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Monthly Sales Trend */}
      <SectionCard
        title="Monthly Sales Trend"
        description="Revenue and units sold by month"
        icon={TrendingUp}
      >
        {chartData.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No sales data"
            description="Sales trend will appear once this product has completed sales in the selected period."
          />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ left: 10, right: 30, top: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={{ stroke: "rgba(255,255,255,0.1)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(26, 27, 35, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "white",
                }}
                formatter={(value, name) => {
                  const n = Number(value);
                  return [
                    name === "revenue" ? formatCurrency(n) : n.toLocaleString(),
                    name === "revenue" ? "Revenue" : "Units Sold",
                  ];
                }}
                labelStyle={{ color: "rgba(255,255,255,0.7)", fontWeight: "bold" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "16px" }}
                formatter={(value) => (
                  <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                    {value === "revenue" ? "Revenue (₹)" : "Units Sold"}
                  </span>
                )}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#C6A15B"
                strokeWidth={2}
                dot={{ fill: "#C6A15B", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#C6A15B" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="units"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: "#10B981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Recent Inventory Movements */}
      <SectionCard
        title="Recent Inventory Movements"
        description="Last 50 movements for this product"
        icon={Activity}
      >
        {(report?.recentMovements ?? []).length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No movements recorded"
            description="Inventory movements will appear here once stock operations are performed."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Type", "Qty", "Warehouse", "Reference", "By", "Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider pb-3 pr-4 last:pr-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(report?.recentMovements ?? []).map((m, i) => {
                  const style = MOVEMENT_STYLES[m.movementType] ?? {
                    bg: "bg-white/10",
                    text: "text-white/60",
                    label: m.movementType,
                  };
                  return (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`text-sm font-medium tabular-nums ${
                            m.quantity > 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-[#A1A4B3]">
                        {m.warehouseName ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-[#A1A4B3] text-xs">
                        {m.referenceType ? (
                          <span>
                            {m.referenceType}
                            {m.referenceId ? (
                              <span className="text-white/30 ml-1">#{m.referenceId.slice(0, 8)}</span>
                            ) : null}
                          </span>
                        ) : (
                          m.remarks || "—"
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-[#6F7285] text-xs">
                        {m.createdBy ?? "—"}
                      </td>
                      <td className="py-2.5 text-[#6F7285] text-xs tabular-nums whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="text-xs text-white/30 text-center py-4">
        Data derived from InventoryMovement ledger and SaleItem records • No frontend calculations
      </div>
    </div>
  );
}

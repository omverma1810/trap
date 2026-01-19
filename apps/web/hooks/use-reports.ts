/**
 * Reports Hooks
 * React Query hooks for Phase 16 report APIs
 *
 * PHASE 17: DASHBOARDS & VISUAL ANALYTICS
 * ========================================
 *
 * Core Rule: Dashboards visualize answers. They do not calculate them.
 * All data comes from Phase 16 report APIs.
 */
import { useQuery } from "@tanstack/react-query";
import {
  reportsService,
  ReportParams,
  MovementParams,
  TrendsParams,
} from "@/services";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const reportKeys = {
  all: ["reports"] as const,

  // Inventory
  inventory: () => [...reportKeys.all, "inventory"] as const,
  currentStock: (params?: ReportParams) =>
    [...reportKeys.inventory(), "current", params] as const,
  stockAging: (params?: { warehouseId?: string }) =>
    [...reportKeys.inventory(), "aging", params] as const,
  stockMovements: (params?: MovementParams) =>
    [...reportKeys.inventory(), "movements", params] as const,

  // Sales
  sales: () => [...reportKeys.all, "sales"] as const,
  salesSummary: (params?: ReportParams) =>
    [...reportKeys.sales(), "summary", params] as const,
  productSales: (params?: ReportParams) =>
    [...reportKeys.sales(), "by-product", params] as const,
  salesTrends: (params?: TrendsParams) =>
    [...reportKeys.sales(), "trends", params] as const,

  // Returns & Adjustments
  returns: (params?: ReportParams) =>
    [...reportKeys.all, "returns", params] as const,
  adjustments: (params?: ReportParams) =>
    [...reportKeys.all, "adjustments", params] as const,

  // Profit & Tax
  profit: (params?: ReportParams) =>
    [...reportKeys.all, "profit", params] as const,
  gstSummary: (params?: ReportParams) =>
    [...reportKeys.all, "gst", params] as const,
};

// =============================================================================
// INVENTORY HOOKS
// =============================================================================

/**
 * Current Stock Report
 * Source: /reports/inventory/current/
 */
export function useCurrentStock(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.currentStock(params),
    queryFn: () => reportsService.getCurrentStock(params),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Stock Aging Report
 * Source: /reports/inventory/aging/
 */
export function useStockAging(params?: { warehouseId?: string }) {
  return useQuery({
    queryKey: reportKeys.stockAging(params),
    queryFn: () => reportsService.getStockAging(params),
    staleTime: 60000, // 1 minute
  });
}

/**
 * Stock Movement Report
 * Source: /reports/inventory/movements/
 */
export function useStockMovements(params?: MovementParams) {
  return useQuery({
    queryKey: reportKeys.stockMovements(params),
    queryFn: () => reportsService.getStockMovements(params),
    staleTime: 30000,
  });
}

// =============================================================================
// SALES HOOKS
// =============================================================================

/**
 * Sales Summary Report
 * Source: /reports/sales/summary/
 *
 * Returns: total_sales, invoice_count, total_items_sold, total_gst, total_discount
 */
export function useSalesSummaryReport(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.salesSummary(params),
    queryFn: () => reportsService.getSalesSummary(params),
    staleTime: 30000,
  });
}

/**
 * Product Sales Report
 * Source: /reports/sales/by-product/
 */
export function useProductSales(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.productSales(params),
    queryFn: () => reportsService.getProductSales(params),
    staleTime: 30000,
  });
}

/**
 * Sales Trends Report
 * Source: /reports/sales/trends/
 *
 * Supports daily or monthly grouping for charts.
 */
export function useSalesTrendsReport(params?: TrendsParams) {
  return useQuery({
    queryKey: reportKeys.salesTrends(params),
    queryFn: () => reportsService.getSalesTrends(params),
    staleTime: 30000,
  });
}

// =============================================================================
// RETURNS & ADJUSTMENTS HOOKS
// =============================================================================

/**
 * Returns Summary Report
 * Source: /reports/returns/
 */
export function useReturnsSummary(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.returns(params),
    queryFn: () => reportsService.getReturnsSummary(params),
    staleTime: 30000,
  });
}

/**
 * Adjustments Report (Admin Only)
 * Source: /reports/adjustments/
 */
export function useAdjustments(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.adjustments(params),
    queryFn: () => reportsService.getAdjustments(params),
    staleTime: 30000,
  });
}

// =============================================================================
// PROFIT & TAX HOOKS (ADMIN ONLY)
// =============================================================================

/**
 * Gross Profit Report
 * Source: /reports/profit/
 */
export function useGrossProfit(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.profit(params),
    queryFn: () => reportsService.getGrossProfit(params),
    staleTime: 60000,
  });
}

/**
 * GST Summary Report
 * Source: /reports/tax/gst/
 */
export function useGstSummary(params?: ReportParams) {
  return useQuery({
    queryKey: reportKeys.gstSummary(params),
    queryFn: () => reportsService.getGstSummary(params),
    staleTime: 60000,
  });
}

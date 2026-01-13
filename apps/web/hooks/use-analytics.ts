/**
 * Analytics Hooks
 * React Query hooks for analytics data
 */
import { useQuery } from "@tanstack/react-query";
import { analyticsService, AnalyticsParams } from "@/services";

export const analyticsKeys = {
  all: ["analytics"] as const,
  inventory: () => [...analyticsKeys.all, "inventory"] as const,
  inventoryOverview: (params?: AnalyticsParams) => [...analyticsKeys.inventory(), "overview", params] as const,
  sales: () => [...analyticsKeys.all, "sales"] as const,
  salesSummary: (params?: AnalyticsParams) => [...analyticsKeys.sales(), "summary", params] as const,
  salesTrends: (params?: AnalyticsParams) => [...analyticsKeys.sales(), "trends", params] as const,
  topProducts: (params?: AnalyticsParams) => [...analyticsKeys.sales(), "top", params] as const,
  revenue: () => [...analyticsKeys.all, "revenue"] as const,
  revenueOverview: (params?: AnalyticsParams) => [...analyticsKeys.revenue(), "overview", params] as const,
  discounts: () => [...analyticsKeys.all, "discounts"] as const,
  discountOverview: (params?: AnalyticsParams) => [...analyticsKeys.discounts(), "overview", params] as const,
  performance: (params?: AnalyticsParams) => [...analyticsKeys.all, "performance", params] as const,
};

export function useInventoryOverview(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.inventoryOverview(params),
    queryFn: () => analyticsService.getInventoryOverview(params),
  });
}

export function useSalesSummary(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.salesSummary(params),
    queryFn: () => analyticsService.getSalesSummary(params),
  });
}

export function useSalesTrends(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.salesTrends(params),
    queryFn: () => analyticsService.getSalesTrends(params),
  });
}

export function useTopProducts(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.topProducts(params),
    queryFn: () => analyticsService.getTopProducts(params),
  });
}

export function useRevenueOverview(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.revenueOverview(params),
    queryFn: () => analyticsService.getRevenueOverview(params),
  });
}

export function useDiscountOverview(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.discountOverview(params),
    queryFn: () => analyticsService.getDiscountOverview(params),
  });
}

export function usePerformanceOverview(params?: AnalyticsParams) {
  return useQuery({
    queryKey: analyticsKeys.performance(params),
    queryFn: () => analyticsService.getPerformanceOverview(params),
  });
}

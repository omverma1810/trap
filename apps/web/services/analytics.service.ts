/**
 * Analytics Service
 * Handles all analytics-related API calls
 */
import { api } from "@/lib/api";

// Types
export interface InventoryOverview {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
  in_stock_percentage: number;
  low_stock_percentage: number;
  out_of_stock_percentage: number;
}

export interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  average_order_value: number;
  total_discount: number;
  period: string;
}

export interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: number;
  name: string;
  sku: string;
  units_sold: number;
  revenue: number;
}

export interface RevenueOverview {
  total_revenue: number;
  revenue_delta: number;
  profit: number;
  profit_delta: number;
  period: string;
}

export interface DiscountOverview {
  discounted_sales: number;
  regular_sales: number;
  total_discount_amount: number;
  discount_percentage: number;
}

export interface PerformanceOverview {
  kpis: {
    total_revenue: number;
    revenue_delta: number;
    total_sales: number;
    sales_delta: number;
    avg_order_value: number;
    aov_delta: number;
    profit: number;
    profit_delta: number;
  };
  inventory_health: {
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
  };
  discount_metrics: {
    discounted_sales: number;
    regular_sales: number;
    total_discount_amount: number;
  };
  top_products: TopProduct[];
  low_performers: TopProduct[];
}

export interface AnalyticsParams {
  period?: "today" | "week" | "month" | "year";
  warehouse_id?: number;
  start_date?: string;
  end_date?: string;
}

// Dashboard Summary (unified endpoint)
export interface AnalyticsSummary {
  totalProducts: number;
  todaySalesAmount: number;
  pendingInvoices: number;
  monthlyRevenue: number;
  trends: {
    productsChangePct: number;
    salesChangePct: number;
    invoicesChangePct: number;
    revenueChangePct: number;
  };
  meta: {
    generatedAt: string;
    warehouseId: string | null;
  };
}

// API Endpoints
export const analyticsService = {
  // Inventory Analytics
  getInventoryOverview: (params?: AnalyticsParams) =>
    api.get<InventoryOverview>("/analytics/inventory/overview/", params),
  
  getLowStock: (params?: AnalyticsParams) =>
    api.get<TopProduct[]>("/analytics/inventory/low-stock/", params),
  
  getDeadStock: (params?: AnalyticsParams) =>
    api.get<TopProduct[]>("/analytics/inventory/dead-stock/", params),
  
  // Sales Analytics
  getSalesSummary: (params?: AnalyticsParams) =>
    api.get<SalesSummary>("/analytics/sales/summary/", params),
  
  getSalesTrends: (params?: AnalyticsParams) =>
    api.get<SalesTrend[]>("/analytics/sales/trends/", params),
  
  getTopProducts: (params?: AnalyticsParams) =>
    api.get<TopProduct[]>("/analytics/sales/top-products/", params),
  
  // Revenue Analytics
  getRevenueOverview: (params?: AnalyticsParams) =>
    api.get<RevenueOverview>("/analytics/revenue/overview/", params),
  
  // Discount Analytics
  getDiscountOverview: (params?: AnalyticsParams) =>
    api.get<DiscountOverview>("/analytics/discounts/overview/", params),
  
  // Combined Performance
  getPerformanceOverview: (params?: AnalyticsParams) =>
    api.get<PerformanceOverview>("/analytics/performance/overview/", params),
  
  // Dashboard Summary (unified endpoint)
  getAnalyticsSummary: (params?: { warehouse_id?: string }) =>
    api.get<AnalyticsSummary>("/analytics/summary/", params),
};

export default analyticsService;

// Mock Analytics Data
export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sku: string;
  unitsSold: number;
  revenue: number;
  stockAge?: number; // days
}

export interface AnalyticsData {
  kpis: {
    totalRevenue: number;
    revenueDelta: number;
    totalSales: number;
    salesDelta: number;
    avgOrderValue: number;
    aovDelta: number;
    profit: number;
    profitDelta: number;
  };
  revenueByDay: DailyRevenue[];
  inventoryHealth: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
  };
  discountMetrics: {
    discountedSales: number;
    regularSales: number;
    totalDiscountAmount: number;
  };
  topProducts: ProductPerformance[];
  lowPerformers: ProductPerformance[];
}

// Static revenue data (deterministic to avoid hydration mismatch)
const revenueData: DailyRevenue[] = [
  { date: "2025-12-15", revenue: 52340, orders: 29 },
  { date: "2025-12-16", revenue: 58120, orders: 32 },
  { date: "2025-12-17", revenue: 61890, orders: 35 },
  { date: "2025-12-18", revenue: 48920, orders: 27 },
  { date: "2025-12-19", revenue: 55670, orders: 31 },
  { date: "2025-12-20", revenue: 38450, orders: 21 },
  { date: "2025-12-21", revenue: 32100, orders: 18 },
  { date: "2025-12-22", revenue: 54780, orders: 30 },
  { date: "2025-12-23", revenue: 67890, orders: 38 },
  { date: "2025-12-24", revenue: 72340, orders: 40 },
  { date: "2025-12-25", revenue: 28900, orders: 16 },
  { date: "2025-12-26", revenue: 45670, orders: 25 },
  { date: "2025-12-27", revenue: 35200, orders: 20 },
  { date: "2025-12-28", revenue: 31450, orders: 17 },
  { date: "2025-12-29", revenue: 58920, orders: 33 },
  { date: "2025-12-30", revenue: 63450, orders: 35 },
  { date: "2025-12-31", revenue: 48900, orders: 27 },
  { date: "2026-01-01", revenue: 25600, orders: 14 },
  { date: "2026-01-02", revenue: 42300, orders: 24 },
  { date: "2026-01-03", revenue: 56780, orders: 32 },
  { date: "2026-01-04", revenue: 34500, orders: 19 },
  { date: "2026-01-05", revenue: 29800, orders: 17 },
  { date: "2026-01-06", revenue: 51230, orders: 28 },
  { date: "2026-01-07", revenue: 59870, orders: 33 },
  { date: "2026-01-08", revenue: 64320, orders: 36 },
  { date: "2026-01-09", revenue: 58900, orders: 33 },
  { date: "2026-01-10", revenue: 71250, orders: 40 },
  { date: "2026-01-11", revenue: 42100, orders: 23 },
  { date: "2026-01-12", revenue: 38700, orders: 21 },
  { date: "2026-01-13", revenue: 55340, orders: 31 },
];

export const mockAnalytics: AnalyticsData = {
  kpis: {
    totalRevenue: 1458920,
    revenueDelta: 12.5,
    totalSales: 824,
    salesDelta: 8.3,
    avgOrderValue: 1770,
    aovDelta: 3.8,
    profit: 423850,
    profitDelta: 15.2,
  },
  revenueByDay: revenueData,
  inventoryHealth: {
    inStock: 65,
    lowStock: 21,
    outOfStock: 14,
  },
  discountMetrics: {
    discountedSales: 312,
    regularSales: 512,
    totalDiscountAmount: 89650,
  },
  topProducts: [
    { id: "1", name: "Leather Biker Jacket", sku: "JKT-002", unitsSold: 45, revenue: 404955 },
    { id: "2", name: "Canvas Sneakers - White", sku: "FTW-001", unitsSold: 62, revenue: 185938 },
    { id: "3", name: "Slim Fit Denim Jeans - Blue", sku: "JNS-001", unitsSold: 78, revenue: 194922 },
    { id: "4", name: "Premium Cotton T-Shirt - White", sku: "TSH-001", unitsSold: 124, revenue: 161076 },
    { id: "5", name: "Crew Neck Sweater - Grey", sku: "SWT-001", unitsSold: 52, revenue: 114348 },
  ],
  lowPerformers: [
    { id: "6", name: "Athletic Shorts", sku: "SHR-003", unitsSold: 3, revenue: 2997, stockAge: 45 },
    { id: "7", name: "Baseball Cap - Black", sku: "ACC-006", unitsSold: 0, revenue: 0, stockAge: 38 },
    { id: "8", name: "Formal Dress Shirt - White", sku: "SHT-004", unitsSold: 2, revenue: 3198, stockAge: 32 },
    { id: "9", name: "V-Neck Essential T-Shirt", sku: "TSH-004", unitsSold: 5, revenue: 4995, stockAge: 28 },
    { id: "10", name: "Running Shoes - Black", sku: "FTW-003", unitsSold: 0, revenue: 0, stockAge: 25 },
  ],
};

// Format currency
export function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format number with K/L suffix
export function formatNumber(num: number): string {
  if (num >= 100000) {
    return `${(num / 100000).toFixed(1)}L`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

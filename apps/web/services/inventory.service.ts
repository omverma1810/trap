/**
 * Inventory Service
 * Handles all inventory-related API calls
 */
import { api } from "@/lib/api";

// Types
export interface Warehouse {
  id: string; // UUID from backend
  name: string;
  code?: string;
  address?: string;
  is_active: boolean;
}

export interface Product {
  id: string; // UUID from backend
  sku: string;
  barcode: string;
  name: string;
  category: string;
  cost_price: string;
  selling_price: string;
  stock: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
}

export interface StockSummary {
  total_products: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  total_value: number;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  warehouse?: string;
  stock_status?: "in_stock" | "low_stock" | "out_of_stock";
  gender?: string;
  brand?: string;
  material?: string;
  season?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API Endpoints
export const inventoryService = {
  // Warehouses - returns paginated response, extract results
  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get<PaginatedResponse<Warehouse> | Warehouse[]>(
      "/inventory/warehouses/"
    );
    // Handle both paginated and non-paginated responses
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  },

  getWarehouse: (id: number) =>
    api.get<Warehouse>(`/inventory/warehouses/${id}/`),

  // Products
  getProducts: (params?: ProductListParams) =>
    api.get<PaginatedResponse<Product>>("/inventory/products/", params),

  getProduct: (id: number) => api.get<Product>(`/inventory/products/${id}/`),

  getProductBySku: async (sku: string): Promise<Product[]> => {
    const response = await api.get<PaginatedResponse<Product>>(
      "/inventory/products/",
      { search: sku }
    );
    return response.results || [];
  },

  // Stock Summary
  getStockSummary: () => api.get<StockSummary>("/inventory/stock/summary/"),

  // Stock Operations
  purchaseStock: (data: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
  }) => api.post("/inventory/stock/purchase/", data),

  adjustStock: (data: {
    product_id: number;
    warehouse_id: number;
    quantity: number;
    reason: string;
  }) => api.post("/inventory/stock/adjust/", data),

  // Deactivate (soft delete) a product
  deactivateProduct: (id: string) => api.delete(`/inventory/products/${id}/`),

  // POS Products - flattened variants for POS grid
  getPOSProducts: (params?: {
    warehouse_id?: string;
    search?: string;
    category?: string;
    in_stock_only?: boolean;
  }) =>
    api.get<PaginatedResponse<POSProduct>>("/inventory/pos/products/", params),
};

// POS Product type - flattened variant for POS grid
export interface POSProduct {
  id: string;
  name: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  barcode: string;
  size: string | null;
  color: string | null;
  sellingPrice: string;
  costPrice: string;
  stock: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  reorderThreshold: number;
  barcodeImageUrl: string | null;
}

export default inventoryService;

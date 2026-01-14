/**
 * Inventory Service
 * Handles all inventory-related API calls
 */
import { api } from "@/lib/api";

// Types
export interface Warehouse {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
}

export interface Product {
  id: number;
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
  // Warehouses
  getWarehouses: () => api.get<Warehouse[]>("/inventory/warehouses/"),
  
  getWarehouse: (id: number) => api.get<Warehouse>(`/inventory/warehouses/${id}/`),
  
  // Products
  getProducts: (params?: ProductListParams) => 
    api.get<PaginatedResponse<Product>>("/inventory/products/", params),
  
  getProduct: (id: number) => api.get<Product>(`/inventory/products/${id}/`),
  
  getProductBySku: (sku: string) => 
    api.get<Product[]>("/inventory/products/", { search: sku }),
  
  // Stock Summary
  getStockSummary: () => api.get<StockSummary>("/inventory/stock/summary/"),
  
  // Stock Operations
  purchaseStock: (data: { product_id: number; warehouse_id: number; quantity: number }) =>
    api.post("/inventory/stock/purchase/", data),
  
  adjustStock: (data: { product_id: number; warehouse_id: number; quantity: number; reason: string }) =>
    api.post("/inventory/stock/adjust/", data),
};

export default inventoryService;

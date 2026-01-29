/**
 * Inventory Service
 * Handles all inventory-related API calls
 *
 * Phase 10B: Updated for Phase 10A Product Master fields
 */
import { api } from "@/lib/api";

// =============================================================================
// TYPES
// =============================================================================

export interface Warehouse {
  id: string;
  name: string;
  code?: string;
  address?: string;
  isActive: boolean;
}

export interface ProductPricing {
  id?: string;
  costPrice: string;
  mrp: string;
  sellingPrice: string;
  gstPercentage: string;
  marginPercentage?: string; // Computed, read-only
  profitAmount?: string; // Computed, read-only
  gstAmount?: string; // Computed, read-only
}

export interface ProductImage {
  id?: string;
  imageUrl: string;
  isPrimary: boolean;
  createdAt?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  size?: string;
  color?: string;
  costPrice: string;
  sellingPrice: string;
  reorderThreshold: number;
  isActive: boolean;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string; // Phase 10.1: Auto-generated, immutable
  barcodeValue: string; // Auto-generated, immutable
  barcodeImageUrl?: string; // SVG URL
  brand: string;
  brandId?: string;
  category: string;
  categoryId?: string;
  description?: string;
  countryOfOrigin?: string;
  attributes: Record<string, string | number | string[]>;
  gender: "MENS" | "WOMENS" | "UNISEX" | "KIDS";
  material?: string;
  season?: string;
  isActive: boolean;
  isDeleted: boolean; // Phase 10A soft delete
  pricing?: ProductPricing; // Nested pricing object
  images?: ProductImage[];
  variants?: ProductVariant[];
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreateData {
  name: string;
  brand: string;
  category: string;
  description?: string;
  countryOfOrigin?: string;
  attributes?: Record<string, string | number | string[]>;
  gender?: "MENS" | "WOMENS" | "UNISEX" | "KIDS";
  material?: string;
  season?: string;
  isActive?: boolean;
  pricing?: {
    costPrice: string;
    mrp: string;
    sellingPrice: string;
    gstPercentage?: string;
  };
  warehouseId?: string;
  variants?: {
    sku?: string;
    size?: string;
    color?: string;
    costPrice: number;
    sellingPrice: number;
    reorderThreshold?: number;
    initialStock?: number;
  }[];
}

export interface ProductUpdateData {
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  countryOfOrigin?: string;
  attributes?: Record<string, string | number | string[]>;
  gender?: "MENS" | "WOMENS" | "UNISEX" | "KIDS";
  material?: string;
  season?: string;
  isActive?: boolean;
  pricing?: {
    costPrice?: string;
    mrp?: string;
    sellingPrice?: string;
    gstPercentage?: string;
  };
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
  price_min?: number;
  price_max?: number;
  is_deleted?: boolean; // Phase 10A: Show deleted products (admin only)
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

// =============================================================================
// API ENDPOINTS
// =============================================================================

export const inventoryService = {
  // -------------------------------------------------------------------------
  // Warehouses
  // -------------------------------------------------------------------------
  getWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get<PaginatedResponse<Warehouse> | Warehouse[]>(
      "/inventory/warehouses/",
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  },

  getWarehouse: (id: string) =>
    api.get<Warehouse>(`/inventory/warehouses/${id}/`),

  createWarehouse: (data: Partial<Warehouse>) =>
    api.post<Warehouse>("/inventory/warehouses/", data),

  // -------------------------------------------------------------------------
  // Products - CRUD
  // -------------------------------------------------------------------------
  getProducts: (params?: ProductListParams) =>
    api.get<PaginatedResponse<Product>>(
      "/inventory/products/",
      params as Record<string, unknown>,
    ),

  getProduct: (id: string) => api.get<Product>(`/inventory/products/${id}/`),

  getProductBySku: async (sku: string): Promise<Product[]> => {
    const response = await api.get<PaginatedResponse<Product>>(
      "/inventory/products/",
      { search: sku },
    );
    return response.results || [];
  },

  createProduct: (data: ProductCreateData) =>
    api.post<Product>("/inventory/products/", data),

  updateProduct: (id: string, data: ProductUpdateData) =>
    api.patch<Product>(`/inventory/products/${id}/`, data),

  deleteProduct: (id: string) => api.delete(`/inventory/products/${id}/`),

  // -------------------------------------------------------------------------
  // Stock Operations
  // -------------------------------------------------------------------------
  getStockSummary: () => api.get<StockSummary>("/inventory/stock/summary/"),

  purchaseStock: (data: {
    product_id: string;
    warehouse_id: string;
    quantity: number;
  }) => api.post("/inventory/stock/purchase/", data),

  adjustStock: (data: {
    product_id: string;
    warehouse_id: string;
    quantity: number;
    reason: string;
  }) => api.post("/inventory/stock/adjust/", data),

  // -------------------------------------------------------------------------
  // POS Products
  // -------------------------------------------------------------------------
  getPOSProducts: (params?: {
    warehouse_id?: string;
    store_id?: string;
    search?: string;
    category?: string;
    in_stock_only?: boolean;
  }) =>
    api.get<PaginatedResponse<POSProduct>>(
      "/inventory/pos/products/",
      params as Record<string, unknown>,
    ),
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

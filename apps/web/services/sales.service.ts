/**
 * Sales/POS Service
 * Handles all POS and sales-related API calls
 */
import { api } from "@/lib/api";

// Types
export interface ScannedProduct {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  selling_price: string;
  stock: number;
  is_available: boolean;
}

export interface CartItem {
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface CheckoutRequest {
  items: { product_id: number; quantity: number }[];
  payment_method: "cash" | "card";
  discount_percent?: number;
  customer_name?: string;
  customer_phone?: string;
}

export interface CheckoutResponse {
  sale_id: number;
  invoice_number: string;
  items_count: number;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
  message: string;
}

export interface Sale {
  id: number;
  invoice_number: string;
  date: string;
  items_count: number;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: string;
  status: string;
  cashier: string;
}

export interface SaleListParams {
  date_from?: string;
  date_to?: string;
  status?: string;
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
export const salesService = {
  // Barcode scan
  scanBarcode: (barcode: string) =>
    api.get<ScannedProduct>("/sales/scan/", { barcode }),
  
  // Checkout
  checkout: (data: CheckoutRequest) =>
    api.post<CheckoutResponse>("/sales/checkout/", data),
  
  // Sales history
  getSales: (params?: SaleListParams) =>
    api.get<PaginatedResponse<Sale>>("/sales/", params),
  
  // Single sale
  getSale: (id: number) => api.get<Sale>(`/sales/${id}/`),
};

export default salesService;

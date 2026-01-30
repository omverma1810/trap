/**
 * Purchase Orders Service
 * Handles all purchase order and supplier API calls
 */
import { api } from "@/lib/api";

// =============================================================================
// TYPES
// =============================================================================

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gst_number: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierListItem {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  product: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  received_quantity: number;
  pending_quantity: number;
  unit_price: string;
  tax_percentage: string;
  tax_amount: string;
  line_total: string;
  is_fully_received: boolean;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier: string;
  supplier_name: string;
  warehouse: string;
  warehouse_name: string;
  status: "DRAFT" | "SUBMITTED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: string;
  tax_amount: string;
  total: string;
  notes: string;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListItem {
  id: string;
  po_number: string;
  supplier_name: string;
  warehouse_name: string;
  status: "DRAFT" | "SUBMITTED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  order_date: string;
  expected_date: string | null;
  total: string;
  item_count: number;
  created_at: string;
}

export interface CreatePurchaseOrderData {
  supplier: string;
  warehouse: string;
  order_date: string;
  expected_date?: string;
  notes?: string;
  items: {
    product: string;
    quantity: number;
    unit_price: number;
    tax_percentage?: number;
  }[];
}

export interface CreateSupplierData {
  name: string;
  code?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  notes?: string;
}

export interface ReceiveItemData {
  item_id: string;
  quantity: number;
}

export interface PurchaseOrderListParams {
  status?: string;
  supplier_id?: string;
  start_date?: string;
  end_date?: string;
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

export const purchaseOrdersService = {
  // -------------------------------------------------------------------------
  // Suppliers
  // -------------------------------------------------------------------------
  getSuppliers: async (params?: { search?: string; minimal?: boolean }) => {
    const response = await api.get<PaginatedResponse<Supplier> | Supplier[]>(
      "/inventory/suppliers/",
      params as Record<string, unknown>,
    );
    if (Array.isArray(response)) {
      return response;
    }
    return response.results || [];
  },

  getSupplier: (id: string) => api.get<Supplier>(`/inventory/suppliers/${id}/`),

  createSupplier: (data: CreateSupplierData) =>
    api.post<Supplier>("/inventory/suppliers/", data),

  updateSupplier: (id: string, data: Partial<CreateSupplierData>) =>
    api.patch<Supplier>(`/inventory/suppliers/${id}/`, data),

  deleteSupplier: (id: string) => api.delete(`/inventory/suppliers/${id}/`),

  // -------------------------------------------------------------------------
  // Purchase Orders
  // -------------------------------------------------------------------------
  getPurchaseOrders: (params?: PurchaseOrderListParams) =>
    api.get<PaginatedResponse<PurchaseOrderListItem>>(
      "/inventory/purchase-orders/",
      params as Record<string, unknown>,
    ),

  getPurchaseOrder: (id: string) =>
    api.get<PurchaseOrder>(`/inventory/purchase-orders/${id}/`),

  createPurchaseOrder: (data: CreatePurchaseOrderData) =>
    api.post<PurchaseOrder>("/inventory/purchase-orders/", data),

  updatePurchaseOrder: (id: string, data: Partial<CreatePurchaseOrderData>) =>
    api.patch<PurchaseOrder>(`/inventory/purchase-orders/${id}/`, data),

  deletePurchaseOrder: (id: string) =>
    api.delete(`/inventory/purchase-orders/${id}/`),

  submitPurchaseOrder: (id: string) =>
    api.post<PurchaseOrder>(`/inventory/purchase-orders/${id}/submit/`),

  receivePurchaseOrder: (id: string, items: ReceiveItemData[]) =>
    api.post<{
      purchaseOrder: string;
      status: string;
      itemsReceived: unknown[];
    }>(`/inventory/purchase-orders/${id}/receive/`, { items }),
};

export default purchaseOrdersService;

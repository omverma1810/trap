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
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListItem {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  product: string;
  productName: string;
  productSku: string;
  quantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPrice: string;
  taxPercentage: string;
  taxAmount: string;
  lineTotal: string;
  isFullyReceived: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  supplierName: string;
  warehouse: string;
  warehouseName: string;
  status: "DRAFT" | "SUBMITTED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  notes: string;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderListItem {
  id: string;
  poNumber: string;
  supplierName: string;
  warehouseName: string;
  status: "DRAFT" | "SUBMITTED" | "PARTIAL" | "RECEIVED" | "CANCELLED";
  orderDate: string;
  expectedDate: string | null;
  total: string;
  itemCount: number;
  createdAt: string;
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
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

export interface ReceiveItemData {
  item_id: string;
  quantity: number;
}

export interface PurchaseOrderListParams {
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
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

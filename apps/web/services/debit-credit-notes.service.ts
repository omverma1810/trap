/**
 * Debit/Credit Notes Service
 * Handles all debit and credit note API calls for returns management
 */
import { api } from "@/lib/api";

// =============================================================================
// TYPES
// =============================================================================

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  originalSale: string;
  originalInvoiceNumber: string;
  warehouse: string;
  warehouseName: string;
  status: "DRAFT" | "ISSUED" | "SETTLED" | "CANCELLED";
  returnReason:
    | "DEFECTIVE"
    | "WRONG_ITEM"
    | "SIZE_ISSUE"
    | "COLOR_ISSUE"
    | "CUSTOMER_DISSATISFACTION"
    | "DAMAGE_IN_TRANSIT"
    | "EXPIRED"
    | "OTHER";
  notes: string;
  totalAmount: string;
  refundAmount: string;
  returnDate: string;
  issueDate: string | null;
  settlementDate: string | null;
  customerName: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: CreditNoteItem[];
}

export interface CreditNoteItem {
  id: string;
  originalSaleItem: string;
  product: string;
  productName: string;
  productSku: string;
  quantityReturned: number;
  unitPrice: string;
  lineTotal: string;
  condition: "GOOD" | "DAMAGED" | "DEFECTIVE" | "EXPIRED";
  originalSaleInvoice: string;
  createdAt: string;
}

export interface DebitNote {
  id: string;
  debitNoteNumber: string;
  originalPurchaseOrder: string;
  originalPoNumber: string;
  supplier: string;
  supplierName: string;
  warehouse: string;
  warehouseName: string;
  status: "DRAFT" | "ISSUED" | "ACCEPTED" | "SETTLED" | "REJECTED";
  returnReason:
    | "DEFECTIVE_RECEIVED"
    | "WRONG_ITEMS"
    | "EXCESS_STOCK"
    | "EXPIRED"
    | "DAMAGE_IN_TRANSIT"
    | "QUALITY_ISSUES"
    | "ORDER_CANCELLATION"
    | "OTHER";
  notes: string;
  totalAmount: string;
  adjustmentAmount: string;
  returnDate: string;
  issueDate: string | null;
  settlementDate: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: DebitNoteItem[];
}

export interface DebitNoteItem {
  id: string;
  originalPurchaseOrderItem: string;
  product: string;
  productName: string;
  productSku: string;
  quantityReturned: number;
  unitPrice: string;
  lineTotal: string;
  condition: "GOOD" | "DAMAGED" | "DEFECTIVE" | "EXPIRED";
  originalPoNumber: string;
  createdAt: string;
}

export interface CreditNoteListItem {
  id: string;
  creditNoteNumber: string;
  originalInvoiceNumber: string;
  customerName: string;
  status: "DRAFT" | "ISSUED" | "SETTLED" | "CANCELLED";
  returnReason: string;
  totalAmount: string;
  refundAmount: string;
  returnDate: string;
  createdAt: string;
}

export interface DebitNoteListItem {
  id: string;
  debitNoteNumber: string;
  originalPoNumber: string;
  supplierName: string;
  status: "DRAFT" | "ISSUED" | "ACCEPTED" | "SETTLED" | "REJECTED";
  returnReason: string;
  totalAmount: string;
  adjustmentAmount: string;
  returnDate: string;
  createdAt: string;
}

export interface CreateCreditNoteData {
  originalSale: string;
  warehouse: string;
  returnReason: string;
  notes?: string;
  returnDate: string;
  items: {
    originalSaleItem: string;
    quantityReturned: number;
    condition?: string;
  }[];
}

export interface CreateDebitNoteData {
  originalPurchaseOrder: string;
  warehouse: string;
  returnReason: string;
  notes?: string;
  returnDate: string;
  items: {
    originalPurchaseOrderItem: string;
    quantityReturned: number;
    condition?: string;
  }[];
}

export interface ApiResponse<T> {
  results: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  returnReason?: string;
  warehouse?: string;
  supplier?: string;
  ordering?: string;
}

// =============================================================================
// API SERVICE
// =============================================================================

export class DebitCreditNotesService {
  private readonly baseUrl = "/inventory";

  // =============================================================================
  // CREDIT NOTES (CUSTOMER RETURNS)
  // =============================================================================

  async getCreditNotes(
    params: ListParams = {},
  ): Promise<ApiResponse<CreditNote>> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set("page", params.page.toString());
    if (params.pageSize)
      searchParams.set("page_size", params.pageSize.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.status) searchParams.set("status", params.status);
    if (params.returnReason)
      searchParams.set("return_reason", params.returnReason);
    if (params.warehouse) searchParams.set("warehouse", params.warehouse);
    if (params.ordering) searchParams.set("ordering", params.ordering);

    const url = `${this.baseUrl}/credit-notes/${searchParams.toString() ? `?${searchParams}` : ""}`;
    return api.get(url);
  }

  async getCreditNote(id: string): Promise<CreditNote> {
    return api.get(`${this.baseUrl}/credit-notes/${id}/`);
  }

  async createCreditNote(data: CreateCreditNoteData): Promise<CreditNote> {
    const payload = {
      original_sale: data.originalSale,
      warehouse: data.warehouse,
      return_reason: data.returnReason,
      notes: data.notes,
      return_date: data.returnDate,
      items: data.items.map((item) => ({
        original_sale_item: item.originalSaleItem,
        quantity_returned: item.quantityReturned,
        condition: item.condition,
      })),
    };
    return api.post(`${this.baseUrl}/credit-notes/`, payload);
  }

  async updateCreditNote(
    id: string,
    data: Partial<CreditNote>,
  ): Promise<CreditNote> {
    return api.patch(`${this.baseUrl}/credit-notes/${id}/`, data);
  }

  async deleteCreditNote(id: string): Promise<void> {
    return api.delete(`${this.baseUrl}/credit-notes/${id}/`);
  }

  async issueCreditNote(id: string): Promise<CreditNote> {
    return api.post(`${this.baseUrl}/credit-notes/${id}/issue/`);
  }

  async settleCreditNote(
    id: string,
    refundAmount: number,
  ): Promise<CreditNote> {
    return api.post(`${this.baseUrl}/credit-notes/${id}/settle/`, {
      refund_amount: refundAmount.toString(),
    });
  }

  // =============================================================================
  // DEBIT NOTES (SUPPLIER RETURNS)
  // =============================================================================

  async getDebitNotes(
    params: ListParams = {},
  ): Promise<ApiResponse<DebitNote>> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set("page", params.page.toString());
    if (params.pageSize)
      searchParams.set("page_size", params.pageSize.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.status) searchParams.set("status", params.status);
    if (params.returnReason)
      searchParams.set("return_reason", params.returnReason);
    if (params.warehouse) searchParams.set("warehouse", params.warehouse);
    if (params.supplier) searchParams.set("supplier", params.supplier);
    if (params.ordering) searchParams.set("ordering", params.ordering);

    const url = `${this.baseUrl}/debit-notes/${searchParams.toString() ? `?${searchParams}` : ""}`;
    return api.get(url);
  }

  async getDebitNote(id: string): Promise<DebitNote> {
    return api.get(`${this.baseUrl}/debit-notes/${id}/`);
  }

  async createDebitNote(data: CreateDebitNoteData): Promise<DebitNote> {
    const payload = {
      original_purchase_order: data.originalPurchaseOrder,
      warehouse: data.warehouse,
      return_reason: data.returnReason,
      notes: data.notes,
      return_date: data.returnDate,
      items: data.items.map((item) => ({
        original_purchase_order_item: item.originalPurchaseOrderItem,
        quantity_returned: item.quantityReturned,
        condition: item.condition,
      })),
    };
    return api.post(`${this.baseUrl}/debit-notes/`, payload);
  }

  async updateDebitNote(
    id: string,
    data: Partial<DebitNote>,
  ): Promise<DebitNote> {
    return api.patch(`${this.baseUrl}/debit-notes/${id}/`, data);
  }

  async deleteDebitNote(id: string): Promise<void> {
    return api.delete(`${this.baseUrl}/debit-notes/${id}/`);
  }

  async issueDebitNote(id: string): Promise<DebitNote> {
    return api.post(`${this.baseUrl}/debit-notes/${id}/issue/`);
  }

  async acceptDebitNote(id: string): Promise<DebitNote> {
    return api.post(`${this.baseUrl}/debit-notes/${id}/accept/`);
  }

  async rejectDebitNote(id: string, notes?: string): Promise<DebitNote> {
    return api.post(`${this.baseUrl}/debit-notes/${id}/reject/`, {
      notes: notes || "",
    });
  }

  async settleDebitNote(
    id: string,
    adjustmentAmount: number,
  ): Promise<DebitNote> {
    return api.post(`${this.baseUrl}/debit-notes/${id}/settle/`, {
      adjustment_amount: adjustmentAmount.toString(),
    });
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  getReturnReasonOptions(type: "credit" | "debit") {
    if (type === "credit") {
      return [
        { value: "DEFECTIVE", label: "Defective Product" },
        { value: "WRONG_ITEM", label: "Wrong Item Delivered" },
        { value: "SIZE_ISSUE", label: "Size Issue" },
        { value: "COLOR_ISSUE", label: "Color Issue" },
        {
          value: "CUSTOMER_DISSATISFACTION",
          label: "Customer Dissatisfaction",
        },
        { value: "DAMAGE_IN_TRANSIT", label: "Damage in Transit" },
        { value: "EXPIRED", label: "Expired Product" },
        { value: "OTHER", label: "Other" },
      ];
    } else {
      return [
        { value: "DEFECTIVE_RECEIVED", label: "Defective Items Received" },
        { value: "WRONG_ITEMS", label: "Wrong Items Delivered" },
        { value: "EXCESS_STOCK", label: "Excess Stock" },
        { value: "EXPIRED", label: "Expired Products" },
        { value: "DAMAGE_IN_TRANSIT", label: "Damage in Transit" },
        { value: "QUALITY_ISSUES", label: "Quality Issues" },
        { value: "ORDER_CANCELLATION", label: "Order Cancellation" },
        { value: "OTHER", label: "Other" },
      ];
    }
  }

  getConditionOptions() {
    return [
      { value: "GOOD", label: "Good Condition" },
      { value: "DAMAGED", label: "Damaged" },
      { value: "DEFECTIVE", label: "Defective" },
      { value: "EXPIRED", label: "Expired" },
    ];
  }

  getStatusBadgeColor(status: string, type: "credit" | "debit") {
    const statusColors = {
      DRAFT: "bg-zinc-500/20 text-zinc-400",
      ISSUED: "bg-blue-500/20 text-blue-400",
      SETTLED: "bg-green-500/20 text-green-400",
      CANCELLED: "bg-red-500/20 text-red-400",
      ACCEPTED: "bg-emerald-500/20 text-emerald-400",
      REJECTED: "bg-red-500/20 text-red-400",
    };
    return (
      statusColors[status as keyof typeof statusColors] ||
      "bg-zinc-500/20 text-zinc-400"
    );
  }

  formatCurrency(amount: string | number): string {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }
}

// Export singleton instance
export const debitCreditNotesService = new DebitCreditNotesService();

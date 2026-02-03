/**
 * Credit Sales Service
 * Handles all credit sales (pay-later) related API calls
 */
import { api } from "@/lib/api";

// Types - using camelCase as API returns CamelCaseJSON
export interface CreditSale {
  id: string;
  invoiceNumber: string;
  warehouseCode: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  total: string;
  creditAmount: string;
  creditBalance: string;
  creditStatus: "NONE" | "PENDING" | "PARTIAL" | "PAID";
  daysPending: number;
  createdAt: string;
}

export interface CreditPayment {
  id: string;
  amount: string;
  method: "CASH" | "CARD" | "UPI" | "CREDIT";
  receivedBy: string;
  receivedByUsername: string;
  notes: string;
  createdAt: string;
}

export interface RecordCreditPaymentRequest {
  sale_id: string;
  amount: number;
  method: "CASH" | "CARD" | "UPI";
  notes?: string;
}

export interface RecordCreditPaymentResponse {
  success: boolean;
  paymentId: string;
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  amountPaid: string;
  previousBalance: string;
  newBalance: string;
  creditStatus: string;
  isFullyPaid: boolean;
  message: string;
}

export interface CreditPaymentHistoryResponse {
  saleId: string;
  invoiceNumber: string;
  customerName: string;
  customerMobile: string;
  originalCredit: string;
  currentBalance: string;
  creditStatus: string;
  totalPaid: string;
  payments: CreditPayment[];
}

export interface CreditSalesListParams {
  warehouse_id?: string;
  credit_status?: "PENDING" | "PARTIAL" | "PAID";
}

// API Endpoints
export const creditSalesService = {
  /**
   * Get list of credit sales with outstanding balance
   */
  getCreditSales: (params?: CreditSalesListParams) =>
    api.get<CreditSale[]>("/sales/credit/", params),

  /**
   * Record a payment against a credit sale
   */
  recordPayment: (data: RecordCreditPaymentRequest) =>
    api.post<RecordCreditPaymentResponse>("/sales/credit/pay/", data),

  /**
   * Get payment history for a specific credit sale
   */
  getPaymentHistory: (saleId: string) =>
    api.get<CreditPaymentHistoryResponse>("/sales/credit/history/", {
      sale_id: saleId,
    }),

  /**
   * Get payment method options
   */
  getPaymentMethodOptions: () => [
    { value: "CASH", label: "Cash" },
    { value: "UPI", label: "UPI" },
    { value: "CARD", label: "Card" },
  ],

  /**
   * Get credit status badge info
   */
  getCreditStatusInfo: (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Pending",
          color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "PARTIAL":
        return {
          label: "Partial",
          color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        };
      case "PAID":
        return {
          label: "Paid",
          color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        };
      default:
        return {
          label: "Unknown",
          color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        };
    }
  },
};

export default creditSalesService;

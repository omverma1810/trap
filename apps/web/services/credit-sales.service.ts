/**
 * Credit Sales Service
 * Handles all credit sales (pay-later) related API calls
 */
import { api } from "@/lib/api";

// Types
export interface CreditSale {
  id: string;
  invoice_number: string;
  warehouse_code: string;
  customer_name: string;
  customer_mobile: string;
  customer_email: string;
  total: string;
  credit_amount: string;
  credit_balance: string;
  credit_status: "NONE" | "PENDING" | "PARTIAL" | "PAID";
  days_pending: number;
  created_at: string;
}

export interface CreditPayment {
  id: string;
  amount: string;
  method: "CASH" | "CARD" | "UPI" | "CREDIT";
  received_by: string;
  received_by_username: string;
  notes: string;
  created_at: string;
}

export interface RecordCreditPaymentRequest {
  sale_id: string;
  amount: number;
  method: "CASH" | "CARD" | "UPI";
  notes?: string;
}

export interface RecordCreditPaymentResponse {
  success: boolean;
  payment_id: string;
  sale_id: string;
  invoice_number: string;
  customer_name: string;
  amount_paid: string;
  previous_balance: string;
  new_balance: string;
  credit_status: string;
  is_fully_paid: boolean;
  message: string;
}

export interface CreditPaymentHistoryResponse {
  sale_id: string;
  invoice_number: string;
  customer_name: string;
  customer_mobile: string;
  original_credit: string;
  current_balance: string;
  credit_status: string;
  total_paid: string;
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

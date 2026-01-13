/**
 * Invoice Hooks
 * React Query hooks for invoice data
 */
import { useQuery } from "@tanstack/react-query";
import { invoicesService, InvoiceListParams } from "@/services";

export const invoiceKeys = {
  all: ["invoices"] as const,
  list: (params?: InvoiceListParams) => [...invoiceKeys.all, "list", params] as const,
  detail: (id: number) => [...invoiceKeys.all, "detail", id] as const,
  summary: (params?: { period?: string }) => [...invoiceKeys.all, "summary", params] as const,
};

export function useInvoices(params?: InvoiceListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => invoicesService.getInvoices(params),
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoicesService.getInvoice(id),
    enabled: !!id,
  });
}

export function useInvoiceSummary(params?: { period?: string }) {
  return useQuery({
    queryKey: invoiceKeys.summary(params),
    queryFn: () => invoicesService.getInvoiceSummary(params),
  });
}

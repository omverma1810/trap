/**
 * POS/Sales Hooks
 * React Query hooks for POS operations
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService, CheckoutRequest } from "@/services";

export const salesKeys = {
  all: ["sales"] as const,
  list: (params?: any) => [...salesKeys.all, "list", params] as const,
  detail: (id: number) => [...salesKeys.all, "detail", id] as const,
  scan: (barcode: string) => [...salesKeys.all, "scan", barcode] as const,
};

export function useScanBarcode(barcode: string) {
  return useQuery({
    queryKey: salesKeys.scan(barcode),
    queryFn: () => salesService.scanBarcode(barcode),
    enabled: !!barcode && barcode.length > 0,
    retry: false,
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CheckoutRequest) => salesService.checkout(data),
    onSuccess: () => {
      // Invalidate relevant queries after checkout
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useSales(params?: any) {
  return useQuery({
    queryKey: salesKeys.list(params),
    queryFn: () => salesService.getSales(params),
  });
}

export function useSale(id: number) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => salesService.getSale(id),
    enabled: !!id,
  });
}

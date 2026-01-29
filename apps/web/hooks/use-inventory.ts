/**
 * Inventory Hooks
 * React Query hooks for inventory data
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService, ProductListParams } from "@/services";

export const inventoryKeys = {
  all: ["inventory"] as const,
  products: () => [...inventoryKeys.all, "products"] as const,
  productList: (params?: ProductListParams) =>
    [...inventoryKeys.products(), params] as const,
  product: (id: string) => [...inventoryKeys.products(), id] as const,
  warehouses: () => [...inventoryKeys.all, "warehouses"] as const,
  summary: () => [...inventoryKeys.all, "summary"] as const,
  posProducts: (params?: {
    warehouse_id?: string;
    search?: string;
    category?: string;
    in_stock_only?: boolean;
  }) => [...inventoryKeys.all, "pos-products", params] as const,
};

export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: inventoryKeys.productList(params),
    queryFn: () => inventoryService.getProducts(params),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: inventoryKeys.product(id),
    queryFn: () => inventoryService.getProduct(id),
    enabled: !!id,
  });
}

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: () => inventoryService.getWarehouses(),
  });
}

export function useStockSummary() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: () => inventoryService.getStockSummary(),
  });
}

export function usePOSProducts(params?: {
  warehouse_id?: string;
  store_id?: string;
  search?: string;
  category?: string;
  in_stock_only?: boolean;
}) {
  return useQuery({
    queryKey: inventoryKeys.posProducts(params),
    queryFn: () => inventoryService.getPOSProducts(params),
    // Refetch frequently for real-time stock updates in POS
    refetchInterval: 30000, // 30 seconds
  });
}

/**
 * Mutation to deactivate (soft delete) a product
 */
export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) =>
      inventoryService.deleteProduct(productId),
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.summary() });
    },
  });
}

/**
 * Inventory Hooks
 * React Query hooks for inventory data
 */
import { useQuery } from "@tanstack/react-query";
import { inventoryService, ProductListParams } from "@/services";

export const inventoryKeys = {
  all: ["inventory"] as const,
  products: () => [...inventoryKeys.all, "products"] as const,
  productList: (params?: ProductListParams) =>
    [...inventoryKeys.products(), params] as const,
  product: (id: number) => [...inventoryKeys.products(), id] as const,
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

export function useProduct(id: number) {
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

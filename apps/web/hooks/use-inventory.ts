/**
 * Inventory Hooks
 * React Query hooks for inventory data
 */
import { useQuery } from "@tanstack/react-query";
import { inventoryService, ProductListParams } from "@/services";

export const inventoryKeys = {
  all: ["inventory"] as const,
  products: () => [...inventoryKeys.all, "products"] as const,
  productList: (params?: ProductListParams) => [...inventoryKeys.products(), params] as const,
  product: (id: number) => [...inventoryKeys.products(), id] as const,
  warehouses: () => [...inventoryKeys.all, "warehouses"] as const,
  summary: () => [...inventoryKeys.all, "summary"] as const,
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

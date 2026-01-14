"use client";

import * as React from "react";
import { Plus, Upload, Package } from "lucide-react";
import { PageTransition } from "@/components/layout";
import { FilterBar, InventoryList, ProductDrawer, StockFilter, SortOption } from "@/components/inventory";
import { EmptyState, emptyStates } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useProducts, useStockSummary } from "@/hooks";

// Types matching API
interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  costPrice?: number;
  sellingPrice: number;
  stock: {
    total: number;
    byWarehouse: { warehouseId: string; warehouseName: string; quantity: number }[];
  };
  reorderThreshold?: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

// Transform API response to component format
function transformProduct(apiProduct: any): InventoryProduct {
  const totalStock = apiProduct.total_stock || 0;
  const threshold = apiProduct.reorder_threshold || 10;
  
  let status: "in_stock" | "low_stock" | "out_of_stock" = "in_stock";
  if (totalStock === 0) status = "out_of_stock";
  else if (totalStock <= threshold) status = "low_stock";
  
  return {
    id: apiProduct.id,
    name: apiProduct.product_name || apiProduct.name || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || '',
    category: apiProduct.category || '',
    brand: apiProduct.brand || '',
    costPrice: parseFloat(apiProduct.cost_price) || 0,
    sellingPrice: parseFloat(apiProduct.selling_price) || 0,
    stock: {
      total: totalStock,
      byWarehouse: apiProduct.stock_by_warehouse || [],
    },
    reorderThreshold: threshold,
    status,
  };
}

export default function InventoryPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState<SortOption>("name");

  // Drawer state
  const [selectedProduct, setSelectedProduct] = React.useState<InventoryProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // API hooks
  const { data: productsResponse, isLoading: productsLoading, isError: productsError, refetch } = useProducts({
    search: searchQuery || undefined,
    stock_status: stockFilter !== "all" ? stockFilter : undefined,
    category: categoryFilter || undefined,
    warehouse: warehouseFilter || undefined,
  });
  
  const { data: stockSummary } = useStockSummary();

  // Transform products
  const products: InventoryProduct[] = React.useMemo(() => {
    if (!productsResponse?.results) return [];
    return productsResponse.results.map(transformProduct);
  }, [productsResponse]);

  // Filter check
  const hasActiveFilters = searchQuery !== "" || stockFilter !== "all" || categoryFilter !== "" || warehouseFilter !== "";

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
    setCategoryFilter("");
    setWarehouseFilter("");
    setSortBy("name");
  };

  // Sort products
  const sortedProducts = React.useMemo(() => {
    const result = [...products];
    result.sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "stock": return b.stock.total - a.stock.total;
        case "price": return b.sellingPrice - a.sellingPrice;
        default: return 0;
      }
    });
    return result;
  }, [products, sortBy]);

  // Handlers
  const handleProductClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Loading state
  if (productsLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#F5F6FA]">Inventory</h1>
              <p className="text-sm text-[#6F7285] mt-1">Loading products...</p>
            </div>
          </div>
          <SkeletonTable rows={6} />
        </div>
      </PageTransition>
    );
  }

  // Error state
  if (productsError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Inventory</h1>
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <ErrorState 
              message="Could not load inventory. Check if backend is running."
              onRetry={() => refetch()}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Stock summary
  const summary = stockSummary || { total_products: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Inventory</h1>
            <p className="text-sm text-[#6F7285] mt-1">
              {products.length} of {summary.total_products || products.length} products
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors">
              <Upload className="w-4 h-4 stroke-[1.5]" />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors">
              <Plus className="w-4 h-4 stroke-[2]" />
              Add Product
            </button>
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StockCard label="Total Products" value={summary.total_products || products.length} />
          <StockCard label="In Stock" value={summary.in_stock || 0} color="#2ECC71" />
          <StockCard label="Low Stock" value={summary.low_stock || 0} color="#F5A623" />
          <StockCard label="Out of Stock" value={summary.out_of_stock || 0} color="#E74C3C" />
        </div>

        {/* Filter Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stockFilter={stockFilter}
          onStockFilterChange={setStockFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          warehouseFilter={warehouseFilter}
          onWarehouseChange={setWarehouseFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Product List or Empty State */}
        {products.length === 0 ? (
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <EmptyState
              icon={Package}
              title={emptyStates.inventory.title}
              description={emptyStates.inventory.description}
              actions={[
                { label: "Add Product", href: "#", variant: "primary" },
                { label: "Import Inventory", href: "#", variant: "secondary" },
              ]}
            />
          </div>
        ) : (
          <InventoryList
            products={sortedProducts}
            onProductClick={handleProductClick}
          />
        )}

        {/* Product Drawer */}
        <ProductDrawer
          product={selectedProduct}
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
        />
      </div>
    </PageTransition>
  );
}

function StockCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="p-4 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08]">
      <p className="text-xs text-[#6F7285] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: color || "#F5F6FA" }}>
        {value}
      </p>
    </div>
  );
}

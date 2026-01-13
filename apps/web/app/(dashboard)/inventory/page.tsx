"use client";

import * as React from "react";
import { Plus, Upload } from "lucide-react";
import { PageTransition } from "@/components/layout";
import { FilterBar, InventoryList, ProductDrawer, StockFilter, SortOption } from "@/components/inventory";
import { inventoryProducts, InventoryProduct } from "@/lib/data/inventory";

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

  // Check if any filters are active
  const hasActiveFilters = searchQuery !== "" || stockFilter !== "all" || categoryFilter !== "" || warehouseFilter !== "";

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
    setCategoryFilter("");
    setWarehouseFilter("");
    setSortBy("name");
  };

  // Filter and sort products
  const filteredProducts = React.useMemo(() => {
    let result = [...inventoryProducts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      );
    }

    // Stock status filter
    if (stockFilter !== "all") {
      result = result.filter((p) => p.status === stockFilter);
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Warehouse filter (has stock in warehouse)
    if (warehouseFilter) {
      result = result.filter((p) =>
        p.stock.byWarehouse.some(
          (wh) => wh.warehouseId === warehouseFilter && wh.quantity > 0
        )
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "stock":
          return b.stock.total - a.stock.total;
        case "price":
          return b.sellingPrice - a.sellingPrice;
        default:
          return 0;
      }
    });

    return result;
  }, [searchQuery, stockFilter, categoryFilter, warehouseFilter, sortBy]);

  // Open product drawer
  const handleProductClick = (product: InventoryProduct) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  // Close product drawer
  const handleDrawerClose = () => {
    setDrawerOpen(false);
    // Delay clearing product to allow exit animation
    setTimeout(() => setSelectedProduct(null), 300);
  };

  // Stock summary
  const stockSummary = React.useMemo(() => {
    const inStock = inventoryProducts.filter((p) => p.status === "in_stock").length;
    const lowStock = inventoryProducts.filter((p) => p.status === "low_stock").length;
    const outOfStock = inventoryProducts.filter((p) => p.status === "out_of_stock").length;
    return { inStock, lowStock, outOfStock, total: inventoryProducts.length };
  }, []);

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Inventory</h1>
            <p className="text-sm text-[#6F7285] mt-1">
              {filteredProducts.length} of {stockSummary.total} products
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
          <StockCard label="Total Products" value={stockSummary.total} />
          <StockCard label="In Stock" value={stockSummary.inStock} color="#2ECC71" />
          <StockCard label="Low Stock" value={stockSummary.lowStock} color="#F5A623" />
          <StockCard label="Out of Stock" value={stockSummary.outOfStock} color="#E74C3C" />
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

        {/* Inventory List */}
        <InventoryList
          products={filteredProducts}
          onProductClick={handleProductClick}
        />

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
      <p
        className="text-2xl font-bold tabular-nums mt-1"
        style={{ color: color || "#F5F6FA" }}
      >
        {value}
      </p>
    </div>
  );
}

"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Upload, Download, Package } from "lucide-react";
import { PageTransition } from "@/components/layout";
import {
  FilterBar,
  InventoryList,
  ProductDrawer,
  AddProductModal,
  ImportModal,
  StockFilter,
  SortOption,
} from "@/components/inventory";
import { EmptyState, emptyStates } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Tooltip } from "@/components/ui/tooltip";
import { useProducts, useStockSummary } from "@/hooks";
import { useAuth } from "@/lib/auth";
import { ProductListParams } from "@/services";

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
  isDeleted?: boolean;
  stock: {
    total: number;
    byWarehouse: {
      warehouseId: string;
      warehouseName: string;
      quantity: number;
    }[];
  };
  reorderThreshold?: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

function mapStockStatus(
  apiStatus: string
): "in_stock" | "low_stock" | "out_of_stock" {
  switch (apiStatus) {
    case "IN_STOCK":
      return "in_stock";
    case "LOW_STOCK":
      return "low_stock";
    case "OUT_OF_STOCK":
      return "out_of_stock";
    default:
      return "in_stock";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(apiProduct: any): InventoryProduct {
  return {
    id: String(apiProduct.id),
    name: apiProduct.name || apiProduct.productName || "",
    sku: apiProduct.sku || "",
    barcode: apiProduct.barcode || apiProduct.barcodeValue || "",
    category: apiProduct.category || "",
    brand: apiProduct.brand || "",
    costPrice: apiProduct.costPrice || apiProduct.pricing?.costPrice || 0,
    sellingPrice: apiProduct.sellingPrice || apiProduct.pricing?.sellingPrice || 0,
    isDeleted: apiProduct.isDeleted || false,
    stock: {
      total: apiProduct.stock || apiProduct.totalStock || 0,
      byWarehouse: apiProduct.warehouseStock || [],
    },
    reorderThreshold: apiProduct.reorderThreshold || 10,
    status: mapStockStatus(apiProduct.stockStatus || "IN_STOCK"),
  };
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryPageSkeleton />}>
      <InventoryPageContent />
    </Suspense>
  );
}

function InventoryPageSkeleton() {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Products</h1>
            <p className="text-sm text-[#6F7285] mt-1">Loading products...</p>
          </div>
        </div>
        <SkeletonTable rows={6} />
      </div>
    </PageTransition>
  );
}

function InventoryPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stockFilter, setStockFilter] = React.useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = React.useState("");
  const [warehouseFilter, setWarehouseFilter] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<
    "" | "MENS" | "WOMENS" | "UNISEX" | "KIDS"
  >("");
  const [brandFilter, setBrandFilter] = React.useState("");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [showDeleted, setShowDeleted] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>("name");

  // Drawer state
  const [selectedProduct, setSelectedProduct] =
    React.useState<InventoryProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Modal state
  const [addProductOpen, setAddProductOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  // Handle query param for opening Add Product modal
  React.useEffect(() => {
    if (searchParams.get("openAddProduct") === "true") {
      setAddProductOpen(true);
      window.history.replaceState({}, "", "/inventory");
    }
  }, [searchParams]);

  // API hooks
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch,
  } = useProducts({
    search: searchQuery || undefined,
    stock_status: stockFilter !== "all" ? stockFilter : undefined,
    category: categoryFilter || undefined,
    warehouse: warehouseFilter || undefined,
    gender: genderFilter || undefined,
    brand: brandFilter || undefined,
    price_min: priceMin ? parseFloat(priceMin) : undefined,
    price_max: priceMax ? parseFloat(priceMax) : undefined,
    is_deleted: showDeleted && isAdmin ? true : undefined,
  } as ProductListParams);

  const { data: stockSummary } = useStockSummary();

  // Transform products
  const products: InventoryProduct[] = React.useMemo(() => {
    if (!productsResponse?.results) return [];
    return productsResponse.results.map(transformProduct);
  }, [productsResponse]);

  // Filter check
  const hasActiveFilters =
    searchQuery !== "" ||
    stockFilter !== "all" ||
    categoryFilter !== "" ||
    warehouseFilter !== "" ||
    genderFilter !== "" ||
    brandFilter !== "" ||
    priceMin !== "" ||
    priceMax !== "" ||
    showDeleted;

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setStockFilter("all");
    setCategoryFilter("");
    setWarehouseFilter("");
    setGenderFilter("");
    setBrandFilter("");
    setPriceMin("");
    setPriceMax("");
    setShowDeleted(false);
    setSortBy("name");
  };

  // Sort products
  const sortedProducts = React.useMemo(() => {
    const result = [...products];
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

  const handleProductAdded = () => {
    refetch();
  };

  // Loading state
  if (productsLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#F5F6FA]">Products</h1>
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
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Products</h1>
          <div className="rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]">
            <ErrorState
              message="Could not load products. Check if backend is running."
              onRetry={() => refetch()}
            />
          </div>
        </div>
      </PageTransition>
    );
  }

  // Stock summary
  const summary = stockSummary || {
    total_products: 0,
    in_stock: 0,
    low_stock: 0,
    out_of_stock: 0,
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#F5F6FA]">Products</h1>
            <p className="text-sm text-[#6F7285] mt-1">
              {products.length} of {summary.total_products || products.length}{" "}
              products
              {showDeleted && " (including deleted)"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Export - Disabled */}
            <Tooltip content="Export available after data sync">
              <button
                disabled
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[#6F7285] text-sm cursor-not-allowed opacity-50"
              >
                <Download className="w-4 h-4 stroke-[1.5]" />
                Export
              </button>
            </Tooltip>

            {/* Import - Admin only */}
            {isAdmin && (
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm hover:bg-white/[0.08] transition-colors"
              >
                <Upload className="w-4 h-4 stroke-[1.5]" />
                Import
              </button>
            )}

            {/* Add Product - Admin only */}
            {isAdmin && (
              <button
                onClick={() => setAddProductOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                Add Product
              </button>
            )}
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StockCard
            label="Total Products"
            value={summary.total_products || products.length}
          />
          <StockCard
            label="In Stock"
            value={summary.in_stock || 0}
            color="#2ECC71"
          />
          <StockCard
            label="Low Stock"
            value={summary.low_stock || 0}
            color="#F5A623"
          />
          <StockCard
            label="Out of Stock"
            value={summary.out_of_stock || 0}
            color="#E74C3C"
          />
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
          genderFilter={genderFilter}
          onGenderChange={setGenderFilter}
          brandFilter={brandFilter}
          onBrandChange={setBrandFilter}
          priceMin={priceMin}
          onPriceMinChange={setPriceMin}
          priceMax={priceMax}
          onPriceMaxChange={setPriceMax}
          showDeleted={showDeleted}
          onShowDeletedChange={setShowDeleted}
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
              actions={
                isAdmin
                  ? [
                      {
                        label: "Add Product",
                        onClick: () => setAddProductOpen(true),
                        variant: "primary",
                      },
                      {
                        label: "Import Products",
                        onClick: () => setImportOpen(true),
                        variant: "secondary",
                      },
                    ]
                  : []
              }
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
          onDeleted={handleProductAdded}
        />

        {/* Add Product Modal */}
        <AddProductModal
          isOpen={addProductOpen}
          onClose={() => setAddProductOpen(false)}
          onSuccess={handleProductAdded}
        />

        {/* Import Modal */}
        <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
      </div>
    </PageTransition>
  );
}

function StockCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
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

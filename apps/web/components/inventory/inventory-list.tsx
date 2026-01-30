"use client";

import * as React from "react";
import { Package, ChevronRight, Barcode, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

// Local helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStockColor(status: string): string {
  switch (status) {
    case "in_stock":
      return "#2ECC71";
    case "low_stock":
      return "#F5A623";
    case "out_of_stock":
      return "#E74C3C";
    default:
      return "#6F7285";
  }
}

function getStockLabel(status: string): string {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return status;
  }
}

function formatDaysInInventory(days: number | null | undefined): string {
  if (days === null || days === undefined) {
    return "-";
  }
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
}

// Product type - Phase 10B enhanced
interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  sellingPrice: number;
  barcode?: string;
  brand?: string;
  costPrice?: number;
  reorderThreshold?: number;
  isDeleted?: boolean;
  daysInInventory?: number | null;
  firstPurchaseDate?: string | null;
  stock: {
    total: number;
    byWarehouse: {
      warehouseId: string;
      warehouseName: string;
      quantity: number;
    }[];
  };
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface InventoryListProps {
  products: InventoryProduct[];
  onProductClick: (product: InventoryProduct) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function InventoryList({
  products,
  onProductClick,
  selectedIds = new Set(),
  onSelectionChange,
}: InventoryListProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  const handleCheckboxClick = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    onSelectionChange(newSelection);
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.05] mb-4">
          <Package className="w-8 h-8 text-[#6F7285] stroke-[1.5]" />
        </div>
        <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">
          No products found
        </h3>
        <p className="text-sm text-[#A1A4B3]">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      <div className="max-h-[600px] overflow-auto">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[40px_1fr_120px_100px_100px_80px_90px_100px_90px_40px] gap-4 px-4 py-3 bg-[#1A1B23] border-b border-white/[0.08] text-xs font-medium text-[#6F7285] uppercase tracking-wide sticky top-0 z-10 backdrop-blur-xl">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              disabled
              className="w-4 h-4 rounded border-2 border-white/[0.15] bg-transparent cursor-not-allowed opacity-50"
              title="Select all (coming soon)"
            />
          </div>
          <span>Product</span>
          <span>SKU</span>
          <span>Brand</span>
          <span>Category</span>
          <span>Stock</span>
          <span>Age</span>
          <span>Status</span>
          <span className="text-right">Price</span>
          <span></span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/[0.06]">
          {products.map((product, index) => {
            const isHovered = hoveredId === product.id;
            const isSelected = selectedIds.has(product.id);
            const isDeleted = product.isDeleted;

            return (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5) }}
                onClick={() => onProductClick(product)}
                onMouseEnter={() => setHoveredId(product.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`
                  w-full grid grid-cols-1 md:grid-cols-[40px_1fr_120px_100px_100px_80px_90px_100px_90px_40px] gap-2 md:gap-4 px-4 py-4 text-left cursor-pointer
                  transition-all duration-150 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6A15B]
                  ${isDeleted ? "opacity-50" : ""}
                  ${
                    isHovered || isSelected
                      ? "bg-white/[0.04]"
                      : "hover:bg-white/[0.03]"
                  }
                  ${isSelected ? "bg-[#C6A15B]/5" : ""}
                `}
              >
                {/* Checkbox */}
                <div
                  className="hidden md:flex items-center justify-center"
                  onClick={(e) => handleCheckboxClick(e, product.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-2 border-white/[0.2] bg-transparent checked:bg-[#C6A15B] checked:border-[#C6A15B] cursor-pointer transition-colors focus:ring-2 focus:ring-[#C6A15B]/50"
                  />
                </div>

                {/* Product Name with Image Placeholder */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <Package className="w-5 h-5 text-[#6F7285] stroke-[1.5]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#F5F6FA] truncate">
                        {product.name}
                      </span>
                      {isDeleted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#E74C3C]/20 text-[#E74C3C] flex items-center gap-1">
                          <Trash2 className="w-2.5 h-2.5" />
                          Deleted
                        </span>
                      )}
                    </div>
                    {product.barcode && isHovered && (
                      <span className="flex items-center gap-1 text-xs text-[#6F7285]">
                        <Barcode className="w-3 h-3" />
                        {product.barcode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Row */}
                <div className="md:hidden flex items-center justify-between px-1 text-xs text-[#A1A4B3]">
                  <span className="font-mono">{product.sku}</span>
                  <span>{product.category}</span>
                  <StockBadge status={product.status} />
                </div>

                {/* SKU */}
                <span className="hidden md:block text-sm text-[#A1A4B3] self-center font-mono truncate">
                  {product.sku}
                </span>

                {/* Brand */}
                <span className="hidden md:block text-sm text-[#A1A4B3] self-center truncate">
                  {product.brand || "-"}
                </span>

                {/* Category */}
                <span className="hidden md:block text-sm text-[#A1A4B3] self-center truncate">
                  {product.category}
                </span>

                {/* Stock */}
                <span className="hidden md:block text-sm text-[#F5F6FA] self-center tabular-nums">
                  {product.stock.total}
                </span>

                {/* Days in Inventory (Age) */}
                <span
                  className="hidden md:block text-sm text-[#A1A4B3] self-center"
                  title={
                    product.firstPurchaseDate
                      ? `Since ${product.firstPurchaseDate}`
                      : "No purchase order"
                  }
                >
                  {formatDaysInInventory(product.daysInInventory)}
                </span>

                {/* Status */}
                <div className="hidden md:flex items-center self-center">
                  <StockBadge status={product.status} />
                </div>

                {/* Price */}
                <span className="hidden md:block text-sm font-medium text-[#C6A15B] self-center text-right tabular-nums">
                  {formatCurrency(product.sellingPrice)}
                </span>

                {/* Chevron */}
                <div className="hidden md:flex items-center justify-end self-center">
                  <ChevronRight
                    className={`w-4 h-4 text-[#6F7285] transition-opacity duration-150 ${
                      isHovered ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>

                {/* Mobile Price */}
                <div className="md:hidden flex items-center justify-between px-1">
                  <span className="text-xs text-[#6F7285]">
                    Stock: {product.stock.total}
                  </span>
                  <span className="text-sm font-semibold text-[#C6A15B] tabular-nums">
                    {formatCurrency(product.sellingPrice)}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StockBadge({ status }: { status: string }) {
  const color = getStockColor(status);
  const label = getStockLabel(status);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
      style={{
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

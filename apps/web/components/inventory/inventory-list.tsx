"use client";

import * as React from "react";
import { Package, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { InventoryProduct, formatCurrency, getStockColor, getStockLabel } from "@/lib/data/inventory";

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
  // Track hover state for chevron visibility
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Handle checkbox click (visual only for now)
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
        <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">No products found</h3>
        <p className="text-sm text-[#A1A4B3]">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
      {/* Scrollable container for sticky header */}
      <div className="max-h-[600px] overflow-auto">
        {/* Table Header - Sticky */}
        <div className="hidden md:grid grid-cols-[40px_1fr_100px_120px_80px_100px_90px_40px] gap-4 px-4 py-3 bg-[#1A1B23] border-b border-white/[0.08] text-xs font-medium text-[#6F7285] uppercase tracking-wide sticky top-0 z-10 backdrop-blur-xl">
          {/* Checkbox Header */}
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
          <span>Category</span>
          <span>Stock</span>
          <span>Status</span>
          <span className="text-right">Price</span>
          <span></span>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-white/[0.06]">
          {products.map((product, index) => {
            const isHovered = hoveredId === product.id;
            const isSelected = selectedIds.has(product.id);

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
                  w-full grid grid-cols-1 md:grid-cols-[40px_1fr_100px_120px_80px_100px_90px_40px] gap-2 md:gap-4 px-4 py-4 text-left cursor-pointer
                  transition-all duration-150 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C6A15B]
                  ${isHovered || isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"}
                  ${isSelected ? "bg-[#C6A15B]/5" : ""}
                `}
              >
                {/* Checkbox Column - Desktop */}
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

                {/* Product Name */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-[#6F7285] stroke-[1.5]" />
                  </div>
                  <span className="text-sm font-medium text-[#F5F6FA] truncate">
                    {product.name}
                  </span>
                </div>

                {/* Mobile: Row 2 */}
                <div className="md:hidden flex items-center justify-between px-1 text-xs text-[#A1A4B3]">
                  <span>{product.sku}</span>
                  <span>{product.category}</span>
                  <StockBadge status={product.status} />
                </div>

                {/* Desktop columns */}
                <span className="hidden md:block text-sm text-[#A1A4B3] self-center">
                  {product.sku}
                </span>
                <span className="hidden md:block text-sm text-[#A1A4B3] self-center">
                  {product.category}
                </span>
                <span className="hidden md:block text-sm text-[#F5F6FA] self-center tabular-nums">
                  {product.stock.total}
                </span>
                <div className="hidden md:flex items-center self-center">
                  <StockBadge status={product.status} />
                </div>
                <span className="hidden md:block text-sm font-medium text-[#C6A15B] self-center text-right tabular-nums">
                  {formatCurrency(product.sellingPrice)}
                </span>
                
                {/* Chevron - Appears on hover/focus */}
                <div className="hidden md:flex items-center justify-end self-center">
                  <ChevronRight 
                    className={`w-4 h-4 text-[#6F7285] transition-opacity duration-150 ${
                      isHovered ? "opacity-100" : "opacity-0"
                    }`} 
                  />
                </div>

                {/* Mobile: Price */}
                <div className="md:hidden flex items-center justify-between px-1">
                  <span className="text-xs text-[#6F7285]">Stock: {product.stock.total}</span>
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

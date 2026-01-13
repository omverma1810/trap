"use client";

import * as React from "react";
import { Package, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { InventoryProduct, formatCurrency, getStockColor, getStockLabel } from "@/lib/data/inventory";

interface InventoryListProps {
  products: InventoryProduct[];
  onProductClick: (product: InventoryProduct) => void;
}

export function InventoryList({ products, onProductClick }: InventoryListProps) {
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
      {/* Table Header */}
      <div className="hidden md:grid grid-cols-[1fr_100px_120px_100px_100px_100px_40px] gap-4 px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] text-xs font-medium text-[#6F7285] uppercase tracking-wide">
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
        {products.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.5) }}
            onClick={() => onProductClick(product)}
            className="w-full grid grid-cols-1 md:grid-cols-[1fr_100px_120px_100px_100px_100px_40px] gap-2 md:gap-4 px-4 py-4 text-left hover:bg-white/[0.03] transition-colors focus:outline-none focus:bg-white/[0.05]"
          >
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
            <ChevronRight className="hidden md:block w-4 h-4 text-[#6F7285] self-center justify-self-end" />

            {/* Mobile: Price */}
            <div className="md:hidden flex items-center justify-between px-1">
              <span className="text-xs text-[#6F7285]">Stock: {product.stock.total}</span>
              <span className="text-sm font-semibold text-[#C6A15B] tabular-nums">
                {formatCurrency(product.sellingPrice)}
              </span>
            </div>
          </motion.button>
        ))}
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

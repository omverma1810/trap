"use client";

import * as React from "react";
import { X, Package, MapPin, Tag, Barcode } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    case "in_stock": return "#2ECC71";
    case "low_stock": return "#F5A623";
    case "out_of_stock": return "#E74C3C";
    default: return "#6F7285";
  }
}

function getStockLabel(status: string): string {
  switch (status) {
    case "in_stock": return "In Stock";
    case "low_stock": return "Low Stock";
    case "out_of_stock": return "Out of Stock";
    default: return status;
  }
}

// Product type
interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  barcode?: string;
  brand?: string;
  costPrice?: number;
  sellingPrice: number;
  reorderThreshold?: number;
  stock: {
    total: number;
    byWarehouse: { warehouseId: string; warehouseName: string; quantity: number }[];
  };
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface ProductDrawerProps {
  product: InventoryProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!product) return null;

  const statusColor = getStockColor(product.status);
  const statusLabel = getStockLabel(product.status);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 right-0 z-50 w-full max-w-md h-full bg-[#1A1B23] border-l border-white/[0.08] shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-[#F5F6FA]">Product Details</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5 text-[#A1A4B3]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Product Image Placeholder */}
                <div className="aspect-square max-w-[200px] mx-auto rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Package className="w-16 h-16 text-[#6F7285] stroke-[1]" />
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">{product.name}</h3>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium"
                      style={{ backgroundColor: `${statusColor}15`, color: statusColor }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
                      {statusLabel}
                    </span>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Barcode} label="SKU" value={product.sku} />
                    <InfoCard icon={Tag} label="Category" value={product.category} />
                  </div>
                </div>

                {/* Stock by Warehouse */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                    Stock by Warehouse
                  </h4>
                  <div className="space-y-2">
                    {product.stock.byWarehouse && product.stock.byWarehouse.length > 0 ? (
                      product.stock.byWarehouse.map((wh) => (
                        <div
                          key={wh.warehouseId}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#6F7285]" />
                            <span className="text-sm text-[#F5F6FA]">{wh.warehouseName}</span>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${
                            wh.quantity === 0 ? "text-[#E74C3C]" : wh.quantity <= 5 ? "text-[#F5A623]" : "text-[#F5F6FA]"
                          }`}>
                            {wh.quantity} units
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#6F7285]">No warehouse data</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/20">
                    <span className="text-sm font-medium text-[#C6A15B]">Total Stock</span>
                    <span className="text-lg font-bold text-[#C6A15B] tabular-nums">
                      {product.stock.total} units
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                    Pricing
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-[#6F7285] mb-1">Cost Price</p>
                      <p className="text-lg font-semibold text-[#F5F6FA] tabular-nums">
                        {formatCurrency(product.costPrice || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-[#6F7285] mb-1">Selling Price</p>
                      <p className="text-lg font-semibold text-[#C6A15B] tabular-nums">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#2ECC71]/10 border border-[#2ECC71]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#2ECC71]">Profit Margin</span>
                      <span className="text-sm font-semibold text-[#2ECC71] tabular-nums">
                        {product.sellingPrice > 0 ? Math.round(((product.sellingPrice - (product.costPrice || 0)) / product.sellingPrice) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/[0.08]">
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#6F7285]" />
        <span className="text-xs text-[#6F7285]">{label}</span>
      </div>
      <p className="text-sm font-medium text-[#F5F6FA]">{value}</p>
    </div>
  );
}

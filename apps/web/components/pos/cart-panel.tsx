"use client";

import * as React from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Percent,
  ChevronDown,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, CartItem, DiscountPreset } from "./cart-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Local format helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// API response type
interface POSDiscountOptions {
  discountEnabled: boolean;
  maxDiscountPercent: string;
  availableDiscounts: DiscountPreset[];
}

export function CartPanel() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    discount,
    appliedDiscount,
    applyDiscount,
    totalGst,
    total,
    itemCount,
  } = useCart();

  const [showDiscountMenu, setShowDiscountMenu] = React.useState(false);

  // Fetch available discounts from API
  const { data: discountOptions } = useQuery<POSDiscountOptions>({
    queryKey: ["pos-discount-options"],
    queryFn: () =>
      api.get<POSDiscountOptions>("/invoices/settings/pos-discounts/"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSelectDiscount = (preset: DiscountPreset) => {
    applyDiscount(preset);
    setShowDiscountMenu(false);
  };

  const handleClearDiscount = () => {
    applyDiscount(null);
    setShowDiscountMenu(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1B23]/40">
      {/* Cart Header */}
      <div className="p-4 border-b border-white/[0.08]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F5F6FA]">Cart</h2>
          <span className="px-2.5 py-1 rounded-full bg-[#C6A15B]/10 text-[#C6A15B] text-xs font-medium tabular-nums">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-4">
                <ShoppingCart className="w-8 h-8 text-[#6F7285]" />
              </div>
              <p className="text-[#A1A4B3] text-sm">Cart is empty</p>
              <p className="text-[#6F7285] text-xs mt-1">
                Scan or select products to add
              </p>
            </motion.div>
          ) : (
            items.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                onRemove={() => removeItem(item.product.id)}
                onUpdateQuantity={(qty) => updateQuantity(item.product.id, qty)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div className="p-4 border-t border-white/[0.08] space-y-3">
        {/* Discount Selector */}
        {discountOptions?.discountEnabled !== false && (
          <div className="relative">
            {appliedDiscount ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#2ECC71]/10 border border-[#2ECC71]/30">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#2ECC71]" />
                  <span className="text-sm text-[#2ECC71]">
                    {appliedDiscount.label}
                  </span>
                </div>
                <button
                  onClick={handleClearDiscount}
                  className="p-1 rounded hover:bg-white/[0.1] transition-colors"
                >
                  <X className="w-4 h-4 text-[#2ECC71]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDiscountMenu(!showDiscountMenu)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#A1A4B3]" />
                  <span className="text-sm text-[#A1A4B3]">Add Discount</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-[#6F7285] transition-transform ${showDiscountMenu ? "rotate-180" : ""}`}
                />
              </button>
            )}

            {/* Discount Dropdown */}
            <AnimatePresence>
              {showDiscountMenu && !appliedDiscount && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-lg bg-[#1A1B23] border border-white/[0.12] shadow-lg z-10"
                >
                  <div className="text-xs text-[#6F7285] mb-2 px-2">
                    Select Discount
                  </div>
                  {(discountOptions?.availableDiscounts || []).map(
                    (preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectDiscount(preset)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#F5F6FA] hover:bg-white/[0.05] transition-colors"
                      >
                        <span
                          className={
                            preset.type === "PERCENT"
                              ? "text-[#2ECC71]"
                              : "text-[#C6A15B]"
                          }
                        >
                          {preset.type === "PERCENT" ? "%" : "₹"}
                        </span>
                        {preset.label}
                      </button>
                    ),
                  )}
                  {(!discountOptions?.availableDiscounts ||
                    discountOptions.availableDiscounts.length === 0) && (
                    <p className="text-xs text-[#6F7285] px-3 py-2">
                      No discounts available
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#A1A4B3]">Subtotal</span>
            <span className="text-[#F5F6FA] tabular-nums font-medium">
              {formatCurrency(subtotal)}
            </span>
          </div>
          {discount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-between text-sm"
            >
              <span className="text-[#2ECC71]">
                {appliedDiscount?.label || "Discount"}
              </span>
              <span className="text-[#2ECC71] tabular-nums font-medium">
                -{formatCurrency(discount)}
              </span>
            </motion.div>
          )}
          {totalGst > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A4B3]">GST</span>
              <span className="text-[#F5F6FA] tabular-nums font-medium">
                +{formatCurrency(totalGst)}
              </span>
            </div>
          )}
          <div className="h-px bg-white/[0.08]" />
          <div className="flex justify-between items-center pt-1">
            <span className="text-lg font-semibold text-[#F5F6FA]">Total</span>
            <motion.span
              key={total}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-2xl font-bold text-[#C6A15B] tabular-nums"
            >
              {formatCurrency(total)}
            </motion.span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Item Row Component
function CartItemRow({
  item,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
}) {
  // Build variant label (size / color)
  const variantParts: string[] = [];
  if (item.product.size) variantParts.push(item.product.size);
  if (item.product.color) variantParts.push(item.product.color);
  const variantLabel = variantParts.join(" / ");

  // Use productName if available, otherwise fall back to name
  const displayName = item.product.productName || item.product.name;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20, height: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
    >
      <div className="flex items-center gap-3">
        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F5F6FA] truncate">
            {displayName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {variantLabel && (
              <span className="px-1.5 py-0.5 rounded bg-[#C6A15B]/10 text-[#C6A15B] text-[10px] font-medium">
                {variantLabel}
              </span>
            )}
            <span className="text-xs text-[#6F7285]">
              {formatCurrency(item.product.pricing?.sellingPrice || 0)} each
            </span>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdateQuantity(item.quantity - 1)}
            className="p-2 rounded-md hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors"
          >
            <Minus className="w-4 h-4 text-[#A1A4B3]" />
          </button>
          <motion.span
            key={item.quantity}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="w-8 text-center text-sm font-semibold text-[#F5F6FA] tabular-nums"
          >
            {item.quantity}
          </motion.span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className="p-2 rounded-md hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors"
          >
            <Plus className="w-4 h-4 text-[#A1A4B3]" />
          </button>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="p-2 rounded-md hover:bg-[#E74C3C]/10 active:bg-[#E74C3C]/20 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-[#E74C3C]" />
        </button>
      </div>

      {/* Line Total */}
      <div className="flex justify-end mt-2 pt-2 border-t border-white/[0.04]">
        <span className="text-sm font-medium text-[#C6A15B] tabular-nums">
          {formatCurrency(
            (item.product.pricing?.sellingPrice || 0) * item.quantity,
          )}
        </span>
      </div>
    </motion.div>
  );
}

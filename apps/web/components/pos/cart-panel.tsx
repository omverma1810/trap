"use client";

import * as React from "react";
import { Trash2, Plus, Minus, ShoppingCart, Percent } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/data/products";
import { useCart, CartItem } from "./cart-context";

export function CartPanel() {
  const {
    items,
    removeItem,
    updateQuantity,
    subtotal,
    discount,
    discountEnabled,
    toggleDiscount,
    total,
    itemCount,
  } = useCart();

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
              <p className="text-[#6F7285] text-xs mt-1">Scan or select products to add</p>
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
        {/* Discount Toggle */}
        <button
          onClick={toggleDiscount}
          className={`
            w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
            ${discountEnabled 
              ? "bg-[#2ECC71]/10 border border-[#2ECC71]/30" 
              : "bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]"
            }
          `}
        >
          <div className="flex items-center gap-2">
            <Percent className={`w-4 h-4 ${discountEnabled ? "text-[#2ECC71]" : "text-[#A1A4B3]"}`} />
            <span className={`text-sm ${discountEnabled ? "text-[#2ECC71]" : "text-[#A1A4B3]"}`}>
              10% Discount
            </span>
          </div>
          <div className={`
            w-10 h-6 rounded-full p-0.5 transition-colors
            ${discountEnabled ? "bg-[#2ECC71]" : "bg-white/[0.15]"}
          `}>
            <motion.div
              animate={{ x: discountEnabled ? 16 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white shadow-sm"
            />
          </div>
        </button>

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
              <span className="text-[#2ECC71]">Discount (10%)</span>
              <span className="text-[#2ECC71] tabular-nums font-medium">
                -{formatCurrency(discount)}
              </span>
            </motion.div>
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
            {item.product.name}
          </p>
          <p className="text-xs text-[#6F7285] mt-0.5">
            {formatCurrency(item.product.price)} each
          </p>
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
          {formatCurrency(item.product.price * item.quantity)}
        </span>
      </div>
    </motion.div>
  );
}

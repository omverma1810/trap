"use client";

import * as React from "react";

// Product type used in cart
// Phase 17.1: Uses pricing object from ProductPricing table
export interface ProductPricing {
  sellingPrice: number;
  costPrice?: number;
  gstPercentage: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  pricing: ProductPricing;
  stock: number;
  category: string;
  // Size/variant information for POS
  size?: string | null;
  color?: string | null;
  productName?: string; // Base product name (without size/color suffix)
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// Discount preset from API
export interface DiscountPreset {
  type: "PERCENT" | "FLAT";
  value: number;
  label: string;
}

// Currently applied discount
export interface AppliedDiscount {
  type: "PERCENT" | "FLAT" | "NONE";
  value: number;
  label: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  discount: number;
  appliedDiscount: AppliedDiscount | null;
  applyDiscount: (discount: DiscountPreset | null) => void;
  totalGst: number;
  total: number;
  itemCount: number;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [appliedDiscount, setAppliedDiscount] =
    React.useState<AppliedDiscount | null>(null);

  const addItem = React.useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((prev) =>
          prev.filter((item) => item.product.id !== productId),
        );
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item,
          ),
        );
      }
    },
    [],
  );

  const clearCart = React.useCallback(() => {
    setItems([]);
    setAppliedDiscount(null);
  }, []);

  const applyDiscount = React.useCallback((discount: DiscountPreset | null) => {
    if (discount) {
      setAppliedDiscount({
        type: discount.type,
        value: discount.value,
        label: discount.label,
      });
    } else {
      setAppliedDiscount(null);
    }
  }, []);

  const subtotal = React.useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + (item.product.pricing?.sellingPrice || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const discount = React.useMemo(() => {
    if (!appliedDiscount) return 0;

    if (appliedDiscount.type === "PERCENT") {
      return Math.round(subtotal * (appliedDiscount.value / 100));
    } else if (appliedDiscount.type === "FLAT") {
      return Math.min(appliedDiscount.value, subtotal); // Don't exceed subtotal
    }
    return 0;
  }, [subtotal, appliedDiscount]);

  // Calculate GST following backend logic:
  // GST is calculated on discounted amounts (pro-rata discount allocation)
  const totalGst = React.useMemo(() => {
    if (subtotal === 0) return 0;

    let gstTotal = 0;
    for (const item of items) {
      const lineTotal =
        (item.product.pricing?.sellingPrice || 0) * item.quantity;
      const gstPercentage = item.product.pricing?.gstPercentage || 0;

      // Pro-rata discount allocation (same as backend)
      const discountShare = (lineTotal / subtotal) * discount;
      const discountedLine = lineTotal - discountShare;

      // GST on discounted amount
      const gstAmount = (discountedLine * gstPercentage) / 100;
      gstTotal += gstAmount;
    }

    // Round to 2 decimal places
    return Math.round(gstTotal * 100) / 100;
  }, [items, subtotal, discount]);

  // Total = discounted subtotal + GST (matching backend calculation)
  const discountedSubtotal = subtotal - discount;
  const total = Math.round((discountedSubtotal + totalGst) * 100) / 100;

  const itemCount = React.useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        discount,
        appliedDiscount,
        applyDiscount,
        totalGst,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

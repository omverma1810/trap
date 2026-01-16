"use client";

import * as React from "react";

// Product type used in cart
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// Discount preset from API
export interface DiscountPreset {
  type: "PERCENTAGE" | "FLAT";
  value: number;
  label: string;
}

// Currently applied discount
export interface AppliedDiscount {
  type: "PERCENTAGE" | "FLAT" | "NONE";
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
  total: number;
  itemCount: number;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([]);
  const [appliedDiscount, setAppliedDiscount] = React.useState<AppliedDiscount | null>(null);

  const addItem = React.useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeItem = React.useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

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
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items]
  );

  const discount = React.useMemo(() => {
    if (!appliedDiscount) return 0;
    
    if (appliedDiscount.type === "PERCENTAGE") {
      return Math.round(subtotal * (appliedDiscount.value / 100));
    } else if (appliedDiscount.type === "FLAT") {
      return Math.min(appliedDiscount.value, subtotal); // Don't exceed subtotal
    }
    return 0;
  }, [subtotal, appliedDiscount]);

  const total = subtotal - discount;

  const itemCount = React.useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
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


"use client";

import * as React from "react";
import {
  CartProvider,
  BarcodeInput,
  ProductGrid,
  CartPanel,
  PaymentButtons,
  CheckoutModal,
} from "@/components/pos";

export default function POSPage() {
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card">("cash");

  const handleCheckout = (method: "cash" | "card") => {
    setPaymentMethod(method);
    setCheckoutOpen(true);
  };

  return (
    <CartProvider>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
          {/* Barcode Input */}
          <div className="mb-6">
            <BarcodeInput />
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto -mx-1 px-1">
            <ProductGrid />
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-80 lg:w-96 flex flex-col border-l border-white/[0.08]">
          <div className="flex-1 overflow-hidden">
            <CartPanel />
          </div>
          
          {/* Payment Buttons */}
          <div className="p-4 border-t border-white/[0.08]">
            <PaymentButtons onCheckout={handleCheckout} />
          </div>
        </div>

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          paymentMethod={paymentMethod}
        />
      </div>
    </CartProvider>
  );
}

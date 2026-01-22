"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartProvider,
  BarcodeInput,
  ProductGrid,
  CartPanel,
  PaymentButtons,
  CheckoutModal,
} from "@/components/pos";
import { WarehouseSelector } from "@/components/dashboard";
import { inventoryService, Warehouse } from "@/services";

export default function POSPage() {
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "card">(
    "cash",
  );
  const [warehouseId, setWarehouseId] = React.useState<string | null>(null);

  // Fetch warehouses to auto-select the first one
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryService.getWarehouses(),
    staleTime: 300000, // 5 minutes
  });

  // Auto-select first warehouse when data loads
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseId) {
      setWarehouseId((warehouses as Warehouse[])[0].id);
    }
  }, [warehouses, warehouseId]);

  const handleCheckout = (method: "cash" | "card") => {
    setPaymentMethod(method);
    setCheckoutOpen(true);
  };

  return (
    <CartProvider>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
          {/* Header with Warehouse Selector */}
          <div className="flex items-center justify-between mb-6">
            <BarcodeInput />
            <WarehouseSelector
              value={warehouseId}
              onChange={setWarehouseId}
              className="ml-4"
            />
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
            <PaymentButtons onPayment={handleCheckout} />
          </div>
        </div>

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          paymentMethod={paymentMethod}
          warehouseId={warehouseId || undefined}
        />
      </div>
    </CartProvider>
  );
}

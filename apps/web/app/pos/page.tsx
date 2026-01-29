"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartProvider,
  BarcodeInput,
  ProductGrid,
  CartPanel,
  CheckoutModal,
} from "@/components/pos";
import { WarehouseSelector, StoreSelector } from "@/components/dashboard";
import { inventoryService, Warehouse } from "@/services";
import { storesService, StoreListItem } from "@/services";

type InventoryMode = "warehouse" | "store";

export default function POSPage() {
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [inventoryMode, setInventoryMode] =
    React.useState<InventoryMode>("warehouse");
  const [warehouseId, setWarehouseId] = React.useState<string | null>(null);
  const [storeId, setStoreId] = React.useState<string | null>(null);

  // Fetch warehouses to auto-select the first one
  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryService.getWarehouses(),
    staleTime: 300000, // 5 minutes
  });

  // Fetch stores
  const { data: stores } = useQuery({
    queryKey: ["stores", { isActive: true }],
    queryFn: () => storesService.getStores({ isActive: true }),
    staleTime: 300000,
  });

  // Auto-select first warehouse when data loads
  React.useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseId) {
      setWarehouseId((warehouses as Warehouse[])[0].id);
    }
  }, [warehouses, warehouseId]);

  // Auto-select first store when data loads
  React.useEffect(() => {
    if (stores && stores.length > 0 && !storeId) {
      setStoreId((stores as StoreListItem[])[0].id);
    }
  }, [stores, storeId]);

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  return (
    <CartProvider>
      <div className="flex h-[calc(100vh-56px)]">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
          {/* Header with Mode Toggle and Selectors */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <BarcodeInput />

            <div className="flex items-center gap-3">
              {/* Inventory Mode Toggle */}
              <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                <button
                  onClick={() => setInventoryMode("warehouse")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    inventoryMode === "warehouse"
                      ? "bg-[#C6A15B] text-[#0E0F13]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Warehouse
                </button>
                <button
                  onClick={() => setInventoryMode("store")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    inventoryMode === "store"
                      ? "bg-emerald-500 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Store
                </button>
              </div>

              {/* Dynamic Selector based on mode */}
              {inventoryMode === "warehouse" ? (
                <WarehouseSelector
                  value={warehouseId}
                  onChange={setWarehouseId}
                />
              ) : (
                <StoreSelector
                  value={storeId}
                  onChange={setStoreId}
                  showAllOption={false}
                  placeholder="Select Store"
                />
              )}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-auto -mx-1 px-1">
            <ProductGrid
              warehouseId={
                inventoryMode === "warehouse"
                  ? warehouseId || undefined
                  : undefined
              }
              storeId={
                inventoryMode === "store" ? storeId || undefined : undefined
              }
            />
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-80 lg:w-96 flex flex-col border-l border-white/[0.08]">
          <div className="flex-1 overflow-hidden">
            <CartPanel />
          </div>

          {/* Checkout Button */}
          <div className="p-4 border-t border-white/[0.08]">
            <CheckoutButton onCheckout={handleCheckout} />
          </div>
        </div>

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          warehouseId={
            inventoryMode === "warehouse" ? warehouseId || undefined : undefined
          }
          storeId={inventoryMode === "store" ? storeId || undefined : undefined}
        />
      </div>
    </CartProvider>
  );
}

// Simple checkout button that opens the checkout modal
function CheckoutButton({ onCheckout }: { onCheckout: () => void }) {
  return (
    <button
      onClick={onCheckout}
      className="w-full py-4 rounded-xl bg-gradient-to-r from-[#C6A15B] to-[#D4B06A] text-[#0E0F13] font-bold text-lg hover:from-[#D4B06A] hover:to-[#E0C080] transition-all shadow-lg shadow-[#C6A15B]/20"
    >
      Proceed to Checkout
    </button>
  );
}

"use client";

import { Barcode, ShoppingCart, CreditCard, Trash2, Plus, Minus } from "lucide-react";

export default function POSPage() {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left Panel - Product Search & Barcode */}
      <div className="flex-1 flex flex-col p-4 border-r border-white/[0.08] overflow-hidden">
        {/* Barcode Input */}
        <div className="mb-6">
          <div className="relative">
            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6F7285] stroke-[1.5]" />
            <input
              type="text"
              placeholder="Scan barcode or search product..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#1A1B23]/80 border border-white/[0.08] text-lg text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Product Grid Placeholder */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i} 
                className="p-4 rounded-xl bg-[#1A1B23]/60 border border-white/[0.08] hover:border-[#C6A15B]/30 cursor-pointer transition-all group"
              >
                <div className="aspect-square bg-white/[0.03] rounded-lg mb-3 flex items-center justify-center group-hover:bg-white/[0.05] transition-colors">
                  <ShoppingCart className="w-8 h-8 text-[#6F7285] stroke-[1.5]" />
                </div>
                <p className="text-sm font-medium text-[#F5F6FA] truncate">
                  Product {i + 1}
                </p>
                <p className="text-xs text-[#6F7285] mt-0.5">SKU-{1000 + i}</p>
                <p className="text-[#C6A15B] font-semibold mt-2 tabular-nums">₹999</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 flex flex-col bg-[#1A1B23]/40">
        {/* Cart Header */}
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Current Cart</h2>
            <span className="px-2.5 py-1 rounded-full bg-[#C6A15B]/10 text-[#C6A15B] text-xs font-medium">
              3 items
            </span>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/[0.05] rounded-lg flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#6F7285] stroke-[1.5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F5F6FA] truncate">
                    Product {item}
                  </p>
                  <p className="text-xs text-[#6F7285] mt-0.5">₹999 each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                    <Minus className="w-4 h-4 text-[#A1A4B3] stroke-[1.5]" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-[#F5F6FA] tabular-nums">1</span>
                  <button className="p-1.5 rounded-md hover:bg-white/[0.05] transition-colors">
                    <Plus className="w-4 h-4 text-[#A1A4B3] stroke-[1.5]" />
                  </button>
                </div>
                <button className="p-2 rounded-md hover:bg-[#E74C3C]/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-[#E74C3C] stroke-[1.5]" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t border-white/[0.08] space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A4B3]">Subtotal</span>
              <span className="text-[#F5F6FA] tabular-nums font-medium">₹2,997</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#A1A4B3]">Discount</span>
              <span className="text-[#2ECC71] tabular-nums font-medium">-₹0</span>
            </div>
            <div className="h-px bg-white/[0.08]" />
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-[#F5F6FA]">Total</span>
              <span className="text-[#C6A15B] tabular-nums">₹2,997</span>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors">
              <CreditCard className="w-5 h-5 stroke-[1.5]" />
              Card
            </button>
            <button className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors">
              <Barcode className="w-5 h-5 stroke-[1.5]" />
              Cash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

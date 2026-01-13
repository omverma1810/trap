"use client";

import { Barcode, ShoppingCart, CreditCard, Trash2, Plus, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from "@/components/ui";

export default function POSPage() {
  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Left Panel - Product Search & Barcode */}
      <div className="flex-1 flex flex-col p-4 border-r border-border-default overflow-hidden">
        {/* Barcode Input */}
        <div className="mb-6">
          <div className="relative">
            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="Scan barcode or search product..."
              className="w-full pl-12 pr-4 py-4 rounded-lg bg-bg-surface border border-border-default text-body placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary text-lg"
              autoFocus
            />
          </div>
        </div>

        {/* Product Grid Placeholder */}
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card 
                key={i} 
                variant="elevated" 
                padding="sm" 
                hover 
                className="cursor-pointer"
              >
                <div className="aspect-square bg-bg-elevated rounded-md mb-3 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-body-sm font-medium text-text-primary truncate">
                  Product {i + 1}
                </p>
                <p className="text-caption text-text-muted">SKU-{1000 + i}</p>
                <p className="numeric text-accent-primary mt-1">₹999</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 flex flex-col bg-bg-surface/30">
        {/* Cart Header */}
        <div className="p-4 border-b border-border-default">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm font-semibold">Current Cart</h2>
            <Badge variant="accent">3 items</Badge>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {[1, 2, 3].map((item) => (
            <Card key={item} variant="elevated" padding="sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-bg-elevated rounded flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-text-primary truncate">
                    Product {item}
                  </p>
                  <p className="text-caption text-text-muted">₹999 each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 rounded hover:bg-bg-elevated">
                    <Minus className="w-4 h-4 text-text-secondary" />
                  </button>
                  <span className="numeric w-8 text-center">1</span>
                  <button className="p-1 rounded hover:bg-bg-elevated">
                    <Plus className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
                <button className="p-2 rounded hover:bg-danger-muted">
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </Card>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t border-border-default space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-body-sm">
              <span className="text-text-secondary">Subtotal</span>
              <span className="numeric text-text-primary">₹2,997</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span className="text-text-secondary">Discount</span>
              <span className="numeric text-success">-₹0</span>
            </div>
            <div className="h-px bg-border-default" />
            <div className="flex justify-between text-heading-sm font-semibold">
              <span>Total</span>
              <span className="numeric text-accent-primary">₹2,997</span>
            </div>
          </div>

          {/* Payment Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" size="lg" className="gap-2">
              <CreditCard className="w-5 h-5" />
              Card
            </Button>
            <Button variant="primary" size="lg" className="gap-2">
              <Barcode className="w-5 h-5" />
              Cash
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

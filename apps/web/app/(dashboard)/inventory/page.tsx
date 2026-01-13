"use client";

import { Package, Plus, Filter, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from "@/components/ui";
import { PageTransition } from "@/components/layout";

export default function InventoryPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 rounded-md bg-bg-surface border border-border-default text-body-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
            <Button variant="secondary" size="md">
              <Filter className="w-4 h-4" /> Filters
            </Button>
          </div>
          <Button variant="primary">
            <Plus className="w-4 h-4" /> Add Product
          </Button>
        </div>

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-success-muted">
                <Package className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-caption text-text-muted">In Stock</p>
                <p className="numeric text-heading-sm">1,124</p>
              </div>
            </div>
          </Card>
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-warning-muted">
                <Package className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-caption text-text-muted">Low Stock</p>
                <p className="numeric text-heading-sm">45</p>
              </div>
            </div>
          </Card>
          <Card variant="glass" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-md bg-danger-muted">
                <Package className="w-5 h-5 text-danger" />
              </div>
              <div>
                <p className="text-caption text-text-muted">Out of Stock</p>
                <p className="numeric text-heading-sm">12</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Placeholder Table */}
        <Card variant="glass" padding="none">
          <CardHeader className="px-6 pt-6">
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                <Package className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-heading-sm text-text-primary mb-2">Product Table</h3>
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
                This is a placeholder for the inventory table. 
                Tables and data integration will be added in Phase 3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

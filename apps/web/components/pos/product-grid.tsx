"use client";

import * as React from "react";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Barcode,
  Printer,
} from "lucide-react";
import { motion } from "framer-motion";
// Re-export Product type from cart-context for consistency
import { useCart, Product } from "./cart-context";
import { usePOSProducts } from "@/hooks";
import { EmptyState, emptyStates } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { POSProduct } from "@/services/inventory.service";

// Get API base URL for barcode images
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface ProductGridProps {
  searchQuery?: string;
}

export function ProductGrid({ searchQuery = "" }: ProductGridProps) {
  const { addItem } = useCart();
  const [lastAdded, setLastAdded] = React.useState<string | null>(null);
  const [showBarcodeFor, setShowBarcodeFor] = React.useState<string | null>(
    null
  );

  // Use POS-specific API to get flattened variants with real-time stock
  const {
    data: productsResponse,
    isLoading,
    isError,
  } = usePOSProducts({
    search: searchQuery || undefined,
  });

  // Transform API products to cart-compatible format with pricing object
  const products: Product[] = React.useMemo(() => {
    if (!productsResponse?.results) return [];
    return productsResponse.results.map((p: POSProduct) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || "",
      pricing: {
        sellingPrice: parseFloat(p.sellingPrice) || 0,
        gstPercentage: 0, // Will come from API when available
      },
      stock: p.stock,
      category: p.category,
    }));
  }, [productsResponse]);

  // Filter by search (additional client-side filtering if needed)
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
  }, [searchQuery, products]);

  const handleAddProduct = (product: Product) => {
    if (product.stock === 0) return;
    addItem(product);
    setLastAdded(product.id);
    setTimeout(() => setLastAdded(null), 300);
  };

  const handlePrintBarcode = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!product.barcode) return;

    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) {
      alert("Please allow popups to print barcodes");
      return;
    }

    const barcodeUrl = `${API_BASE_URL}/inventory/barcodes/${product.barcode}/image/`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${product.sku}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .label {
              text-align: center;
              padding: 5mm;
              border: 1px dashed #ccc;
              width: 60mm;
            }
            .product-name {
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 3mm;
              word-wrap: break-word;
            }
            .barcode-image {
              max-width: 100%;
              height: auto;
              margin: 3mm 0;
            }
            .price {
              font-size: 12pt;
              font-weight: bold;
              margin-top: 2mm;
            }
            .sku {
              font-size: 8pt;
              color: #666;
              margin-top: 1mm;
            }
            @media print {
              body { padding: 0; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="product-name">${product.name}</div>
            <img src="${barcodeUrl}" alt="Barcode" class="barcode-image" />
            <div class="price">₹${(product.pricing?.sellingPrice || 0).toLocaleString("en-IN")}</div>
            <div class="sku">SKU: ${product.sku}</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-[#1A1B23]/60 border border-white/[0.08]"
          >
            <Skeleton className="aspect-square rounded-lg mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="py-16 text-center">
        <Package className="w-12 h-12 text-[#E74C3C] mx-auto mb-4" />
        <p className="text-[#E74C3C]">Could not load products</p>
        <p className="text-xs text-[#6F7285] mt-1">
          Check if backend is running
        </p>
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="col-span-full">
        <EmptyState
          icon={Package}
          title={emptyStates.pos.title}
          description={emptyStates.pos.description}
          actions={[
            {
              label: "Go to Inventory",
              href: "/inventory",
              variant: "primary",
            },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {filteredProducts.map((product) => {
        const isOutOfStock = product.stock === 0;
        const isLowStock = product.stock > 0 && product.stock <= 5;
        const isJustAdded = lastAdded === product.id;
        const showingBarcode = showBarcodeFor === product.id;

        return (
          <motion.div
            key={product.id}
            animate={isJustAdded ? { scale: [1, 0.95, 1] } : {}}
            transition={{ duration: 0.2 }}
            className={`
              relative p-4 rounded-xl text-left transition-all group
              ${
                isOutOfStock
                  ? "bg-[#1A1B23]/40 border border-white/[0.04] opacity-60"
                  : "bg-[#1A1B23]/60 border border-white/[0.08] hover:border-[#C6A15B]/40 hover:bg-[#1A1B23]/80"
              }
            `}
            onMouseEnter={() => setShowBarcodeFor(product.id)}
            onMouseLeave={() => setShowBarcodeFor(null)}
          >
            {/* Main clickable area for adding to cart */}
            <button
              onClick={() => handleAddProduct(product)}
              disabled={isOutOfStock}
              className="w-full text-left focus:outline-none"
            >
              {/* Product Image Placeholder */}
              <div
                className={`
                aspect-square rounded-lg mb-3 flex items-center justify-center
                ${isOutOfStock ? "bg-white/[0.02]" : "bg-white/[0.03]"}
              `}
              >
                <Package
                  className={`w-10 h-10 ${
                    isOutOfStock ? "text-[#6F7285]/50" : "text-[#6F7285]"
                  } stroke-[1.5]`}
                />
              </div>

              {/* Product Info */}
              <p
                className={`text-sm font-medium truncate ${
                  isOutOfStock ? "text-[#6F7285]" : "text-[#F5F6FA]"
                }`}
              >
                {product.name}
              </p>
              <p className="text-xs text-[#6F7285] mt-0.5">{product.sku}</p>

              {/* Barcode on hover */}
              {product.barcode && showingBarcode && (
                <p className="flex items-center gap-1 text-xs text-[#C6A15B] mt-0.5">
                  <Barcode className="w-3 h-3" />
                  {product.barcode}
                </p>
              )}

              <p
                className={`text-base font-semibold mt-2 tabular-nums ${
                  isOutOfStock ? "text-[#6F7285]" : "text-[#C6A15B]"
                }`}
              >
                {formatCurrency(product.pricing?.sellingPrice || 0)}
              </p>
            </button>

            {/* Stock Badge */}
            {isOutOfStock && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[#E74C3C]/20 text-[#E74C3C] text-[10px] font-medium uppercase">
                Out of Stock
              </div>
            )}
            {isLowStock && (
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded bg-[#F5A623]/20 text-[#F5A623] text-[10px] font-medium">
                <AlertTriangle className="w-3 h-3" />
                {product.stock} left
              </div>
            )}

            {/* Print Barcode Button - on hover */}
            {product.barcode && showingBarcode && !isOutOfStock && (
              <button
                onClick={(e) => handlePrintBarcode(e, product)}
                className="absolute bottom-3 right-3 p-1.5 rounded-md bg-[#C6A15B]/10 hover:bg-[#C6A15B]/20 transition-colors"
                title="Print Barcode"
              >
                <Printer className="w-4 h-4 text-[#C6A15B]" />
              </button>
            )}

            {/* Add indicator when not showing barcode */}
            {!isOutOfStock && !showingBarcode && (
              <div className="absolute bottom-3 right-3 p-1.5 rounded-md bg-[#C6A15B]/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <ShoppingCart className="w-4 h-4 text-[#C6A15B]" />
              </div>
            )}
          </motion.div>
        );
      })}

      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="col-span-full py-16 text-center">
          <Package className="w-12 h-12 text-[#6F7285] mx-auto mb-4" />
          <p className="text-[#A1A4B3]">
            No products found for &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  );
}

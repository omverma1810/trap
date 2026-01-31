"use client";

import * as React from "react";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Barcode,
  Printer,
  Ruler,
} from "lucide-react";
import { motion } from "framer-motion";
// Re-export Product type from cart-context for consistency
import { useCart, Product } from "./cart-context";
import { SizeSelectionModal, ProductVariant } from "./size-selection-modal";
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

// Grouped product for display
interface GroupedProduct {
  productName: string;
  brand: string;
  category: string;
  variants: ProductVariant[];
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  hasMultipleVariants: boolean;
  // Use first variant's data for display
  displayBarcode: string;
  displaySku: string;
}

interface ProductGridProps {
  searchQuery?: string;
  warehouseId?: string;
  storeId?: string;
}

export function ProductGrid({
  searchQuery = "",
  warehouseId,
  storeId,
}: ProductGridProps) {
  const { addItem } = useCart();
  const [lastAdded, setLastAdded] = React.useState<string | null>(null);
  const [showBarcodeFor, setShowBarcodeFor] = React.useState<string | null>(
    null,
  );
  const [selectedProduct, setSelectedProduct] =
    React.useState<GroupedProduct | null>(null);

  // Use POS-specific API to get flattened variants with real-time stock
  const {
    data: productsResponse,
    isLoading,
    isError,
  } = usePOSProducts({
    search: searchQuery || undefined,
    warehouse_id: warehouseId,
    store_id: storeId,
  });

  // Transform and GROUP products by base product name
  const groupedProducts: GroupedProduct[] = React.useMemo(() => {
    if (!productsResponse?.results) return [];

    // Create a map to group variants by product name + brand
    const productMap = new Map<string, GroupedProduct>();

    productsResponse.results.forEach((p: POSProduct) => {
      // Use productName if available, otherwise extract from name (before the parentheses)
      const baseName = p.productName || p.name.split(" (")[0].trim();
      const groupKey = `${p.brand}::${baseName}`;

      const variant: ProductVariant = {
        id: p.id,
        name: p.name,
        productName: baseName,
        sku: p.sku,
        barcode: p.barcode || "",
        size: p.size,
        color: p.color,
        sellingPrice: parseFloat(p.sellingPrice) || 0,
        costPrice: parseFloat(p.costPrice) || 0,
        gstPercentage: parseFloat(p.gstPercentage) || 0,
        stock: p.stock,
        category: p.category,
        brand: p.brand,
      };

      if (!productMap.has(groupKey)) {
        productMap.set(groupKey, {
          productName: baseName,
          brand: p.brand,
          category: p.category,
          variants: [variant],
          totalStock: p.stock,
          minPrice: variant.sellingPrice,
          maxPrice: variant.sellingPrice,
          hasMultipleVariants: false,
          displayBarcode: p.barcode || "",
          displaySku: p.sku,
        });
      } else {
        const existing = productMap.get(groupKey)!;
        existing.variants.push(variant);
        existing.totalStock += p.stock;
        existing.minPrice = Math.min(existing.minPrice, variant.sellingPrice);
        existing.maxPrice = Math.max(existing.maxPrice, variant.sellingPrice);
        existing.hasMultipleVariants = true;
      }
    });

    return Array.from(productMap.values());
  }, [productsResponse]);

  // Filter by search (additional client-side filtering if needed)
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return groupedProducts;
    const query = searchQuery.toLowerCase();
    return groupedProducts.filter(
      (p) =>
        p.productName.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.displaySku.toLowerCase().includes(query) ||
        p.displayBarcode.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(query) ||
            v.barcode.toLowerCase().includes(query),
        ),
    );
  }, [searchQuery, groupedProducts]);

  const handleProductClick = (product: GroupedProduct) => {
    // If product has multiple variants (sizes/colors), show selection modal
    if (product.hasMultipleVariants) {
      setSelectedProduct(product);
    } else {
      // Single variant - add directly to cart
      const variant = product.variants[0];
      if (variant.stock === 0) return;

      const cartProduct: Product = {
        id: variant.id,
        name: variant.name,
        productName: variant.productName,
        sku: variant.sku,
        barcode: variant.barcode,
        pricing: {
          sellingPrice: variant.sellingPrice,
          gstPercentage: variant.gstPercentage || 0,
        },
        stock: variant.stock,
        category: variant.category,
        size: variant.size,
        color: variant.color,
      };

      addItem(cartProduct);
      setLastAdded(product.productName);
      setTimeout(() => setLastAdded(null), 300);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    const cartProduct: Product = {
      id: variant.id,
      name: variant.name,
      productName: variant.productName,
      sku: variant.sku,
      barcode: variant.barcode,
      pricing: {
        sellingPrice: variant.sellingPrice,
        gstPercentage: variant.gstPercentage || 0,
      },
      stock: variant.stock,
      category: variant.category,
      size: variant.size,
      color: variant.color,
    };

    addItem(cartProduct);
    setLastAdded(variant.productName);
    setTimeout(() => setLastAdded(null), 300);
  };

  const handlePrintBarcode = (e: React.MouseEvent, product: GroupedProduct) => {
    e.stopPropagation();
    if (!product.displayBarcode) return;

    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) {
      alert("Please allow popups to print barcodes");
      return;
    }

    const barcodeUrl = `${API_BASE_URL}/inventory/barcodes/${product.displayBarcode}/image/`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${product.displaySku}</title>
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
            <div class="product-name">${product.productName}</div>
            <img src="${barcodeUrl}" alt="Barcode" class="barcode-image" />
            <div class="price">₹${product.minPrice.toLocaleString("en-IN")}</div>
            <div class="sku">SKU: ${product.displaySku}</div>
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
  if (groupedProducts.length === 0) {
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
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredProducts.map((product) => {
          const isOutOfStock = product.totalStock === 0;
          const isLowStock = product.totalStock > 0 && product.totalStock <= 5;
          const isJustAdded = lastAdded === product.productName;
          const showingBarcode = showBarcodeFor === product.productName;

          // Get available sizes for display
          const availableSizes = product.variants
            .filter((v) => v.stock > 0)
            .map((v) => v.size)
            .filter((s): s is string => s !== null && s !== undefined);
          const uniqueSizes = Array.from(new Set(availableSizes));

          return (
            <motion.div
              key={product.productName + product.brand}
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
              onMouseEnter={() => setShowBarcodeFor(product.productName)}
              onMouseLeave={() => setShowBarcodeFor(null)}
            >
              {/* Main clickable area */}
              <button
                onClick={() => handleProductClick(product)}
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
                  {product.productName}
                </p>
                <p className="text-xs text-[#6F7285] mt-0.5">{product.brand}</p>

                {/* Available Sizes Preview (if multiple variants) */}
                {product.hasMultipleVariants && uniqueSizes.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <Ruler className="w-3 h-3 text-[#6F7285]" />
                    <span className="text-[10px] text-[#A1A4B3]">
                      {uniqueSizes.slice(0, 5).join(", ")}
                      {uniqueSizes.length > 5 && ` +${uniqueSizes.length - 5}`}
                    </span>
                  </div>
                )}

                {/* Barcode on hover */}
                {product.displayBarcode && showingBarcode && (
                  <p className="flex items-center gap-1 text-xs text-[#C6A15B] mt-0.5">
                    <Barcode className="w-3 h-3" />
                    {product.displayBarcode}
                  </p>
                )}

                <p
                  className={`text-base font-semibold mt-2 tabular-nums ${
                    isOutOfStock ? "text-[#6F7285]" : "text-[#C6A15B]"
                  }`}
                >
                  {formatCurrency(product.minPrice)}
                  {product.maxPrice > product.minPrice && (
                    <span className="text-xs text-[#6F7285] font-normal ml-1">
                      - {formatCurrency(product.maxPrice)}
                    </span>
                  )}
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
                  {product.totalStock} left
                </div>
              )}

              {/* Multiple Sizes Indicator */}
              {product.hasMultipleVariants && !isOutOfStock && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-[#C6A15B]/20 text-[#C6A15B] text-[10px] font-medium flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  {product.variants.length} sizes
                </div>
              )}

              {/* Print Barcode Button - on hover */}
              {product.displayBarcode && showingBarcode && !isOutOfStock && (
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

        {filteredProducts.length === 0 && groupedProducts.length > 0 && (
          <div className="col-span-full py-16 text-center">
            <Package className="w-12 h-12 text-[#6F7285] mx-auto mb-4" />
            <p className="text-[#A1A4B3]">
              No products found for &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Size Selection Modal */}
      <SizeSelectionModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        productName={selectedProduct?.productName || ""}
        brand={selectedProduct?.brand || ""}
        variants={selectedProduct?.variants || []}
        onSelectVariant={handleVariantSelect}
      />
    </>
  );
}

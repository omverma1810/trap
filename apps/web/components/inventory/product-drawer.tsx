"use client";

import * as React from "react";
import Image from "next/image";
import {
  X,
  Package,
  MapPin,
  Tag,
  Barcode,
  Printer,
  Trash2,
  Loader2,
  Building2,
  Pencil,
  ChevronDown,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDeactivateProduct, useWarehouses } from "@/hooks";
import { useAuth } from "@/lib/auth";
import { EditProductModal } from "./edit-product-modal";

// Local helpers
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStockColor(status: string): string {
  switch (status) {
    case "in_stock":
      return "#2ECC71";
    case "low_stock":
      return "#F5A623";
    case "out_of_stock":
      return "#E74C3C";
    default:
      return "#6F7285";
  }
}

function getStockLabel(status: string): string {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "out_of_stock":
      return "Out of Stock";
    default:
      return status;
  }
}

// Get API base URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

// Product type - Phase 10B enhanced
interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  barcode?: string;
  barcodeImageUrl?: string;
  brand?: string;
  description?: string;
  costPrice?: number;
  mrp?: number;
  sellingPrice: number;
  reorderThreshold?: number;
  isDeleted?: boolean;
  size?: string | null;
  stock: {
    total: number;
    byWarehouse: {
      warehouseId: string;
      warehouseName: string;
      quantity: number;
    }[];
  };
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface ProductDrawerProps {
  product: InventoryProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function ProductDrawer({
  product,
  isOpen,
  onClose,
  onDeleted,
}: ProductDrawerProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<
    string | null
  >(null);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] =
    React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const deactivateMutation = useDeactivateProduct();
  const { data: warehouses = [], isLoading: isLoadingWarehouses } =
    useWarehouses();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // Get selected warehouse info
  const selectedWarehouse = React.useMemo(() => {
    if (!selectedWarehouseId) return null;
    return warehouses.find((w) => w.id === selectedWarehouseId) || null;
  }, [selectedWarehouseId, warehouses]);

  // Get stock for selected warehouse
  const selectedWarehouseStock = React.useMemo(() => {
    if (!selectedWarehouseId || !product?.stock.byWarehouse) return null;
    const warehouseStock = product.stock.byWarehouse.find(
      (wh) => wh.warehouseId === selectedWarehouseId,
    );
    return warehouseStock?.quantity ?? 0;
  }, [selectedWarehouseId, product?.stock.byWarehouse]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsWarehouseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset delete confirm when drawer closes
  React.useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      setShowEditModal(false);
      setSelectedWarehouseId(null);
      setIsWarehouseDropdownOpen(false);
    }
  }, [isOpen]);

  // Handle product deletion (soft delete)
  const handleDelete = async () => {
    if (!product) return;

    try {
      await deactivateMutation.mutateAsync(product.id);
      setShowDeleteConfirm(false);
      onClose();
      onDeleted?.();
    } catch (error) {
      console.error("Failed to deactivate product:", error);
    }
  };

  // Handle barcode printing
  const handlePrintBarcode = (product: InventoryProduct) => {
    const printWindow = window.open("", "_blank", "width=400,height=400");
    if (!printWindow) {
      alert("Please allow popups to print barcodes");
      return;
    }

    const barcodeUrl = `${API_BASE_URL}/inventory/barcodes/${product.barcode}/image/`;

    // Determine if this is apparel/shoes to show size
    const apparelCategories = [
      "shirts",
      "pants",
      "jeans",
      "dresses",
      "tops",
      "t-shirts",
      "jackets",
      "coats",
      "sweaters",
      "hoodies",
      "kurta",
      "saree",
      "lehenga",
      "clothing",
      "apparel",
    ];
    const shoeCategories = [
      "shoes",
      "footwear",
      "sneakers",
      "boots",
      "sandals",
      "heels",
      "flats",
      "loafers",
      "slippers",
    ];

    const categoryLower = (product.category || "").toLowerCase();
    const isApparel = apparelCategories.some((cat) =>
      categoryLower.includes(cat),
    );
    const isShoes = shoeCategories.some((cat) => categoryLower.includes(cat));

    // Format size display
    let sizeDisplay = "";
    if (product.size) {
      if (isShoes) {
        // For shoes, show with EU format
        sizeDisplay = `EU ${product.size}`;
      } else if (isApparel) {
        // For apparel, show size directly (S, M, L, XL, etc.)
        sizeDisplay = product.size;
      }
    }

    // Use MRP if available, otherwise use selling price
    const displayPrice = product.mrp || product.sellingPrice;

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
              padding: 4mm;
              border: 1px dashed #ccc;
              width: 50mm;
              background: white;
            }
            .brand-name {
              font-size: 9pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2mm;
              letter-spacing: 0.5px;
            }
            .product-name {
              font-size: 8pt;
              margin-bottom: 2mm;
              word-wrap: break-word;
              line-height: 1.2;
              max-height: 3em;
              overflow: hidden;
            }
            .size-display {
              font-size: 10pt;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .mrp {
              font-size: 11pt;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            .barcode-image {
              max-width: 100%;
              height: auto;
              margin: 2mm 0;
            }
            .barcode-value {
              font-size: 8pt;
              font-family: 'Courier New', monospace;
              letter-spacing: 1px;
              margin-top: 1mm;
            }
            .description {
              font-size: 7pt;
              color: #444;
              margin-top: 2mm;
              line-height: 1.2;
              max-height: 2.5em;
              overflow: hidden;
              word-wrap: break-word;
            }
            @media print {
              body { padding: 0; }
              .label { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="brand-name">${product.brand || ""}</div>
            <div class="product-name">${product.name}</div>
            ${sizeDisplay ? `<div class="size-display">${sizeDisplay}</div>` : ""}
            <div class="mrp">MRP ₹${displayPrice.toLocaleString("en-IN")}</div>
            <img src="${barcodeUrl}" alt="Barcode" class="barcode-image" />
            <div class="barcode-value">${product.barcode}</div>
            ${product.description ? `<div class="description">${product.description}</div>` : ""}
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

  if (!product) return null;

  const statusColor = getStockColor(product.status);
  const statusLabel = getStockLabel(product.status);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-0 right-0 z-50 w-full max-w-md h-full bg-[#1A1B23] border-l border-white/[0.08] shadow-2xl overflow-hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                <h2 className="text-lg font-semibold text-[#F5F6FA]">
                  Product Details
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5 text-[#A1A4B3]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Product Image Placeholder */}
                <div className="aspect-square max-w-[200px] mx-auto rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <Package className="w-16 h-16 text-[#6F7285] stroke-[1]" />
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">
                      {product.name}
                    </h3>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium"
                      style={{
                        backgroundColor: `${statusColor}15`,
                        color: statusColor,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: statusColor }}
                      />
                      {statusLabel}
                    </span>
                    {product.isDeleted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-sm font-medium bg-[#E74C3C]/20 text-[#E74C3C] ml-2">
                        <Trash2 className="w-3 h-3" />
                        Deleted
                      </span>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard icon={Barcode} label="SKU" value={product.sku} />
                    <InfoCard
                      icon={Tag}
                      label="Category"
                      value={product.category}
                    />
                    {product.brand && (
                      <InfoCard
                        icon={Building2}
                        label="Brand"
                        value={product.brand}
                      />
                    )}
                  </div>
                </div>

                {/* Warehouse Selection Dropdown */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                    Select Warehouse
                  </h4>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsWarehouseDropdownOpen(!isWarehouseDropdownOpen)
                      }
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[#F5F6FA] hover:bg-white/[0.05] transition-colors"
                      disabled={isLoadingWarehouses}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#6F7285]" />
                        <span className="text-sm">
                          {isLoadingWarehouses
                            ? "Loading warehouses..."
                            : selectedWarehouse
                              ? selectedWarehouse.name
                              : "Select a warehouse"}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-[#6F7285] transition-transform ${
                          isWarehouseDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {isWarehouseDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-10 w-full mt-1 py-1 rounded-lg bg-[#23242F] border border-white/[0.08] shadow-xl max-h-48 overflow-auto"
                        >
                          {warehouses.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-[#6F7285]">
                              No warehouses available
                            </div>
                          ) : (
                            warehouses.map((warehouse) => {
                              const warehouseStock =
                                product.stock.byWarehouse?.find(
                                  (wh) => wh.warehouseId === warehouse.id,
                                );
                              const stockQty = warehouseStock?.quantity ?? 0;

                              return (
                                <button
                                  key={warehouse.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWarehouseId(warehouse.id);
                                    setIsWarehouseDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.05] transition-colors ${
                                    selectedWarehouseId === warehouse.id
                                      ? "bg-[#C6A15B]/10"
                                      : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#6F7285]" />
                                    <span className="text-sm text-[#F5F6FA]">
                                      {warehouse.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-medium tabular-nums ${
                                        stockQty === 0
                                          ? "text-[#E74C3C]"
                                          : stockQty <= 5
                                            ? "text-[#F5A623]"
                                            : "text-[#2ECC71]"
                                      }`}
                                    >
                                      {stockQty} units
                                    </span>
                                    {selectedWarehouseId === warehouse.id && (
                                      <Check className="w-4 h-4 text-[#C6A15B]" />
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selected Warehouse Stock Info */}
                  {selectedWarehouse && (
                    <div className="p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#C6A15B]" />
                          <span className="text-sm font-medium text-[#C6A15B]">
                            {selectedWarehouse.name} Stock
                          </span>
                        </div>
                        <span
                          className={`text-lg font-bold tabular-nums ${
                            selectedWarehouseStock === 0
                              ? "text-[#E74C3C]"
                              : selectedWarehouseStock !== null &&
                                  selectedWarehouseStock <= 5
                                ? "text-[#F5A623]"
                                : "text-[#C6A15B]"
                          }`}
                        >
                          {selectedWarehouseStock ?? 0} units
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Barcode Section */}
                {product.barcode && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                      Barcode
                    </h4>
                    <div className="p-4 rounded-lg bg-white border border-white/[0.08] text-center">
                      {/* Barcode Image */}
                      <div className="mb-3">
                        <Image
                          src={`${API_BASE_URL}/inventory/barcodes/${product.barcode}/image/`}
                          alt={`Barcode ${product.barcode}`}
                          width={200}
                          height={96}
                          className="mx-auto max-h-24"
                          onError={(e) => {
                            // Hide image on error, show text fallback
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <p className="text-sm font-mono text-gray-800">
                        {product.barcode}
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrintBarcode(product)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/20 text-[#C6A15B] font-medium hover:bg-[#C6A15B]/20 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Print Barcode
                    </button>
                  </div>
                )}

                {/* Stock by Warehouse */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                    Stock by Warehouse
                  </h4>
                  <div className="space-y-2">
                    {product.stock.byWarehouse &&
                    product.stock.byWarehouse.length > 0 ? (
                      product.stock.byWarehouse.map((wh) => (
                        <div
                          key={wh.warehouseId}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#6F7285]" />
                            <span className="text-sm text-[#F5F6FA]">
                              {wh.warehouseName}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              wh.quantity === 0
                                ? "text-[#E74C3C]"
                                : wh.quantity <= 5
                                  ? "text-[#F5A623]"
                                  : "text-[#F5F6FA]"
                            }`}
                          >
                            {wh.quantity} units
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#6F7285]">
                        No warehouse data
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/20">
                    <span className="text-sm font-medium text-[#C6A15B]">
                      Total Stock
                    </span>
                    <span className="text-lg font-bold text-[#C6A15B] tabular-nums">
                      {product.stock.total} units
                    </span>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#A1A4B3] uppercase tracking-wide">
                    Pricing
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-[#6F7285] mb-1">Cost</p>
                      <p className="text-lg font-semibold text-[#F5F6FA] tabular-nums">
                        {formatCurrency(product.costPrice || 0)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-[#6F7285] mb-1">MRP</p>
                      <p className="text-lg font-semibold text-[#A1A4B3] tabular-nums">
                        {formatCurrency(product.mrp || product.sellingPrice)}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/20">
                      <p className="text-xs text-[#C6A15B] mb-1">Selling</p>
                      <p className="text-lg font-semibold text-[#C6A15B] tabular-nums">
                        {formatCurrency(product.sellingPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#2ECC71]/10 border border-[#2ECC71]/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#2ECC71]">
                        Profit Margin
                      </span>
                      <span className="text-sm font-semibold text-[#2ECC71] tabular-nums">
                        {product.costPrice && product.costPrice > 0
                          ? Math.round(
                              ((product.sellingPrice - product.costPrice) /
                                product.costPrice) *
                                100,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/[0.08] space-y-3">
                {/* Delete Confirmation */}
                {showDeleteConfirm ? (
                  <div className="p-3 rounded-lg bg-[#E74C3C]/10 border border-[#E74C3C]/30">
                    <p className="text-sm text-[#E74C3C] mb-3">
                      Are you sure you want to deactivate this product? It will
                      be hidden from inventory and POS.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deactivateMutation.isPending}
                        className="flex-1 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-sm font-medium hover:bg-white/[0.08] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deactivateMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[#E74C3C] text-white text-sm font-medium hover:bg-[#C0392B] transition-colors disabled:opacity-50"
                      >
                        {deactivateMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Deactivating...
                          </>
                        ) : (
                          "Yes, Deactivate"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {/* Edit button */}
                    {!product.isDeleted && (
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/30 text-[#C6A15B] font-medium hover:bg-[#C6A15B]/20 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {/* Delete button - Admin only */}
                    {isAdmin && !product.isDeleted && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#E74C3C]/10 border border-[#E74C3C]/30 text-[#E74C3C] font-medium hover:bg-[#E74C3C]/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Edit Product Modal */}
          <EditProductModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              // Refresh the data
              onDeleted?.(); // Reuse the onDeleted callback to trigger a refresh
            }}
            product={
              product
                ? {
                    id: product.id,
                    name: product.name,
                    brand: product.brand || "",
                    category: product.category,
                    costPrice: product.costPrice,
                    mrp: product.mrp,
                    sellingPrice: product.sellingPrice,
                  }
                : null
            }
          />
        </>
      )}
    </AnimatePresence>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-[#6F7285]" />
        <span className="text-xs text-[#6F7285]">{label}</span>
      </div>
      <p className="text-sm font-medium text-[#F5F6FA]">{value}</p>
    </div>
  );
}

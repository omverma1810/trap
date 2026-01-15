"use client";

import * as React from "react";
import { X, Package, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useWarehouses } from "@/hooks";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch warehouses for initial stock
  const { data: warehouses } = useWarehouses();

  // Form state
  const [formData, setFormData] = React.useState({
    product_name: "",
    sku: "",
    barcode: "",
    category: "",
    brand: "",
    cost_price: "",
    selling_price: "",
    reorder_threshold: "10",
    initial_stock: "0",
    warehouse_id: "",
  });

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const initialStock = parseInt(formData.initial_stock) || 0;

      // Validate warehouse if initial stock is provided
      if (initialStock > 0 && !formData.warehouse_id) {
        setError("Please select a warehouse for initial stock");
        setIsSubmitting(false);
        return;
      }

      // Transform form data to match backend API structure
      // Backend expects: { name, brand, category, warehouse_id?, variants: [{ sku, cost_price, selling_price, initial_stock?, ... }] }
      const productData: Record<string, unknown> = {
        name: formData.product_name,
        brand: formData.brand || undefined,
        category: formData.category,
        description: "",
        is_active: true,
        // Create a default variant with the pricing info
        variants: [
          {
            sku: formData.sku,
            size: "Default",
            color: "Default",
            cost_price: parseFloat(formData.cost_price) || 0,
            selling_price: parseFloat(formData.selling_price) || 0,
            reorder_threshold: parseInt(formData.reorder_threshold) || 10,
            initial_stock: initialStock,
          },
        ],
      };

      // Add warehouse_id if initial stock is specified
      if (initialStock > 0 && formData.warehouse_id) {
        productData.warehouse_id = formData.warehouse_id;
      }

      // Use centralized API client which already has the correct base URL
      await api.post("/inventory/products/", productData);

      // Success
      setFormData({
        product_name: "",
        sku: "",
        barcode: "",
        category: "",
        brand: "",
        cost_price: "",
        selling_price: "",
        reorder_threshold: "10",
        initial_stock: "0",
        warehouse_id: "",
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create product";
      // Handle axios error response
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: { error?: { message?: string }; detail?: string };
          };
        };
        setError(
          axiosError.response?.data?.error?.message ||
            axiosError.response?.data?.detail ||
            errorMessage
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#C6A15B]/10">
                    <Package className="w-5 h-5 text-[#C6A15B]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#F5F6FA]">
                    Add New Product
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-[#A1A4B3]" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-[#E74C3C]/10 border border-[#E74C3C]/30 text-sm text-[#E74C3C]">
                    {error}
                  </div>
                )}

                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                    Product Name <span className="text-[#E74C3C]">*</span>
                  </label>
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Classic Cotton T-Shirt"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                  />
                </div>

                {/* SKU & Barcode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="e.g., TSH-001"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Barcode
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleInputChange}
                      placeholder="e.g., 8901234567890"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Category & Brand */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      placeholder="e.g., T-Shirts"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g., TRAP"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Cost Price <span className="text-[#E74C3C]">*</span>
                    </label>
                    <input
                      type="number"
                      name="cost_price"
                      value={formData.cost_price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Selling Price <span className="text-[#E74C3C]">*</span>
                    </label>
                    <input
                      type="number"
                      name="selling_price"
                      value={formData.selling_price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Reorder Threshold */}
                <div>
                  <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    name="reorder_threshold"
                    value={formData.reorder_threshold}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="10"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                  />
                  <p className="text-xs text-[#6F7285] mt-1">
                    Low stock alert when quantity falls below this
                  </p>
                </div>

                {/* Initial Stock Section */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <h3 className="text-sm font-medium text-[#F5F6FA] mb-3">
                    Initial Stock (Optional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Initial Quantity
                      </label>
                      <input
                        type="number"
                        name="initial_stock"
                        value={formData.initial_stock}
                        onChange={handleInputChange}
                        min="0"
                        placeholder="0"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Warehouse{" "}
                        {parseInt(formData.initial_stock) > 0 && (
                          <span className="text-[#E74C3C]">*</span>
                        )}
                      </label>
                      <select
                        name="warehouse_id"
                        value={formData.warehouse_id}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      >
                        <option value="" className="bg-[#1A1B23]">
                          Select warehouse
                        </option>
                        {warehouses?.map((wh) => (
                          <option
                            key={wh.id}
                            value={wh.id}
                            className="bg-[#1A1B23]"
                          >
                            {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-[#6F7285] mt-2">
                    Add stock when creating the product. Leave at 0 to add stock
                    later.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Product"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

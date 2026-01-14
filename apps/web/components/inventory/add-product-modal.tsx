"use client";

import * as React from "react";
import { X, Package, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
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
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/inventory/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          cost_price: parseFloat(formData.cost_price) || 0,
          selling_price: parseFloat(formData.selling_price) || 0,
          reorder_threshold: parseInt(formData.reorder_threshold) || 10,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create product");
      }

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
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
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
                  <h2 className="text-lg font-semibold text-[#F5F6FA]">Add New Product</h2>
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
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">SKU</label>
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
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">Barcode</label>
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
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">Category</label>
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
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">Brand</label>
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
                  <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">Reorder Threshold</label>
                  <input
                    type="number"
                    name="reorder_threshold"
                    value={formData.reorder_threshold}
                    onChange={handleInputChange}
                    min="0"
                    placeholder="10"
                    className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                  />
                  <p className="text-xs text-[#6F7285] mt-1">Low stock alert when quantity falls below this</p>
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

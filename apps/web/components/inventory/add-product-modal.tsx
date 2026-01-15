"use client";

import * as React from "react";
import { X, Package, Loader2, Plus, Warehouse } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useWarehouses } from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/hooks/use-inventory";

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
  const [showAddWarehouse, setShowAddWarehouse] = React.useState(false);
  const [isCreatingWarehouse, setIsCreatingWarehouse] = React.useState(false);
  const [warehouseForm, setWarehouseForm] = React.useState({
    name: "",
    code: "",
    address: "",
  });

  const queryClient = useQueryClient();

  // Fetch warehouses for initial stock
  const { data: warehouses, refetch: refetchWarehouses } = useWarehouses();

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
    // Apparel attributes
    gender: "UNISEX",
    material: "",
    season: "",
    size: "",
    color: "",
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

  const handleWarehouseInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setWarehouseForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name || !warehouseForm.code) {
      setError("Warehouse name and code are required");
      return;
    }

    setIsCreatingWarehouse(true);
    setError(null);

    try {
      const response = await api.post("/inventory/warehouses/", {
        name: warehouseForm.name,
        code: warehouseForm.code.toUpperCase(),
        address: warehouseForm.address || "",
        is_active: true,
      });

      // Refetch warehouses list
      await refetchWarehouses();
      queryClient.invalidateQueries({ queryKey: inventoryKeys.warehouses() });

      // Select the newly created warehouse
      if (response && typeof response === "object" && "id" in response) {
        setFormData((prev) => ({ ...prev, warehouse_id: (response as { id: string }).id }));
      }

      // Reset and close warehouse form
      setWarehouseForm({ name: "", code: "", address: "" });
      setShowAddWarehouse(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create warehouse";
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
      setIsCreatingWarehouse(false);
    }
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
        // Apparel attributes
        gender: formData.gender,
        material: formData.material || undefined,
        season: formData.season || undefined,
        // Create a default variant with the pricing info
        variants: [
          {
            sku: formData.sku,
            size: formData.size || "Default",
            color: formData.color || "Default",
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
        gender: "UNISEX",
        material: "",
        season: "",
        size: "",
        color: "",
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="w-full max-w-lg bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col max-h-[90vh] my-4">
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

              {/* Scrollable Form Container */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
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

                {/* Apparel Attributes Section */}
                <div className="pt-2 border-t border-white/[0.08]">
                  <h3 className="text-sm font-medium text-[#F5F6FA] mb-3">
                    Apparel Details
                  </h3>

                  {/* Gender & Material */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      >
                        <option value="UNISEX" className="bg-[#1A1B23]">
                          Unisex
                        </option>
                        <option value="MENS" className="bg-[#1A1B23]">
                          Men&apos;s
                        </option>
                        <option value="WOMENS" className="bg-[#1A1B23]">
                          Women&apos;s
                        </option>
                        <option value="KIDS" className="bg-[#1A1B23]">
                          Kids
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Material
                      </label>
                      <input
                        type="text"
                        name="material"
                        value={formData.material}
                        onChange={handleInputChange}
                        placeholder="e.g., 100% Cotton"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Size & Color */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Size
                      </label>
                      <input
                        type="text"
                        name="size"
                        value={formData.size}
                        onChange={handleInputChange}
                        placeholder="e.g., M, L, XL or 32, 34"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                        Color
                      </label>
                      <input
                        type="text"
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        placeholder="e.g., Black, Navy Blue"
                        className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Season */}
                  <div>
                    <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
                      Season / Collection
                    </label>
                    <input
                      type="text"
                      name="season"
                      value={formData.season}
                      onChange={handleInputChange}
                      placeholder="e.g., SS24, FW23, Summer 2024"
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
                      {warehouses && warehouses.length > 0 ? (
                        <select
                          name="warehouse_id"
                          value={formData.warehouse_id}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
                        >
                          <option value="" className="bg-[#1A1B23]">
                            Select warehouse
                          </option>
                          {warehouses.map((wh) => (
                            <option
                              key={wh.id}
                              value={wh.id}
                              className="bg-[#1A1B23]"
                            >
                              {wh.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#6F7285] text-sm">
                          No warehouses available
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Add Warehouse Button/Form */}
                  {!showAddWarehouse ? (
                    <button
                      type="button"
                      onClick={() => setShowAddWarehouse(true)}
                      className="flex items-center gap-2 mt-3 text-sm text-[#C6A15B] hover:text-[#D4B06A] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Warehouse
                    </button>
                  ) : (
                    <div className="mt-3 p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4 text-[#C6A15B]" />
                          <span className="text-sm font-medium text-[#F5F6FA]">New Warehouse</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddWarehouse(false);
                            setWarehouseForm({ name: "", code: "", address: "" });
                          }}
                          className="p-1 hover:bg-white/[0.05] rounded"
                        >
                          <X className="w-4 h-4 text-[#6F7285]" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-[#6F7285] mb-1">
                            Name <span className="text-[#E74C3C]">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={warehouseForm.name}
                            onChange={handleWarehouseInputChange}
                            placeholder="e.g., Main Store"
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6F7285] mb-1">
                            Code <span className="text-[#E74C3C]">*</span>
                          </label>
                          <input
                            type="text"
                            name="code"
                            value={warehouseForm.code}
                            onChange={handleWarehouseInputChange}
                            placeholder="e.g., MAIN"
                            maxLength={10}
                            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#6F7285] mb-1">
                          Address (optional)
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={warehouseForm.address}
                          onChange={handleWarehouseInputChange}
                          placeholder="e.g., 123 Main Street, City"
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateWarehouse}
                        disabled={isCreatingWarehouse || !warehouseForm.name || !warehouseForm.code}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingWarehouse ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Create Warehouse
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
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

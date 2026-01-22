"use client";

import * as React from "react";
import {
  X,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Tag,
  DollarSign,
  Barcode,
  Warehouse,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/hooks/use-inventory";
import { inventoryService, Warehouse as WarehouseType } from "@/services";

// =============================================================================
// TYPES
// =============================================================================

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProductFormData {
  // Step 1: Basic Info
  name: string;
  brand: string;
  category: string;
  gender: "MENS" | "WOMENS" | "UNISEX" | "KIDS";
  countryOfOrigin: string;
  description: string;
  // Step 2: Attributes
  sizes: string[];
  colors: string[];
  pattern: string;
  fit: string;
  material: string;
  season: string;
  // Step 3: Pricing
  costPrice: string;
  mrp: string;
  sellingPrice: string;
  // Step 4: Stock (new)
  warehouseId: string;
  initialStock: string;
  gstPercentage: string;
}

interface CreatedProduct {
  id: string;
  sku: string;
  barcodeValue: string;
  barcodeImageUrl?: string;
}

const STEPS = [
  { id: 1, title: "Basic Info", icon: Package },
  { id: 2, title: "Attributes", icon: Tag },
  { id: 3, title: "Pricing", icon: DollarSign },
  { id: 4, title: "Stock", icon: Warehouse },
  { id: 5, title: "Review", icon: Check },
];

const INITIAL_FORM_DATA: ProductFormData = {
  name: "",
  brand: "",
  category: "",
  gender: "UNISEX",
  countryOfOrigin: "",
  description: "",
  sizes: [],
  colors: [],
  pattern: "",
  fit: "",
  material: "",
  season: "",
  costPrice: "",
  mrp: "",
  sellingPrice: "",
  gstPercentage: "18",
  warehouseId: "",
  initialStock: "",
};

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const COLOR_OPTIONS = [
  "Black",
  "White",
  "Navy Blue",
  "Grey",
  "Red",
  "Green",
  "Blue",
  "Beige",
  "Brown",
  "Pink",
];

// =============================================================================
// COMPONENT
// =============================================================================

export function AddProductModal({
  isOpen,
  onClose,
  onSuccess,
}: AddProductModalProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [formData, setFormData] = React.useState<ProductFormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = React.useState<CreatedProduct | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [warehouses, setWarehouses] = React.useState<WarehouseType[]>([]);
  const [warehousesLoading, setWarehousesLoading] = React.useState(false);

  const queryClient = useQueryClient();

  // Computed margin
  const marginPercentage = React.useMemo(() => {
    const cost = parseFloat(formData.costPrice) || 0;
    const selling = parseFloat(formData.sellingPrice) || 0;
    if (cost <= 0) return 0;
    return ((selling - cost) / cost) * 100;
  }, [formData.costPrice, formData.sellingPrice]);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Fetch warehouses when modal opens
  React.useEffect(() => {
    if (isOpen && warehouses.length === 0) {
      setWarehousesLoading(true);
      inventoryService.getWarehouses()
        .then((data) => setWarehouses(data))
        .catch((err) => console.error('Failed to fetch warehouses:', err))
        .finally(() => setWarehousesLoading(false));
    }
  }, [isOpen, warehouses.length]);

  // Prevent body scroll
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

  // Reset on close
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCurrentStep(1);
        setFormData(INITIAL_FORM_DATA);
        setError(null);
        setCreatedProduct(null);
        setFieldErrors({});
      }, 300);
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleArrayValue = (field: "sizes" | "colors", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) errors.name = "Product name is required";
      if (!formData.brand.trim()) errors.brand = "Brand is required";
      if (!formData.category.trim()) errors.category = "Category is required";
    }

    if (step === 3) {
      if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) {
        errors.costPrice = "Cost price must be greater than 0";
      }
      if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
        errors.sellingPrice = "Selling price must be greater than 0";
      }
      if (!formData.mrp || parseFloat(formData.mrp) <= 0) {
        errors.mrp = "MRP must be greater than 0";
      }
      if (
        parseFloat(formData.sellingPrice) > parseFloat(formData.mrp)
      ) {
        errors.sellingPrice = "Selling price cannot exceed MRP";
      }
    }

    // Step 4: Stock validation
    if (step === 4) {
      const stock = parseInt(formData.initialStock) || 0;
      if (stock > 0 && !formData.warehouseId) {
        errors.warehouseId = "Please select a warehouse for initial stock";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      setCurrentStep(3);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build attributes object
      const attributes: Record<string, string | string[]> = {};
      if (formData.sizes.length > 0) attributes.sizes = formData.sizes;
      if (formData.colors.length > 0) attributes.colors = formData.colors;
      if (formData.pattern) attributes.pattern = formData.pattern;
      if (formData.fit) attributes.fit = formData.fit;

      const productData = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        description: formData.description || "",
        country_of_origin: formData.countryOfOrigin || "",
        gender: formData.gender,
        material: formData.material || "",
        season: formData.season || "",
        attributes,
        is_active: true,
        // Pricing - will be handled by backend ProductPricing model
        pricing: {
          cost_price: formData.costPrice,
          mrp: formData.mrp,
          selling_price: formData.sellingPrice,
          gst_percentage: formData.gstPercentage || "0",
        },
        // Stock - warehouse and initial quantity
        ...(formData.warehouseId && parseInt(formData.initialStock) > 0 && {
          warehouse_id: formData.warehouseId,
          variants: [{
            size: formData.sizes[0] || null,
            color: formData.colors[0] || null,
            initial_stock: parseInt(formData.initialStock),
          }],
        }),
      };

      const response = await api.post("/inventory/products/", productData);

      if (response && typeof response === "object") {
        const product = response as CreatedProduct;
        setCreatedProduct({
          id: product.id,
          sku: product.sku,
          barcodeValue: product.barcodeValue,
          barcodeImageUrl: product.barcodeImageUrl,
        });
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });

      onSuccess?.();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create product";
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as {
          response?: {
            data?: { error?: { message?: string }; detail?: string; [key: string]: unknown };
          };
        };
        const data = axiosError.response?.data;
        if (data) {
          // Handle field-level errors
          const fieldErrs: Record<string, string> = {};
          Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              fieldErrs[key] = value.join(", ");
            }
          });
          if (Object.keys(fieldErrs).length > 0) {
            setFieldErrors(fieldErrs);
          }
          setError(
            data.error?.message ||
              data.detail ||
              errorMessage
          );
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (createdProduct) {
      onClose();
    } else {
      onClose();
    }
  };

  // -------------------------------------------------------------------------
  // RENDER STEPS
  // -------------------------------------------------------------------------

  const renderStepContent = () => {
    // Show success view after creation
    if (createdProduct) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#2ECC71]/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-[#2ECC71]" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">
              Product Created Successfully!
            </h3>
            <p className="text-[#A1A4B3]">
              Your product has been added to the inventory.
            </p>
          </div>

          {/* SKU and Barcode Display */}
          <div className="w-full max-w-sm space-y-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div>
              <p className="text-xs text-[#6F7285] uppercase tracking-wide mb-1">
                Generated SKU
              </p>
              <p className="text-lg font-mono font-semibold text-[#C6A15B]">
                {createdProduct.sku}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6F7285] uppercase tracking-wide mb-1">
                Barcode
              </p>
              <p className="text-sm font-mono text-[#F5F6FA] mb-2">
                {createdProduct.barcodeValue}
              </p>
              {createdProduct.barcodeImageUrl && (
                <div className="p-3 bg-white rounded-lg">
                  <img
                    src={createdProduct.barcodeImageUrl}
                    alt="Barcode"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors"
          >
            Done
          </button>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return <StepBasicInfo formData={formData} onChange={handleInputChange} errors={fieldErrors} />;
      case 2:
        return (
          <StepAttributes
            formData={formData}
            onChange={handleInputChange}
            onToggleSize={(size) => toggleArrayValue("sizes", size)}
            onToggleColor={(color) => toggleArrayValue("colors", color)}
          />
        );
      case 3:
        return (
          <StepPricing
            formData={formData}
            onChange={handleInputChange}
            marginPercentage={marginPercentage}
            errors={fieldErrors}
          />
        );
      case 4:
        return (
          <StepStock
            formData={formData}
            onChange={handleInputChange}
            warehouses={warehouses}
            warehousesLoading={warehousesLoading}
            errors={fieldErrors}
          />
        );
      case 5:
        return <StepReview formData={formData} marginPercentage={marginPercentage} warehouses={warehouses} />;
      default:
        return null;
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
            onClick={handleClose}
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
            <div className="w-full max-w-2xl bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col max-h-[90vh] my-4">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#C6A15B]/10">
                    <Package className="w-5 h-5 text-[#C6A15B]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#F5F6FA]">
                      {createdProduct ? "Product Created" : "Add New Product"}
                    </h2>
                    {!createdProduct && (
                      <p className="text-xs text-[#6F7285]">
                        Step {currentStep} of {STEPS.length}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-[#A1A4B3]" />
                </button>
              </div>

              {/* Step Indicators */}
              {!createdProduct && (
                <div className="px-5 pt-4 pb-2">
                  <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                      <React.Fragment key={step.id}>
                        <div
                          className={`flex items-center gap-2 ${
                            currentStep >= step.id
                              ? "text-[#C6A15B]"
                              : "text-[#6F7285]"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                              currentStep > step.id
                                ? "bg-[#C6A15B] text-[#0E0F13]"
                                : currentStep === step.id
                                ? "bg-[#C6A15B]/20 text-[#C6A15B] border border-[#C6A15B]"
                                : "bg-white/[0.05] text-[#6F7285]"
                            }`}
                          >
                            {currentStep > step.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              step.id
                            )}
                          </div>
                          <span className="hidden sm:block text-sm font-medium">
                            {step.title}
                          </span>
                        </div>
                        {index < STEPS.length - 1 && (
                          <div
                            className={`flex-1 h-px mx-2 ${
                              currentStep > step.id
                                ? "bg-[#C6A15B]"
                                : "bg-white/[0.08]"
                            }`}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-[#E74C3C]/10 border border-[#E74C3C]/30 text-sm text-[#E74C3C]">
                    {error}
                  </div>
                )}
                {renderStepContent()}
              </div>

              {/* Footer Actions */}
              {!createdProduct && (
                <div className="flex items-center justify-between p-5 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={currentStep === 1 ? handleClose : handleBack}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                  >
                    {currentStep === 1 ? (
                      "Cancel"
                    ) : (
                      <>
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </>
                    )}
                  </button>
                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Create Product
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function StepBasicInfo({
  formData,
  onChange,
  errors,
}: {
  formData: ProductFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      {/* Product Name */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
          Product Name <span className="text-[#E74C3C]">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder="e.g., Classic Cotton Polo"
          className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
            errors.name ? "border-[#E74C3C]" : "border-white/[0.08]"
          }`}
        />
        {errors.name && (
          <p className="text-xs text-[#E74C3C] mt-1">{errors.name}</p>
        )}
      </div>

      {/* Brand & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Brand <span className="text-[#E74C3C]">*</span>
          </label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={onChange}
            placeholder="e.g., TRAP"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.brand ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          />
          {errors.brand && (
            <p className="text-xs text-[#E74C3C] mt-1">{errors.brand}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Category <span className="text-[#E74C3C]">*</span>
          </label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={onChange}
            placeholder="e.g., Polo Shirts"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.category ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          />
          {errors.category && (
            <p className="text-xs text-[#E74C3C] mt-1">{errors.category}</p>
          )}
        </div>
      </div>

      {/* Gender & Country */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Gender
          </label>
          <select
            name="gender"
            value={formData.gender}
            onChange={onChange}
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          >
            <option value="UNISEX" className="bg-[#1A1B23]">Unisex</option>
            <option value="MENS" className="bg-[#1A1B23]">Men&apos;s</option>
            <option value="WOMENS" className="bg-[#1A1B23]">Women&apos;s</option>
            <option value="KIDS" className="bg-[#1A1B23]">Kids</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Country of Origin
          </label>
          <input
            type="text"
            name="countryOfOrigin"
            value={formData.countryOfOrigin}
            onChange={onChange}
            placeholder="e.g., India"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onChange}
          placeholder="Product description..."
          rows={3}
          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent resize-none"
        />
      </div>
    </div>
  );
}

function StepAttributes({
  formData,
  onChange,
  onToggleSize,
  onToggleColor,
}: {
  formData: ProductFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onToggleSize: (size: string) => void;
  onToggleColor: (color: string) => void;
}) {
  return (
    <div className="space-y-5">
      {/* Sizes */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
          Available Sizes
        </label>
        <div className="flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onToggleSize(size)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.sizes.includes(size)
                  ? "bg-[#C6A15B] text-[#0E0F13]"
                  : "bg-white/[0.05] border border-white/[0.08] text-[#A1A4B3] hover:bg-white/[0.08]"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
          Available Colors
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onToggleColor(color)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.colors.includes(color)
                  ? "bg-[#C6A15B] text-[#0E0F13]"
                  : "bg-white/[0.05] border border-white/[0.08] text-[#A1A4B3] hover:bg-white/[0.08]"
              }`}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern & Fit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Pattern
          </label>
          <input
            type="text"
            name="pattern"
            value={formData.pattern}
            onChange={onChange}
            placeholder="e.g., Solid, Striped"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Fit
          </label>
          <input
            type="text"
            name="fit"
            value={formData.fit}
            onChange={onChange}
            placeholder="e.g., Regular, Slim"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>
      </div>

      {/* Material & Season */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Material
          </label>
          <input
            type="text"
            name="material"
            value={formData.material}
            onChange={onChange}
            placeholder="e.g., 100% Cotton"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Season / Collection
          </label>
          <input
            type="text"
            name="season"
            value={formData.season}
            onChange={onChange}
            placeholder="e.g., SS24, FW23"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}

function StepPricing({
  formData,
  onChange,
  marginPercentage,
  errors,
}: {
  formData: ProductFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  marginPercentage: number;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#6F7285]">
        Set pricing for this product. Margin is calculated automatically.
      </p>

      {/* Cost & MRP */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Cost Price (₹) <span className="text-[#E74C3C]">*</span>
          </label>
          <input
            type="number"
            name="costPrice"
            value={formData.costPrice}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.costPrice ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          />
          {errors.costPrice && (
            <p className="text-xs text-[#E74C3C] mt-1">{errors.costPrice}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            MRP (₹) <span className="text-[#E74C3C]">*</span>
          </label>
          <input
            type="number"
            name="mrp"
            value={formData.mrp}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.mrp ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          />
          {errors.mrp && (
            <p className="text-xs text-[#E74C3C] mt-1">{errors.mrp}</p>
          )}
        </div>
      </div>

      {/* Selling Price & GST */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            Selling Price (₹) <span className="text-[#E74C3C]">*</span>
          </label>
          <input
            type="number"
            name="sellingPrice"
            value={formData.sellingPrice}
            onChange={onChange}
            min="0"
            step="0.01"
            placeholder="0.00"
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.sellingPrice ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          />
          {errors.sellingPrice && (
            <p className="text-xs text-[#E74C3C] mt-1">{errors.sellingPrice}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
            GST %
          </label>
          <select
            name="gstPercentage"
            value={formData.gstPercentage}
            onChange={onChange}
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          >
            <option value="0" className="bg-[#1A1B23]">0%</option>
            <option value="5" className="bg-[#1A1B23]">5%</option>
            <option value="12" className="bg-[#1A1B23]">12%</option>
            <option value="18" className="bg-[#1A1B23]">18%</option>
            <option value="28" className="bg-[#1A1B23]">28%</option>
          </select>
        </div>
      </div>

      {/* Margin Preview */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#A1A4B3]">Profit Margin</span>
          <span
            className={`text-xl font-bold ${
              marginPercentage >= 30
                ? "text-[#2ECC71]"
                : marginPercentage >= 15
                ? "text-[#F5A623]"
                : marginPercentage > 0
                ? "text-[#E74C3C]"
                : "text-[#6F7285]"
            }`}
          >
            {marginPercentage.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-[#6F7285] mt-1">
          Profit per unit: ₹
          {(
            (parseFloat(formData.sellingPrice) || 0) -
            (parseFloat(formData.costPrice) || 0)
          ).toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function StepStock({
  formData,
  onChange,
  warehouses,
  warehousesLoading,
  errors,
}: {
  formData: ProductFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  warehouses: WarehouseType[];
  warehousesLoading: boolean;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-[#6F7285]">
        Add initial stock for this product. This step is optional - you can add stock later.
      </p>

      {/* Warehouse Selection */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
          Warehouse
        </label>
        {warehousesLoading ? (
          <div className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#6F7285]">
            Loading warehouses...
          </div>
        ) : (
          <select
            name="warehouseId"
            value={formData.warehouseId}
            onChange={onChange}
            className={`w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent ${
              errors.warehouseId ? "border-[#E74C3C]" : "border-white/[0.08]"
            }`}
          >
            <option value="" className="bg-[#1A1B23]">Select warehouse (optional)</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id} className="bg-[#1A1B23]">
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>
        )}
        {errors.warehouseId && (
          <p className="text-xs text-[#E74C3C] mt-1">{errors.warehouseId}</p>
        )}
      </div>

      {/* Initial Stock */}
      <div>
        <label className="block text-sm font-medium text-[#A1A4B3] mb-1.5">
          Initial Stock Quantity
        </label>
        <input
          type="number"
          name="initialStock"
          value={formData.initialStock}
          onChange={onChange}
          min="0"
          placeholder="0"
          className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
        />
        <p className="text-xs text-[#6F7285] mt-1.5">
          This will create an initial inventory record. Leave at 0 to skip.
        </p>
      </div>

      {/* Stock Preview */}
      {parseInt(formData.initialStock) > 0 && formData.warehouseId && (
        <div className="p-4 rounded-xl bg-[#2ECC71]/10 border border-[#2ECC71]/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#2ECC71]">✓</span>
            <span className="text-sm text-[#2ECC71]">
              {formData.initialStock} units will be added to{" "}
              {warehouses.find((w) => w.id === formData.warehouseId)?.name || "warehouse"}
            </span>
          </div>
        </div>
      )}

      {/* No Stock Note */}
      {(!formData.initialStock || parseInt(formData.initialStock) === 0) && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]">
          <p className="text-sm text-[#6F7285]">
            Tip: You can add stock anytime later via the Inventory or Stock Management pages.
          </p>
        </div>
      )}
    </div>
  );
}

function StepReview({
  formData,
  marginPercentage,
  warehouses,
}: {
  formData: ProductFormData;
  marginPercentage: number;
  warehouses?: WarehouseType[];
}) {
  const selectedWarehouse = warehouses?.find((w) => w.id === formData.warehouseId);
  const hasStock = parseInt(formData.initialStock) > 0 && selectedWarehouse;

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#6F7285]">
        Review your product details before creating.
      </p>

      {/* Basic Info */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <h4 className="text-sm font-medium text-[#C6A15B] mb-3">Basic Information</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[#6F7285]">Name</p>
            <p className="text-[#F5F6FA] font-medium">{formData.name || "-"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">Brand</p>
            <p className="text-[#F5F6FA] font-medium">{formData.brand || "-"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">Category</p>
            <p className="text-[#F5F6FA] font-medium">{formData.category || "-"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">Gender</p>
            <p className="text-[#F5F6FA] font-medium">{formData.gender}</p>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <h4 className="text-sm font-medium text-[#C6A15B] mb-3">Attributes</h4>
        <div className="space-y-2 text-sm">
          {formData.sizes.length > 0 && (
            <div className="flex gap-2">
              <span className="text-[#6F7285]">Sizes:</span>
              <span className="text-[#F5F6FA]">{formData.sizes.join(", ")}</span>
            </div>
          )}
          {formData.colors.length > 0 && (
            <div className="flex gap-2">
              <span className="text-[#6F7285]">Colors:</span>
              <span className="text-[#F5F6FA]">{formData.colors.join(", ")}</span>
            </div>
          )}
          {formData.material && (
            <div className="flex gap-2">
              <span className="text-[#6F7285]">Material:</span>
              <span className="text-[#F5F6FA]">{formData.material}</span>
            </div>
          )}
          {formData.pattern && (
            <div className="flex gap-2">
              <span className="text-[#6F7285]">Pattern:</span>
              <span className="text-[#F5F6FA]">{formData.pattern}</span>
            </div>
          )}
          {!formData.sizes.length && !formData.colors.length && !formData.material && !formData.pattern && (
            <p className="text-[#6F7285]">No attributes specified</p>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <h4 className="text-sm font-medium text-[#C6A15B] mb-3">Pricing</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[#6F7285]">Cost Price</p>
            <p className="text-[#F5F6FA] font-medium">₹{formData.costPrice || "0"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">MRP</p>
            <p className="text-[#F5F6FA] font-medium">₹{formData.mrp || "0"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">Selling Price</p>
            <p className="text-[#F5F6FA] font-medium">₹{formData.sellingPrice || "0"}</p>
          </div>
          <div>
            <p className="text-[#6F7285]">Margin</p>
            <p
              className={`font-bold ${
                marginPercentage >= 30
                  ? "text-[#2ECC71]"
                  : marginPercentage >= 15
                  ? "text-[#F5A623]"
                  : "text-[#E74C3C]"
              }`}
            >
              {marginPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Stock Info */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <h4 className="text-sm font-medium text-[#C6A15B] mb-3">Initial Stock</h4>
        {hasStock ? (
          <div className="text-sm">
            <div className="flex gap-2">
              <span className="text-[#6F7285]">Quantity:</span>
              <span className="text-[#2ECC71] font-medium">{formData.initialStock} units</span>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="text-[#6F7285]">Warehouse:</span>
              <span className="text-[#F5F6FA]">{selectedWarehouse.name}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6F7285]">No initial stock (can be added later)</p>
        )}
      </div>

      {/* SKU Note */}
      <div className="p-3 rounded-lg bg-[#C6A15B]/10 border border-[#C6A15B]/30">
        <p className="text-sm text-[#C6A15B]">
          <Barcode className="w-4 h-4 inline-block mr-2" />
          SKU and barcode will be auto-generated after creation.
        </p>
      </div>
    </div>
  );
}


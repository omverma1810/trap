"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  FileText,
  RotateCcw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "./cart-context";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";

// Local format helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Checkout request type
interface CheckoutRequest {
  idempotency_key: string;
  warehouse_id: string;
  items: { barcode: string; quantity: number }[];
  payments: { method: string; amount: string }[];
  discount_type?: string | null;
  discount_value?: string;
  customer_name?: string;
}

// Checkout response type
interface CheckoutResponse {
  success: boolean;
  sale_id: string;
  invoice_number: string;
  subtotal: string;
  discount_type?: string;
  discount_value?: string;
  discount_amount?: string;
  total_gst?: string;
  total: string;
  total_items: number;
  status: string;
  message: string;
  invoice_id?: string;
  pdf_url?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: "cash" | "card";
  warehouseId?: string;
}

export function CheckoutModal({
  isOpen,
  onClose,
  paymentMethod,
  warehouseId,
}: CheckoutModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, itemCount, total, discount, appliedDiscount, clearCart } =
    useCart();

  const [checkoutResult, setCheckoutResult] =
    React.useState<CheckoutResponse | null>(null);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      return api.post<CheckoutResponse>("/sales/checkout/", data);
    },
    onSuccess: (result) => {
      setCheckoutResult(result);
      setCheckoutError(null);
      // Invalidate relevant queries to refresh stock data
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      const message =
        error.response?.data?.error || error.message || "Checkout failed";
      setCheckoutError(message);
      setCheckoutResult(null);
    },
  });

  // Trigger checkout when modal opens
  React.useEffect(() => {
    if (
      isOpen &&
      items.length > 0 &&
      !checkoutMutation.isPending &&
      !checkoutResult
    ) {
      // Build checkout request
      const request: CheckoutRequest = {
        idempotency_key: uuidv4(),
        warehouse_id: warehouseId || "00000000-0000-0000-0000-000000000001", // Default warehouse
        items: items.map((item) => ({
          barcode: item.product.barcode,
          quantity: item.quantity,
        })),
        payments: [
          {
            method: paymentMethod.toUpperCase(),
            amount: total.toFixed(2),
          },
        ],
        customer_name: "",
      };

      // Add discount if applied
      if (appliedDiscount && discount > 0) {
        request.discount_type = appliedDiscount.type;
        request.discount_value = appliedDiscount.value.toString();
      }

      checkoutMutation.mutate(request);
    }
  }, [
    isOpen,
    items,
    paymentMethod,
    warehouseId,
    total,
    appliedDiscount,
    discount,
    checkoutMutation,
    checkoutResult,
  ]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setCheckoutResult(null);
      setCheckoutError(null);
    }
  }, [isOpen]);

  const handleNewSale = () => {
    clearCart();
    onClose();
    setCheckoutResult(null);
    setCheckoutError(null);
  };

  const handleViewInvoice = () => {
    if (checkoutResult?.sale_id) {
      router.push(`/invoices?sale_id=${checkoutResult.sale_id}`);
    } else {
      router.push("/invoices");
    }
    clearCart();
    onClose();
    setCheckoutResult(null);
    setCheckoutError(null);
  };

  const handleRetry = () => {
    setCheckoutError(null);
    setCheckoutResult(null);
  };

  // Determine stage based on state
  let stage: "processing" | "success" | "error" = "processing";
  if (checkoutResult?.success) {
    stage = "success";
  } else if (checkoutError) {
    stage = "error";
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={
              stage === "success" || stage === "error"
                ? handleNewSale
                : undefined
            }
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="bg-[#1A1B23] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
              {stage === "processing" ? (
                <ProcessingView />
              ) : stage === "error" ? (
                <ErrorView
                  error={checkoutError || "Unknown error"}
                  onRetry={handleRetry}
                  onClose={handleNewSale}
                />
              ) : (
                <SuccessView
                  itemCount={checkoutResult?.total_items || itemCount}
                  total={parseFloat(checkoutResult?.total || total.toString())}
                  paymentMethod={paymentMethod}
                  invoiceNumber={checkoutResult?.invoice_number}
                  pdfUrl={checkoutResult?.pdf_url}
                  onNewSale={handleNewSale}
                  onViewInvoice={handleViewInvoice}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ProcessingView() {
  return (
    <div className="p-8 text-center">
      {/* Spinner */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <Loader2 className="w-20 h-20 text-[#C6A15B] animate-spin" />
      </div>
      <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">
        Processing Payment
      </h3>
      <p className="text-[#A1A4B3]">Please wait...</p>
    </div>
  );
}

function ErrorView({
  error,
  onRetry,
  onClose,
}: {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-8">
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#E74C3C]/20 flex items-center justify-center"
      >
        <AlertCircle className="w-10 h-10 text-[#E74C3C]" />
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <h3 className="text-2xl font-bold text-[#F5F6FA] mb-2">
          Checkout Failed
        </h3>
        <p className="text-[#E74C3C] text-sm">{error}</p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        <button
          onClick={onClose}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Retry
        </button>
      </motion.div>
    </div>
  );
}

function SuccessView({
  itemCount,
  total,
  paymentMethod,
  invoiceNumber,
  pdfUrl,
  onNewSale,
  onViewInvoice,
}: {
  itemCount: number;
  total: number;
  paymentMethod: "cash" | "card";
  invoiceNumber?: string;
  pdfUrl?: string | null;
  onNewSale: () => void;
  onViewInvoice: () => void;
}) {
  const handlePrintInvoice = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  return (
    <div className="p-8">
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#2ECC71]/20 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.2,
          }}
        >
          <CheckCircle className="w-10 h-10 text-[#2ECC71]" />
        </motion.div>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center mb-8"
      >
        <h3 className="text-2xl font-bold text-[#F5F6FA] mb-2">
          Payment Successful!
        </h3>
        <p className="text-[#A1A4B3]">Transaction completed</p>
        {invoiceNumber && (
          <p className="text-[#C6A15B] text-sm mt-1">
            Invoice: {invoiceNumber}
          </p>
        )}
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/[0.03] rounded-xl p-4 mb-6 space-y-3"
      >
        <div className="flex justify-between text-sm">
          <span className="text-[#A1A4B3]">Items</span>
          <span className="text-[#F5F6FA] font-medium">{itemCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#A1A4B3]">Payment</span>
          <span className="text-[#F5F6FA] font-medium capitalize">
            {paymentMethod}
          </span>
        </div>
        <div className="h-px bg-white/[0.08]" />
        <div className="flex justify-between">
          <span className="text-[#A1A4B3]">Total Paid</span>
          <span className="text-xl font-bold text-[#C6A15B] tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-3"
      >
        {pdfUrl && (
          <button
            onClick={handlePrintInvoice}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
          >
            <FileText className="w-5 h-5" />
            Print Invoice
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onViewInvoice}
            className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
          >
            <FileText className="w-5 h-5" />
            View Invoice
          </button>
          <button
            onClick={onNewSale}
            className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            New Sale
          </button>
        </div>
      </motion.div>
    </div>
  );
}

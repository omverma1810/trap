"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, FileText, RotateCcw } from "lucide-react";
import { useCart } from "./cart-context";

// Local format helper
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: "cash" | "card";
  saleId?: string | number;
}

export function CheckoutModal({ isOpen, onClose, paymentMethod, saleId }: CheckoutModalProps) {
  const router = useRouter();
  const { itemCount, total, clearCart } = useCart();
  const [stage, setStage] = React.useState<"processing" | "success">("processing");

  React.useEffect(() => {
    if (isOpen) {
      setStage("processing");
      // Simulate processing
      const timer = setTimeout(() => setStage("success"), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleNewSale = () => {
    clearCart();
    onClose();
  };

  const handleViewInvoice = () => {
    if (saleId) {
      router.push(`/invoices/${saleId}`);
    } else {
      // If no sale ID, just go to invoices list
      router.push("/invoices");
    }
    clearCart();
    onClose();
  };

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
            onClick={stage === "success" ? handleNewSale : undefined}
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
              ) : (
                <SuccessView
                  itemCount={itemCount}
                  total={total}
                  paymentMethod={paymentMethod}
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#C6A15B]"
        />
        <div className="absolute inset-2 rounded-full bg-[#C6A15B]/10" />
      </div>
      <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">Processing Payment</h3>
      <p className="text-[#A1A4B3]">Please wait...</p>
    </div>
  );
}

function SuccessView({
  itemCount,
  total,
  paymentMethod,
  onNewSale,
  onViewInvoice,
}: {
  itemCount: number;
  total: number;
  paymentMethod: "cash" | "card";
  onNewSale: () => void;
  onViewInvoice: () => void;
}) {
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
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
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
        <h3 className="text-2xl font-bold text-[#F5F6FA] mb-2">Payment Successful!</h3>
        <p className="text-[#A1A4B3]">Transaction completed</p>
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
          <span className="text-[#F5F6FA] font-medium capitalize">{paymentMethod}</span>
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
        className="grid grid-cols-2 gap-3"
      >
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
      </motion.div>
    </div>
  );
}

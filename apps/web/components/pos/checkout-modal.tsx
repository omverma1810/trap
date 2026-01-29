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
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCart } from "./cart-context";
import { api } from "@/lib/api";
import { v4 as uuidv4 } from "uuid";

// =============================================================================
// TYPES
// =============================================================================

type PaymentMethod = "CASH" | "CARD" | "UPI" | "CREDIT";

interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: string;
}

interface CustomerDetails {
  name: string;
  mobile: string;
  email: string;
  address: string;
}

interface CheckoutRequest {
  idempotency_key: string;
  warehouse_id: string;
  items: { barcode: string; quantity: number }[];
  payments: { method: string; amount: string }[];
  discount_type?: string | null;
  discount_value?: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  customer_address?: string;
}

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
  is_credit_sale?: boolean;
  credit_balance?: string;
  invoice_id?: string;
  pdf_url?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { key: "CASH", label: "Cash", icon: Banknote, color: "#2ECC71" },
  { key: "CARD", label: "Card", icon: CreditCard, color: "#3498DB" },
  { key: "UPI", label: "UPI", icon: Smartphone, color: "#9B59B6" },
  { key: "CREDIT", label: "Credit", icon: Clock, color: "#E67E22" },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CheckoutModal({
  isOpen,
  onClose,
  warehouseId,
}: CheckoutModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, itemCount, total, discount, appliedDiscount, clearCart } = useCart();

  // State
  const [step, setStep] = React.useState<"customer" | "payment" | "processing" | "success" | "error">("customer");
  const [customerDetails, setCustomerDetails] = React.useState<CustomerDetails>({
    name: "",
    mobile: "",
    email: "",
    address: "",
  });
  const [payments, setPayments] = React.useState<PaymentEntry[]>([]);
  const [checkoutResult, setCheckoutResult] = React.useState<CheckoutResponse | null>(null);
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);

  // Calculate totals
  const paidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remainingAmount = total - paidAmount;
  const hasCredit = payments.some(p => p.method === "CREDIT");

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutRequest) => {
      return api.post<CheckoutResponse>("/sales/checkout/", data);
    },
    onSuccess: (result) => {
      setCheckoutResult(result);
      setCheckoutError(null);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      const message = error.response?.data?.error || error.message || "Checkout failed";
      setCheckoutError(message);
      setStep("error");
    },
  });

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setStep("customer");
      setCustomerDetails({ name: "", mobile: "", email: "", address: "" });
      setPayments([]);
      setCheckoutResult(null);
      setCheckoutError(null);
    }
  }, [isOpen]);

  // Handlers
  const handleCustomerChange = (field: keyof CustomerDetails, value: string) => {
    setCustomerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPayment = (method: PaymentMethod) => {
    // For single payment, set full amount
    const amount = payments.length === 0 ? total.toFixed(2) : remainingAmount.toFixed(2);
    setPayments(prev => [...prev, { id: uuidv4(), method, amount }]);
  };

  const handleRemovePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handlePaymentAmountChange = (id: string, amount: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, amount } : p));
  };

  const handleProceedToPayment = () => {
    setStep("payment");
  };

  const handleProceedToCheckout = () => {
    if (!warehouseId) {
      setCheckoutError("Please select a warehouse before checkout");
      setStep("error");
      return;
    }

    if (Math.abs(remainingAmount) > 0.01 && !hasCredit) {
      setCheckoutError("Payment amount does not match total");
      return;
    }

    setStep("processing");

    const request: CheckoutRequest = {
      idempotency_key: uuidv4(),
      warehouse_id: warehouseId,
      items: items.map((item) => ({
        barcode: item.product.barcode,
        quantity: item.quantity,
      })),
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount,
      })),
      customer_name: customerDetails.name,
      customer_mobile: customerDetails.mobile,
      customer_email: customerDetails.email,
      customer_address: customerDetails.address,
    };

    if (appliedDiscount && discount > 0) {
      request.discount_type = appliedDiscount.type;
      request.discount_value = appliedDiscount.value.toString();
    }

    checkoutMutation.mutate(request);
  };

  const handleNewSale = () => {
    clearCart();
    onClose();
  };

  const handleViewInvoice = () => {
    if (checkoutResult?.sale_id) {
      router.push(`/invoices?sale_id=${checkoutResult.sale_id}`);
    } else {
      router.push("/invoices");
    }
    clearCart();
    onClose();
  };

  const handleRetry = () => {
    setStep("payment");
    setCheckoutError(null);
  };

  const handleBack = () => {
    if (step === "payment") setStep("customer");
  };

  // Render
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={step === "success" || step === "error" ? handleNewSale : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative z-10 w-full max-w-lg mx-4"
          >
            <div className="bg-[#1A1B23] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              {(step === "customer" || step === "payment") && (
                <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
                  <div>
                    <h2 className="text-lg font-semibold text-[#F5F6FA]">Checkout</h2>
                    <p className="text-sm text-[#6F7285]">
                      {step === "customer" ? "Step 1: Customer Details" : "Step 2: Payment"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-[#6F7285]">Total</p>
                      <p className="text-lg font-bold text-[#C6A15B]">{formatCurrency(total)}</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                      <X className="w-5 h-5 text-[#6F7285]" />
                    </button>
                  </div>
                </div>
              )}

              {/* Content */}
              {step === "customer" && (
                <CustomerStep
                  details={customerDetails}
                  onChange={handleCustomerChange}
                  onProceed={handleProceedToPayment}
                  itemCount={itemCount}
                />
              )}

              {step === "payment" && (
                <PaymentStep
                  total={total}
                  payments={payments}
                  paidAmount={paidAmount}
                  remainingAmount={remainingAmount}
                  onAddPayment={handleAddPayment}
                  onRemovePayment={handleRemovePayment}
                  onAmountChange={handlePaymentAmountChange}
                  onBack={handleBack}
                  onProceed={handleProceedToCheckout}
                  hasCredit={hasCredit}
                />
              )}

              {step === "processing" && <ProcessingView />}

              {step === "error" && (
                <ErrorView
                  error={checkoutError || "Unknown error"}
                  onRetry={handleRetry}
                  onClose={handleNewSale}
                />
              )}

              {step === "success" && (
                <SuccessView
                  result={checkoutResult}
                  itemCount={itemCount}
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

// =============================================================================
// STEP COMPONENTS
// =============================================================================

function CustomerStep({
  details,
  onChange,
  onProceed,
  itemCount,
}: {
  details: CustomerDetails;
  onChange: (field: keyof CustomerDetails, value: string) => void;
  onProceed: () => void;
  itemCount: number;
}) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-sm text-[#A1A4B3] mb-1">
          {itemCount} item{itemCount !== 1 ? "s" : ""} in cart
        </p>
        <p className="text-xs text-[#6F7285]">
          Customer details are optional but recommended for marketing.
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#A1A4B3] mb-1.5">
            <User className="w-4 h-4" />
            Customer Name
          </label>
          <input
            type="text"
            value={details.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Enter customer name"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#A1A4B3] mb-1.5">
            <Phone className="w-4 h-4" />
            Mobile Number
          </label>
          <input
            type="tel"
            value={details.mobile}
            onChange={(e) => onChange("mobile", e.target.value)}
            placeholder="10-digit mobile number"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#A1A4B3] mb-1.5">
            <Mail className="w-4 h-4" />
            Email
          </label>
          <input
            type="email"
            value={details.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="customer@email.com"
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent"
          />
        </div>

        {/* Address */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[#A1A4B3] mb-1.5">
            <MapPin className="w-4 h-4" />
            Address
          </label>
          <textarea
            value={details.address}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Delivery/billing address"
            rows={2}
            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Proceed Button */}
      <button
        onClick={onProceed}
        className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-semibold hover:bg-[#D4B06A] transition-colors"
      >
        Continue to Payment
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function PaymentStep({
  total,
  payments,
  paidAmount,
  remainingAmount,
  onAddPayment,
  onRemovePayment,
  onAmountChange,
  onBack,
  onProceed,
  hasCredit,
}: {
  total: number;
  payments: PaymentEntry[];
  paidAmount: number;
  remainingAmount: number;
  onAddPayment: (method: PaymentMethod) => void;
  onRemovePayment: (id: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onBack: () => void;
  onProceed: () => void;
  hasCredit: boolean;
}) {
  const canProceed = payments.length > 0 && (Math.abs(remainingAmount) < 0.01 || hasCredit);

  return (
    <div className="p-6">
      {/* Payment Methods */}
      <div className="mb-6">
        <p className="text-sm font-medium text-[#A1A4B3] mb-3">Select Payment Method</p>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => onAddPayment(key)}
              disabled={remainingAmount <= 0 && !hasCredit}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon className="w-6 h-6" style={{ color }} />
              <span className="text-xs text-[#A1A4B3]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Added Payments */}
      {payments.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-medium text-[#A1A4B3] mb-2">Payment Breakdown</p>
          {payments.map((payment) => {
            const methodInfo = PAYMENT_METHODS.find(m => m.key === payment.method);
            const Icon = methodInfo?.icon || Banknote;
            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.08]"
              >
                <Icon className="w-5 h-5" style={{ color: methodInfo?.color }} />
                <span className="text-sm text-[#F5F6FA] flex-1">{methodInfo?.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[#6F7285]">₹</span>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => onAmountChange(payment.id, e.target.value)}
                    className="w-24 px-2 py-1 rounded bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] text-right focus:outline-none focus:ring-1 focus:ring-[#C6A15B]"
                  />
                  <button
                    onClick={() => onRemovePayment(payment.id)}
                    className="p-1 rounded hover:bg-white/[0.08] transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-[#E74C3C]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="p-4 rounded-lg bg-white/[0.03] border border-white/[0.08] mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#A1A4B3]">Total Amount</span>
          <span className="text-[#F5F6FA] font-medium">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[#A1A4B3]">Paid</span>
          <span className="text-[#2ECC71] font-medium">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="h-px bg-white/[0.08] my-2" />
        <div className="flex justify-between">
          <span className="text-[#A1A4B3]">Remaining</span>
          <span className={`font-bold ${remainingAmount > 0 ? "text-[#E74C3C]" : "text-[#2ECC71]"}`}>
            {formatCurrency(Math.max(0, remainingAmount))}
          </span>
        </div>
        {hasCredit && remainingAmount > 0 && (
          <p className="text-xs text-[#E67E22] mt-2">
            ₹{remainingAmount.toFixed(2)} will be marked as credit (pay later)
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
        >
          Back
        </button>
        <button
          onClick={onProceed}
          disabled={!canProceed}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-semibold hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Complete Sale
        </button>
      </div>
    </div>
  );
}

function ProcessingView() {
  return (
    <div className="p-8 text-center">
      <div className="relative w-20 h-20 mx-auto mb-6">
        <Loader2 className="w-20 h-20 text-[#C6A15B] animate-spin" />
      </div>
      <h3 className="text-xl font-semibold text-[#F5F6FA] mb-2">Processing Payment</h3>
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
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#E74C3C]/20 flex items-center justify-center"
      >
        <AlertCircle className="w-10 h-10 text-[#E74C3C]" />
      </motion.div>

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-[#F5F6FA] mb-2">Checkout Failed</h3>
        <p className="text-[#E74C3C] text-sm">{error}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
  );
}

function SuccessView({
  result,
  itemCount,
  onNewSale,
  onViewInvoice,
}: {
  result: CheckoutResponse | null;
  itemCount: number;
  onNewSale: () => void;
  onViewInvoice: () => void;
}) {
  const handlePrintInvoice = () => {
    if (result?.pdf_url) {
      window.open(result.pdf_url, "_blank");
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#2ECC71]/20 flex items-center justify-center"
      >
        <CheckCircle className="w-10 h-10 text-[#2ECC71]" />
      </motion.div>

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-[#F5F6FA] mb-2">Payment Successful!</h3>
        <p className="text-[#A1A4B3]">Transaction completed</p>
        {result?.invoice_number && (
          <p className="text-[#C6A15B] text-sm mt-1">Invoice: {result.invoice_number}</p>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white/[0.03] rounded-xl p-4 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#A1A4B3]">Items</span>
          <span className="text-[#F5F6FA] font-medium">{result?.total_items || itemCount}</span>
        </div>
        <div className="h-px bg-white/[0.08]" />
        <div className="flex justify-between">
          <span className="text-[#A1A4B3]">Total</span>
          <span className="text-xl font-bold text-[#C6A15B]">
            {formatCurrency(parseFloat(result?.total || "0"))}
          </span>
        </div>
        {result?.is_credit_sale && result?.credit_balance && (
          <div className="flex justify-between text-sm pt-2 border-t border-white/[0.08]">
            <span className="text-[#E67E22]">Credit Balance Due</span>
            <span className="text-[#E67E22] font-medium">
              ₹{parseFloat(result.credit_balance).toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {result?.pdf_url && (
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
      </div>
    </div>
  );
}

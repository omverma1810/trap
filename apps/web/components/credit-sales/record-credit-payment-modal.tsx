"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  creditSalesService,
  CreditSale,
  RecordCreditPaymentRequest,
} from "@/services/credit-sales.service";
import { cn, formatCurrency } from "@/lib/utils";

interface RecordCreditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditSale: CreditSale | null;
  onSuccess?: () => void;
}

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "CARD", label: "Card", icon: CreditCard },
] as const;

export function RecordCreditPaymentModal({
  isOpen,
  onClose,
  creditSale,
  onSuccess,
}: RecordCreditPaymentModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<"CASH" | "UPI" | "CARD">("CASH");
  const [notes, setNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<{
    message: string;
    newBalance: string;
    isFullyPaid: boolean;
  } | null>(null);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && creditSale) {
      setAmount("");
      setMethod("CASH");
      setNotes("");
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, creditSale]);

  // Record payment mutation
  const recordMutation = useMutation({
    mutationFn: (data: RecordCreditPaymentRequest) =>
      creditSalesService.recordPayment(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["credit-sales"] });
      setSuccess({
        message: response.message,
        newBalance: response.new_balance,
        isFullyPaid: response.is_fully_paid,
      });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to record payment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!creditSale) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const balance = parseFloat(creditSale.credit_balance);
    if (numAmount > balance) {
      setError(`Amount cannot exceed balance of ${formatCurrency(balance)}`);
      return;
    }

    recordMutation.mutate({
      sale_id: creditSale.id,
      amount: numAmount,
      method,
      notes: notes.trim() || undefined,
    });
  };

  const handlePayFullBalance = () => {
    if (creditSale) {
      setAmount(creditSale.credit_balance);
    }
  };

  const handleClose = () => {
    if (!recordMutation.isPending) {
      onClose();
    }
  };

  if (!creditSale) return null;

  const balance = parseFloat(creditSale.credit_balance);
  const enteredAmount = parseFloat(amount) || 0;
  const remainingAfterPayment = Math.max(0, balance - enteredAmount);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#1A1B23] border border-[#2A2B35] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#2A2B35]">
                <div>
                  <h2 className="text-xl font-semibold text-[#F5F6FA]">
                    Record Payment
                  </h2>
                  <p className="text-sm text-[#6F7285] mt-1">
                    Invoice: {creditSale.invoice_number}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={recordMutation.isPending}
                  className="p-2 text-[#6F7285] hover:text-[#F5F6FA] hover:bg-[#2A2B35] rounded-lg transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success State */}
              {success ? (
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
                        success.isFullyPaid
                          ? "bg-emerald-500/20"
                          : "bg-blue-500/20",
                      )}
                    >
                      <CheckCircle
                        className={cn(
                          "w-8 h-8",
                          success.isFullyPaid
                            ? "text-emerald-400"
                            : "text-blue-400",
                        )}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-[#F5F6FA] mt-4">
                      {success.isFullyPaid
                        ? "Payment Complete!"
                        : "Payment Recorded"}
                    </h3>
                    <p className="text-[#6F7285] mt-2">{success.message}</p>
                    {!success.isFullyPaid && (
                      <p className="text-sm text-[#6F7285] mt-1">
                        Remaining balance:{" "}
                        <span className="text-amber-400 font-medium">
                          {formatCurrency(parseFloat(success.newBalance))}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-[#6C5DD3] hover:bg-[#5B4EC2] text-white font-medium rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Customer Info */}
                  <div className="p-6 space-y-4 border-b border-[#2A2B35]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2A2B35] rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-[#6F7285]" />
                      </div>
                      <div>
                        <p className="text-[#F5F6FA] font-medium">
                          {creditSale.customer_name || "Walk-in Customer"}
                        </p>
                        {creditSale.customer_mobile && (
                          <p className="text-sm text-[#6F7285] flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {creditSale.customer_mobile}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Balance Summary */}
                    <div className="bg-[#23242F] rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6F7285]">Sale Total</span>
                        <span className="text-[#F5F6FA]">
                          {formatCurrency(parseFloat(creditSale.total))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#6F7285]">Credit Amount</span>
                        <span className="text-[#F5F6FA]">
                          {formatCurrency(parseFloat(creditSale.credit_amount))}
                        </span>
                      </div>
                      <div className="h-px bg-[#2A2B35] my-2" />
                      <div className="flex justify-between">
                        <span className="text-[#6F7285] font-medium">
                          Outstanding Balance
                        </span>
                        <span className="text-amber-400 font-semibold text-lg">
                          {formatCurrency(balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Form */}
                  <div className="p-6 space-y-5">
                    {/* Error Message */}
                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </div>
                    )}

                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-[#F5F6FA] mb-2">
                        Payment Amount
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6F7285]" />
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={creditSale.credit_balance}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-12 pr-4 py-3 bg-[#23242F] border border-[#2A2B35] rounded-xl text-[#F5F6FA] text-lg font-medium placeholder:text-[#6F7285] focus:outline-none focus:border-[#6C5DD3] transition-colors"
                          disabled={recordMutation.isPending}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handlePayFullBalance}
                          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium bg-[#6C5DD3]/20 text-[#6C5DD3] rounded-lg hover:bg-[#6C5DD3]/30 transition-colors"
                        >
                          Pay Full
                        </button>
                      </div>
                      {enteredAmount > 0 && enteredAmount <= balance && (
                        <p className="text-xs text-[#6F7285] mt-2">
                          Balance after payment:{" "}
                          <span className="text-emerald-400">
                            {formatCurrency(remainingAfterPayment)}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-[#F5F6FA] mb-2">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {paymentMethods.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMethod(value)}
                            disabled={recordMutation.isPending}
                            className={cn(
                              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                              method === value
                                ? "bg-[#6C5DD3]/20 border-[#6C5DD3] text-[#6C5DD3]"
                                : "bg-[#23242F] border-[#2A2B35] text-[#6F7285] hover:border-[#6F7285]",
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-sm font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes (Optional) */}
                    <div>
                      <label className="block text-sm font-medium text-[#F5F6FA] mb-2">
                        Notes{" "}
                        <span className="text-[#6F7285] font-normal">
                          (Optional)
                        </span>
                      </label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-3 w-4 h-4 text-[#6F7285]" />
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add a note about this payment..."
                          rows={2}
                          className="w-full pl-11 pr-4 py-3 bg-[#23242F] border border-[#2A2B35] rounded-xl text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:border-[#6C5DD3] transition-colors resize-none"
                          disabled={recordMutation.isPending}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 p-6 border-t border-[#2A2B35]">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={recordMutation.isPending}
                      className="flex-1 py-3 bg-[#23242F] hover:bg-[#2A2B35] text-[#F5F6FA] font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        recordMutation.isPending ||
                        !amount ||
                        parseFloat(amount) <= 0
                      }
                      className="flex-1 py-3 bg-[#6C5DD3] hover:bg-[#5B4EC2] text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {recordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Record Payment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default RecordCreditPaymentModal;

"use client";

import * as React from "react";
import { CreditCard, Banknote } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "./cart-context";

interface PaymentButtonsProps {
  onCheckout: (method: "cash" | "card") => void;
}

export function PaymentButtons({ onCheckout }: PaymentButtonsProps) {
  const { items, total } = useCart();
  const isEmpty = items.length === 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onCheckout("card")}
        disabled={isEmpty}
        className={`
          flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base
          transition-all duration-200
          ${isEmpty
            ? "bg-white/[0.03] border border-white/[0.06] text-[#6F7285] cursor-not-allowed"
            : "bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] hover:bg-white/[0.08] hover:border-white/[0.12]"
          }
        `}
      >
        <CreditCard className="w-6 h-6" />
        Card
      </motion.button>
      
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onCheckout("cash")}
        disabled={isEmpty}
        className={`
          flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base
          transition-all duration-200
          ${isEmpty
            ? "bg-[#C6A15B]/30 text-[#0E0F13]/50 cursor-not-allowed"
            : "bg-[#C6A15B] text-[#0E0F13] hover:bg-[#D4B06A] shadow-lg shadow-[#C6A15B]/20"
          }
        `}
      >
        <Banknote className="w-6 h-6" />
        Cash
      </motion.button>
    </div>
  );
}

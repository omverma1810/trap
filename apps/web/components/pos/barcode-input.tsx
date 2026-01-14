"use client";

import * as React from "react";
import { Barcode, AlertCircle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart, Product } from "./cart-context";
import { useProducts } from "@/hooks";

interface BarcodeInputProps {
  onProductFound?: (product: Product) => void;
}

export function BarcodeInput({ onProductFound }: BarcodeInputProps) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { addItem } = useCart();
  
  // Get products from API
  const { data: productsResponse } = useProducts({});
  
  // Find product by barcode or SKU
  const findProductByCode = React.useCallback((code: string): Product | undefined => {
    if (!productsResponse?.results) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = productsResponse.results as any[];
    const found = products.find((p) => 
      p.barcode === code || 
      p.sku?.toLowerCase() === code.toLowerCase()
    );
    if (!found) return undefined;
    return {
      id: String(found.id),
      name: found.name || found.productName || '',
      sku: found.sku || '',
      barcode: found.barcode || '',
      price: found.sellingPrice || 0,
      stock: found.stock || found.totalStock || 0,
      category: found.category || '',
    };
  }, [productsResponse]);

  // Auto-focus on mount
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    const product = findProductByCode(value);
    
    if (product) {
      if (product.stock === 0) {
        setStatus("error");
        setErrorMessage("Product is out of stock");
      } else {
        addItem(product);
        setStatus("success");
        onProductFound?.(product);
      }
    } else {
      setStatus("error");
      setErrorMessage("Product not found");
    }

    // Clear input and reset status after delay
    setTimeout(() => {
      setValue("");
      setStatus("idle");
      setErrorMessage("");
      inputRef.current?.focus();
    }, 1500);
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6F7285] stroke-[1.5]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Scan barcode or type SKU..."
          className={`
            w-full pl-12 pr-12 py-4 rounded-xl text-lg
            bg-[#1A1B23]/80 border-2 transition-all duration-200
            text-[#F5F6FA] placeholder:text-[#6F7285]
            focus:outline-none
            ${status === "success" 
              ? "border-[#2ECC71] ring-4 ring-[#2ECC71]/20" 
              : status === "error" 
                ? "border-[#E74C3C] ring-4 ring-[#E74C3C]/20" 
                : "border-white/[0.08] focus:border-[#C6A15B] focus:ring-4 focus:ring-[#C6A15B]/20"
            }
          `}
        />
        
        {/* Status indicator */}
        <AnimatePresence>
          {status !== "idle" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {status === "success" ? (
                <CheckCircle className="w-6 h-6 text-[#2ECC71]" />
              ) : (
                <AlertCircle className="w-6 h-6 text-[#E74C3C]" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {status === "error" && errorMessage && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 top-full mt-2 text-sm text-[#E74C3C]"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  );
}

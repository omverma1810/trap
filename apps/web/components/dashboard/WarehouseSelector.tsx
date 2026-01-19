/**
 * Warehouse Selector Component
 *
 * PHASE 17: Global dashboard filtering
 */
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { inventoryService } from "@/services";

interface WarehouseSelectorProps {
  value: string | null;
  onChange: (warehouseId: string | null) => void;
  className?: string;
}

export function WarehouseSelector({
  value,
  onChange,
  className = "",
}: WarehouseSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fetch warehouses
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryService.getWarehouses(),
    staleTime: 300000, // 5 minutes
  });

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedWarehouse = warehouses?.find((w: any) => w.id === value);
  const displayText = selectedWarehouse?.name || "All Warehouses";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        <Building2 className="w-4 h-4 text-white/40" />
        <span className="max-w-[120px] truncate">{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-56 bg-[#1A1B23] border border-white/10 rounded-xl shadow-xl z-50 py-1"
          >
            {/* All option */}
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
            >
              <span>All Warehouses</span>
              {!value && <Check className="w-4 h-4 text-[#C6A15B]" />}
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-white/10" />

            {/* Warehouse list */}
            {warehouses?.map((warehouse: any) => (
              <button
                key={warehouse.id}
                onClick={() => {
                  onChange(warehouse.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors"
              >
                <div className="flex flex-col items-start">
                  <span>{warehouse.name}</span>
                  {warehouse.location && (
                    <span className="text-xs text-white/40">
                      {warehouse.location}
                    </span>
                  )}
                </div>
                {value === warehouse.id && (
                  <Check className="w-4 h-4 text-[#C6A15B]" />
                )}
              </button>
            ))}

            {(!warehouses || warehouses.length === 0) && !isLoading && (
              <div className="px-3 py-2 text-sm text-white/40">
                No warehouses found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default WarehouseSelector;

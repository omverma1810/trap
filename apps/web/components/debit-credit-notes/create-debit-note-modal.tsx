"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  X,
  Search,
  Package,
  FileText,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
  Truck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  purchaseOrdersService,
  PurchaseOrderListItem,
  PurchaseOrder,
} from "@/services/purchase-orders.service";
import {
  debitCreditNotesService,
  CreateDebitNoteData,
} from "@/services/debit-credit-notes.service";
import { inventoryService } from "@/services/inventory.service";
import { cn } from "@/lib/utils";

interface CreateDebitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ReturnItem {
  originalPurchaseOrderItem: string;
  productName: string;
  productSku: string;
  maxQuantity: number;
  quantityReturned: number;
  unitPrice: string;
  condition: string;
}

export function CreateDebitNoteModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateDebitNoteModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [step, setStep] = React.useState<"select-po" | "select-items">(
    "select-po",
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedPO, setSelectedPO] = React.useState<PurchaseOrder | null>(
    null,
  );
  const [selectedWarehouse, setSelectedWarehouse] = React.useState("");
  const [returnReason, setReturnReason] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [returnDate, setReturnDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [returnItems, setReturnItems] = React.useState<ReturnItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Fetch received purchase orders
  const { data: posResponse, isLoading: posLoading } = useQuery({
    queryKey: ["purchase-orders-for-return", searchQuery],
    queryFn: () =>
      purchaseOrdersService.getPurchaseOrders({
        status: "RECEIVED",
        pageSize: 20,
      }),
    enabled: isOpen && step === "select-po",
  });

  // Also fetch partial POs
  const { data: partialPosResponse } = useQuery({
    queryKey: ["purchase-orders-partial-for-return", searchQuery],
    queryFn: () =>
      purchaseOrdersService.getPurchaseOrders({
        status: "PARTIAL",
        pageSize: 20,
      }),
    enabled: isOpen && step === "select-po",
  });

  // Fetch warehouses
  const { data: warehousesResponse } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryService.getWarehouses(),
    enabled: isOpen,
  });

  const warehouses = warehousesResponse || [];
  const purchaseOrders = [
    ...(posResponse?.results || []),
    ...(partialPosResponse?.results || []),
  ];

  // Filter POs by search
  const filteredPOs = React.useMemo(() => {
    if (!searchQuery) return purchaseOrders;
    const query = searchQuery.toLowerCase();
    return purchaseOrders.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(query) ||
        po.supplierName.toLowerCase().includes(query),
    );
  }, [purchaseOrders, searchQuery]);

  // Return reason options
  const returnReasonOptions =
    debitCreditNotesService.getReturnReasonOptions("debit");
  const conditionOptions = debitCreditNotesService.getConditionOptions();

  // Create debit note mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateDebitNoteData) =>
      debitCreditNotesService.createDebitNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debit-notes"] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to create debit note");
    },
  });

  const handleClose = () => {
    setStep("select-po");
    setSearchQuery("");
    setSelectedPO(null);
    setSelectedWarehouse("");
    setReturnReason("");
    setNotes("");
    setReturnDate(new Date().toISOString().split("T")[0]);
    setReturnItems([]);
    setError(null);
    onClose();
  };

  const handleSelectPO = async (po: PurchaseOrderListItem) => {
    try {
      // Fetch full PO details with items
      const poDetails = await purchaseOrdersService.getPurchaseOrder(po.id);
      setSelectedPO(poDetails);
      setSelectedWarehouse(poDetails.warehouse);

      // Initialize return items from PO items (only received items)
      if (poDetails.items) {
        setReturnItems(
          poDetails.items
            .filter((item) => item.receivedQuantity > 0)
            .map((item) => ({
              originalPurchaseOrderItem: item.id,
              productName: item.productName,
              productSku: item.productSku,
              maxQuantity: item.receivedQuantity,
              quantityReturned: 0,
              unitPrice: item.unitPrice,
              condition: "GOOD",
            })),
        );
      }

      setStep("select-items");
    } catch {
      setError("Failed to load purchase order details");
    }
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const newQuantity = Math.max(
          0,
          Math.min(item.maxQuantity, item.quantityReturned + delta),
        );
        return { ...item, quantityReturned: newQuantity };
      }),
    );
  };

  const handleConditionChange = (index: number, condition: string) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, condition } : item)),
    );
  };

  const handleSubmit = () => {
    setError(null);

    // Validation
    if (!selectedPO) {
      setError("Please select a purchase order");
      return;
    }

    if (!selectedWarehouse) {
      setError("Please select a warehouse");
      return;
    }

    if (!returnReason) {
      setError("Please select a return reason");
      return;
    }

    const itemsToReturn = returnItems.filter(
      (item) => item.quantityReturned > 0,
    );
    if (itemsToReturn.length === 0) {
      setError("Please select at least one item to return");
      return;
    }

    const data: CreateDebitNoteData = {
      originalPurchaseOrder: selectedPO.id,
      warehouse: selectedWarehouse,
      returnReason,
      notes,
      returnDate,
      items: itemsToReturn.map((item) => ({
        originalPurchaseOrderItem: item.originalPurchaseOrderItem,
        quantityReturned: item.quantityReturned,
        condition: item.condition,
      })),
    };

    createMutation.mutate(data);
  };

  const totalReturnAmount = React.useMemo(() => {
    return returnItems.reduce((sum, item) => {
      return sum + item.quantityReturned * parseFloat(item.unitPrice || "0");
    }, 0);
  }, [returnItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl mx-4 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-orange-400" />
              Create Debit Note
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {step === "select-po"
                ? "Step 1: Select the purchase order"
                : "Step 2: Select items to return to supplier"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {step === "select-po" ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by PO number or supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* PO List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {posLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
                  </div>
                ) : filteredPOs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    No received purchase orders found
                  </div>
                ) : (
                  filteredPOs.map((po) => (
                    <button
                      key={po.id}
                      onClick={() => handleSelectPO(po)}
                      className="w-full p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 hover:bg-zinc-800 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-orange-400 font-mono font-medium">
                            {po.poNumber}
                          </span>
                          <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                            <Truck className="w-3 h-3" />
                            {po.supplierName}
                          </div>
                          <div className="text-sm text-zinc-500 mt-1">
                            {new Date(po.orderDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                            {" • "}
                            {po.itemCount} items
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-medium">
                            {debitCreditNotesService.formatCurrency(po.total)}
                          </span>
                          <div
                            className={cn(
                              "text-xs mt-1 px-2 py-0.5 rounded-full inline-block",
                              po.status === "RECEIVED"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-yellow-500/20 text-yellow-400",
                            )}
                          >
                            {po.status}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected PO Info */}
              {selectedPO && (
                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-orange-400 font-mono font-medium">
                        {selectedPO.poNumber}
                      </span>
                      <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                        <Truck className="w-3 h-3" />
                        {selectedPO.supplierName}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setStep("select-po");
                        setSelectedPO(null);
                        setReturnItems([]);
                      }}
                      className="text-sm text-orange-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Return Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Return from Warehouse *
                  </label>
                  <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="">Select warehouse...</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Return Reason *
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="">Select reason...</option>
                    {returnReasonOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Return Date *
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional notes about the return..."
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              {/* Items to Return */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">
                  Items to Return to Supplier
                </label>
                <div className="space-y-3">
                  {returnItems.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400">
                      No received items available for return
                    </div>
                  ) : (
                    returnItems.map((item, index) => (
                      <div
                        key={item.originalPurchaseOrderItem}
                        className={cn(
                          "p-4 rounded-xl border transition-all",
                          item.quantityReturned > 0
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-zinc-800/50 border-zinc-700",
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-zinc-400" />
                              <span className="text-white font-medium">
                                {item.productName}
                              </span>
                            </div>
                            <div className="text-sm text-zinc-400 mt-1">
                              SKU: {item.productSku} •{" "}
                              {debitCreditNotesService.formatCurrency(
                                item.unitPrice,
                              )}{" "}
                              each
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <select
                              value={item.condition}
                              onChange={(e) =>
                                handleConditionChange(index, e.target.value)
                              }
                              disabled={item.quantityReturned === 0}
                              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none disabled:opacity-50"
                            >
                              {conditionOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuantityChange(index, -1)}
                                disabled={item.quantityReturned === 0}
                                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                              >
                                <Minus className="w-4 h-4 text-white" />
                              </button>
                              <div className="w-16 text-center">
                                <span className="text-white font-medium">
                                  {item.quantityReturned}
                                </span>
                                <span className="text-zinc-500">
                                  /{item.maxQuantity}
                                </span>
                              </div>
                              <button
                                onClick={() => handleQuantityChange(index, 1)}
                                disabled={
                                  item.quantityReturned >= item.maxQuantity
                                }
                                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Total Return Amount:</span>
                  <span className="text-2xl font-bold text-orange-400">
                    {debitCreditNotesService.formatCurrency(totalReturnAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-zinc-700">
          {step === "select-items" ? (
            <>
              <button
                onClick={() => {
                  setStep("select-po");
                  setSelectedPO(null);
                  setReturnItems([]);
                }}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="px-6 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Debit Note
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <div className="text-sm text-zinc-400">
                Select a purchase order to continue
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

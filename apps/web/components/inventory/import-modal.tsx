"use client";

import * as React from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useWarehouses, useTallyImport } from "@/hooks";
import type { TallyImportResponse, TallyRowStatus } from "@/services";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPTION_CLASS = "bg-[#1A1B23] text-[#F5F6FA]";

type Step = "select" | "preview" | "done";

const STATUS_STYLES: Record<
  TallyRowStatus,
  { bg: string; text: string; label: string }
> = {
  new: { bg: "bg-[#2ECC71]/15", text: "text-[#2ECC71]", label: "New" },
  duplicate: {
    bg: "bg-[#F5A623]/15",
    text: "text-[#F5A623]",
    label: "Duplicate",
  },
  error: { bg: "bg-[#E74C3C]/15", text: "text-[#E74C3C]", label: "Error" },
};

function formatPrice(value: string | null): string {
  if (!value) return "—";
  const n = parseFloat(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [warehouseId, setWarehouseId] = React.useState("");
  const [step, setStep] = React.useState<Step>("select");
  const [preview, setPreview] = React.useState<TallyImportResponse | null>(
    null,
  );
  const [result, setResult] = React.useState<TallyImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: warehouses = [] } = useWarehouses();
  const tallyImport = useTallyImport();

  const resetState = React.useCallback(() => {
    setSelectedFile(null);
    setWarehouseId("");
    setStep("select");
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      resetState();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, resetState]);

  const handleClose = () => {
    onClose();
  };

  const pickFile = (file: File | undefined | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setErrorMsg("Only .xlsx files exported from Tally are supported.");
      return;
    }
    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const extractError = (err: unknown): string => {
    const e = err as {
      response?: { data?: { error?: { message?: string } } };
      message?: string;
    };
    return (
      e?.response?.data?.error?.message ||
      e?.message ||
      "Something went wrong. Please try again."
    );
  };

  const handlePreview = async () => {
    if (!selectedFile || !warehouseId) return;
    setErrorMsg(null);
    try {
      const res = await tallyImport.mutateAsync({
        file: selectedFile,
        warehouseId,
        dryRun: true,
      });
      setPreview(res);
      setStep("preview");
    } catch (err) {
      setErrorMsg(extractError(err));
    }
  };

  const handleConfirm = async () => {
    if (!selectedFile || !warehouseId) return;
    setErrorMsg(null);
    try {
      const res = await tallyImport.mutateAsync({
        file: selectedFile,
        warehouseId,
        dryRun: false,
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      setErrorMsg(extractError(err));
    }
  };

  const busy = tallyImport.isPending;
  const summary = preview?.summary;
  const wide = step === "preview" || step === "done";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={`w-full ${
                wide ? "max-w-4xl" : "max-w-md"
              } bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all`}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  {step === "preview" && (
                    <button
                      onClick={() => {
                        setStep("select");
                        setPreview(null);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                      aria-label="Back"
                    >
                      <ArrowLeft className="w-4 h-4 text-[#A1A4B3]" />
                    </button>
                  )}
                  <div className="p-2 rounded-lg bg-[#C6A15B]/10">
                    <Upload className="w-5 h-5 text-[#C6A15B]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-[#F5F6FA]">
                      Import from Tally
                    </h2>
                    <p className="text-xs text-[#6F7285]">
                      {step === "select" && "Upload your Tally Excel export"}
                      {step === "preview" && "Review before importing"}
                      {step === "done" && "Import complete"}
                    </p>
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

              {/* Content */}
              <div className="p-5 space-y-5 overflow-y-auto">
                {errorMsg && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-[#E74C3C]/10 border border-[#E74C3C]/20">
                    <AlertCircle className="w-5 h-5 text-[#E74C3C] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#E74C3C]">{errorMsg}</p>
                  </div>
                )}

                {/* STEP 1: SELECT */}
                {step === "select" && (
                  <>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                        isDragging
                          ? "border-[#C6A15B] bg-[#C6A15B]/5"
                          : "border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.02]"
                      } ${selectedFile ? "border-[#2ECC71] bg-[#2ECC71]/5" : ""}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => pickFile(e.target.files?.[0])}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center text-center">
                        {selectedFile ? (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-[#2ECC71]/10 flex items-center justify-center mb-3">
                              <FileText className="w-6 h-6 text-[#2ECC71]" />
                            </div>
                            <p className="text-sm font-medium text-[#F5F6FA]">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-[#6F7285] mt-1">
                              {(selectedFile.size / 1024).toFixed(1)} KB · click
                              to change
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-3">
                              <Upload className="w-6 h-6 text-[#A1A4B3]" />
                            </div>
                            <p className="text-sm text-[#F5F6FA]">
                              Drag & drop your Tally export, or{" "}
                              <span className="text-[#C6A15B]">browse</span>
                            </p>
                            <p className="text-xs text-[#6F7285] mt-1">
                              Excel (.xlsx) exported from Tally
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-[#A1A4B3] mb-1.5">
                        Target warehouse for opening stock
                      </label>
                      <select
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] cursor-pointer"
                      >
                        <option className={OPTION_CLASS} value="">
                          Select a warehouse…
                        </option>
                        {warehouses.map((w: { id: string; name: string }) => (
                          <option
                            className={OPTION_CLASS}
                            key={w.id}
                            value={w.id}
                          >
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <AlertCircle className="w-4 h-4 text-[#6F7285] flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-[#6F7285]">
                        Products already imported (matched by Tally code) are
                        skipped, so re-uploading the same sheet is safe.
                        Cost price and GST are set to 0 — edit them per product
                        afterwards.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!selectedFile || !warehouseId || busy}
                        onClick={handlePreview}
                        className="flex-1 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Preview
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 2: PREVIEW */}
                {step === "preview" && preview && summary && (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Total rows", value: summary.total, color: "text-[#F5F6FA]" },
                        { label: "New", value: summary.new, color: "text-[#2ECC71]" },
                        { label: "Duplicates", value: summary.duplicate, color: "text-[#F5A623]" },
                        { label: "Errors", value: summary.error, color: "text-[#E74C3C]" },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <p className="text-xs text-[#6F7285]">{s.label}</p>
                          <p className={`text-xl font-semibold ${s.color}`}>
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-[#6F7285]">
                      Importing into{" "}
                      <span className="text-[#A1A4B3]">
                        {preview.warehouseName}
                      </span>
                      . Only the {summary.new} new product
                      {summary.new === 1 ? "" : "s"} will be created.
                    </p>

                    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                      <div className="max-h-[40vh] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-[#1A1B23]">
                            <tr className="border-b border-white/[0.08] text-left">
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                #
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                Product
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                Brand
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                Code
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                Size
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285] text-right">
                                Sell
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285] text-right">
                                Qty
                              </th>
                              <th className="px-3 py-2 text-xs font-medium text-[#6F7285]">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.rows.map((r) => {
                              const st = STATUS_STYLES[r.status];
                              return (
                                <tr
                                  key={`${r.row}-${r.tallyCode}`}
                                  className="border-b border-white/[0.04] last:border-0"
                                >
                                  <td className="px-3 py-2 text-[#6F7285]">
                                    {r.row}
                                  </td>
                                  <td className="px-3 py-2 text-[#F5F6FA] max-w-[220px] truncate">
                                    {r.name || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A4B3]">
                                    {r.brand}
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A4B3]">
                                    {r.tallyCode || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A4B3]">
                                    {r.size || "—"}
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A4B3] text-right">
                                    {formatPrice(r.sellingPrice)}
                                  </td>
                                  <td className="px-3 py-2 text-[#A1A4B3] text-right">
                                    {r.quantity}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${st.bg} ${st.text}`}
                                      title={r.message}
                                    >
                                      {st.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setStep("select");
                          setPreview(null);
                        }}
                        className="flex-1 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                      >
                        Back
                      </button>
                      <button
                        disabled={busy || summary.new === 0}
                        onClick={handleConfirm}
                        className="flex-1 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {summary.new === 0
                          ? "Nothing to import"
                          : `Import ${summary.new} product${summary.new === 1 ? "" : "s"}`}
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 3: DONE */}
                {step === "done" && result && (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-[#2ECC71]/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-[#2ECC71]" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[#F5F6FA]">
                        Imported {result.createdCount ?? 0} product
                        {(result.createdCount ?? 0) === 1 ? "" : "s"}
                      </p>
                      <p className="text-sm text-[#6F7285] mt-1">
                        {result.summary.duplicate} duplicate
                        {result.summary.duplicate === 1 ? "" : "s"} skipped ·{" "}
                        {result.summary.error} error
                        {result.summary.error === 1 ? "" : "s"} · stock added to{" "}
                        {result.warehouseName}
                      </p>
                    </div>
                    <button
                      onClick={handleClose}
                      className="w-full py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

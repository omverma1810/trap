"use client";

import * as React from "react";
import { X, Upload, FileText, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#C6A15B]/10">
                    <Upload className="w-5 h-5 text-[#C6A15B]" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#F5F6FA]">Import Inventory</h2>
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
              <div className="p-5 space-y-5">
                {/* Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all
                    ${isDragging 
                      ? "border-[#C6A15B] bg-[#C6A15B]/5" 
                      : "border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.02]"
                    }
                    ${selectedFile ? "border-[#2ECC71] bg-[#2ECC71]/5" : ""}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="flex flex-col items-center text-center">
                    {selectedFile ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-[#2ECC71]/10 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6 text-[#2ECC71]" />
                        </div>
                        <p className="text-sm font-medium text-[#F5F6FA]">{selectedFile.name}</p>
                        <p className="text-xs text-[#6F7285] mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center mb-3">
                          <Upload className="w-6 h-6 text-[#A1A4B3]" />
                        </div>
                        <p className="text-sm text-[#F5F6FA]">
                          Drag & drop your file here, or <span className="text-[#C6A15B]">browse</span>
                        </p>
                        <p className="text-xs text-[#6F7285] mt-1">
                          Supports CSV and XLSX files
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F5A623]/10 border border-[#F5A623]/20">
                  <AlertCircle className="w-5 h-5 text-[#F5A623] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#F5A623] font-medium">CSV parsing coming soon</p>
                    <p className="text-xs text-[#F5A623]/70 mt-0.5">
                      This feature is under development. File upload UI is ready.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[#F5F6FA] font-medium hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedFile}
                    className="flex-1 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

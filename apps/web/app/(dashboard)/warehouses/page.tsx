"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse,
  Plus,
  Search,
  MapPin,
  AlertTriangle,
  Check,
  X,
  Loader2,
  RefreshCcw,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
} from "lucide-react";
import { inventoryService, Warehouse as WarehouseType } from "@/services";
import { toast } from "sonner";

// =============================================================================
// CREATE WAREHOUSE MODAL
// =============================================================================

interface CreateWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
}

function CreateWarehouseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateWarehouseModalProps) {
  const [formData, setFormData] = React.useState<WarehouseFormData>({
    name: "",
    code: "",
    address: "",
  });

  const createMutation = useMutation({
    mutationFn: inventoryService.createWarehouse,
    onSuccess: () => {
      toast.success("Warehouse created successfully");
      onSuccess();
      onClose();
      setFormData({
        name: "",
        code: "",
        address: "",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create warehouse");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    if (!formData.code.trim()) {
      toast.error("Warehouse code is required");
      return;
    }
    createMutation.mutate(formData);
  };

  // Auto-generate code from name
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      code:
        formData.code || name.toUpperCase().replace(/\s+/g, "-").slice(0, 20),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-lg mx-4 bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C6A15B]/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#C6A15B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F6FA]">
                Create Warehouse
              </h2>
              <p className="text-sm text-[#6F7285]">
                Add a new warehouse location
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-[#6F7285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Warehouse Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Bangalore Main Warehouse"
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors"
              required
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Warehouse Code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g., BLR-MAIN"
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors uppercase"
              maxLength={20}
              required
            />
            <p className="text-xs text-[#6F7285] mt-1">
              Short unique identifier (auto-converted to uppercase)
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Full warehouse address..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[#A1A4B3] hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C6A15B] text-[#0E0F13] font-medium hover:bg-[#D4AF6A] transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Warehouse
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// =============================================================================
// EDIT WAREHOUSE MODAL
// =============================================================================

interface EditWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouse: WarehouseType | null;
}

function EditWarehouseModal({
  isOpen,
  onClose,
  onSuccess,
  warehouse,
}: EditWarehouseModalProps) {
  const [formData, setFormData] = React.useState<WarehouseFormData>({
    name: "",
    code: "",
    address: "",
  });

  React.useEffect(() => {
    if (warehouse) {
      setFormData({
        name: warehouse.name,
        code: warehouse.code || "",
        address: warehouse.address || "",
      });
    }
  }, [warehouse]);

  const updateMutation = useMutation({
    mutationFn: (data: WarehouseFormData) =>
      inventoryService.updateWarehouse(warehouse!.id, data),
    onSuccess: () => {
      toast.success("Warehouse updated successfully");
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update warehouse");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Warehouse name is required");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (!isOpen || !warehouse) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-lg mx-4 bg-[#1A1B23] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F6FA]">
                Edit Warehouse
              </h2>
              <p className="text-sm text-[#6F7285]">Update warehouse details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.05] text-[#6F7285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Warehouse Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Bangalore Main Warehouse"
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors"
              required
            />
          </div>

          {/* Code - Read only */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Warehouse Code
            </label>
            <input
              type="text"
              value={formData.code}
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13]/50 border border-white/[0.08] text-[#6F7285] cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-[#6F7285] mt-1">
              Code cannot be changed after creation
            </p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#A1A4B3] mb-2">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Full warehouse address..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0E0F13] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[#A1A4B3] hover:bg-white/[0.05] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// =============================================================================
// WAREHOUSE CARD
// =============================================================================

interface WarehouseCardProps {
  warehouse: WarehouseType;
  onEdit: () => void;
  onDelete: () => void;
}

function WarehouseCard({ warehouse, onEdit, onDelete }: WarehouseCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-[#1A1B23] rounded-2xl border border-white/[0.08] overflow-hidden hover:border-[#C6A15B]/30 transition-colors group"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/[0.08]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#C6A15B]/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#C6A15B]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F6FA]">{warehouse.name}</h3>
              {warehouse.code && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#C6A15B]/10 text-[#C6A15B] text-xs font-medium mt-1">
                  {warehouse.code}
                </span>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/[0.05] text-[#6F7285] transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 z-20 w-40 bg-[#1A1B23] rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-[#F5F6FA] hover:bg-white/[0.05] transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deactivate
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        {warehouse.address ? (
          <div className="flex items-start gap-2 text-sm text-[#A1A4B3]">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{warehouse.address}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#6F7285]">
            <MapPin className="w-4 h-4" />
            <span>No address provided</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="px-5 pb-5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              warehouse.isActive ? "bg-green-400" : "bg-red-400"
            }`}
          />
          <span className="text-xs text-[#6F7285]">
            {warehouse.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] =
    React.useState<WarehouseType | null>(null);

  // Fetch warehouses
  const {
    data: warehouses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["warehouses"],
    queryFn: inventoryService.getWarehouses,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryService.deleteWarehouse(id),
    onSuccess: () => {
      toast.success("Warehouse deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate warehouse");
    },
  });

  // Filter warehouses
  const filteredWarehouses = React.useMemo(() => {
    if (!searchQuery) return warehouses;
    const query = searchQuery.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        (w.code && w.code.toLowerCase().includes(query)) ||
        (w.address && w.address.toLowerCase().includes(query)),
    );
  }, [warehouses, searchQuery]);

  const handleDelete = (warehouse: WarehouseType) => {
    if (
      confirm(
        `Are you sure you want to deactivate "${warehouse.name}"? This will soft-delete the warehouse.`,
      )
    ) {
      deleteMutation.mutate(warehouse.id);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F6FA]">Warehouses</h1>
          <p className="text-[#6F7285] mt-1">
            Manage your warehouse locations. Create warehouses before adding
            inventory.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C6A15B] text-[#0E0F13] font-semibold hover:bg-[#D4AF6A] transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Warehouse
        </button>
      </div>

      {/* Search and Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6F7285]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search warehouses..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#1A1B23] border border-white/[0.08] text-[#F5F6FA] placeholder-[#6F7285] focus:outline-none focus:border-[#C6A15B] transition-colors"
          />
        </div>
        <button
          onClick={() => refetch()}
          className="p-3 rounded-xl bg-[#1A1B23] border border-white/[0.08] text-[#A1A4B3] hover:text-[#F5F6FA] hover:border-[#C6A15B]/30 transition-colors"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#C6A15B]" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">
            Failed to load warehouses
          </h3>
          <p className="text-[#6F7285] mb-4">
            {error instanceof Error ? error.message : "An error occurred"}
          </p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A1B23] border border-white/[0.08] text-[#A1A4B3] hover:text-[#F5F6FA] transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredWarehouses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#C6A15B]/10 flex items-center justify-center mb-6">
            <Building2 className="w-10 h-10 text-[#C6A15B]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F5F6FA] mb-2">
            {searchQuery ? "No warehouses found" : "No warehouses yet"}
          </h3>
          <p className="text-[#6F7285] mb-6 max-w-md">
            {searchQuery
              ? "Try adjusting your search query"
              : "Create your first warehouse to start managing inventory. Warehouses are required before adding products."}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C6A15B] text-[#0E0F13] font-semibold hover:bg-[#D4AF6A] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create First Warehouse
            </button>
          )}
        </div>
      )}

      {/* Warehouse Grid */}
      {!isLoading && !error && filteredWarehouses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarehouses.map((warehouse) => (
            <WarehouseCard
              key={warehouse.id}
              warehouse={warehouse}
              onEdit={() => setEditingWarehouse(warehouse)}
              onDelete={() => handleDelete(warehouse)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateWarehouseModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleSuccess}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingWarehouse && (
          <EditWarehouseModal
            isOpen={!!editingWarehouse}
            onClose={() => setEditingWarehouse(null)}
            onSuccess={handleSuccess}
            warehouse={editingWarehouse}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

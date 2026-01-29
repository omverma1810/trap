"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Plus,
  Search,
  MapPin,
  User,
  AlertTriangle,
  Check,
  X,
  Loader2,
  RefreshCcw,
  ChevronRight,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  storesService,
  CreateStoreData,
  UpdateStoreData,
  StoreListItem,
  Store as StoreType,
} from "@/services";
import { usersService, User as UserType } from "@/services/users.service";

// =============================================================================
// CREATE STORE MODAL
// =============================================================================

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateStoreModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStoreModalProps) {
  const [formData, setFormData] = React.useState<CreateStoreData>({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    operator: undefined,
    operatorPhone: "",
    lowStockThreshold: 10,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.getUsers(),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: storesService.createStore,
    onSuccess: () => {
      onSuccess();
      onClose();
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        phone: "",
        email: "",
        operator: undefined,
        operatorPhone: "",
        lowStockThreshold: 10,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">
                Create New Store
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Downtown Branch"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Full street address"
              rows={2}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="City"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="State"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Pincode *
              </label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                placeholder="560001"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="store@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Operator Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Store Operator
              </label>
              <select
                value={formData.operator || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operator: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select operator...</option>
                {users.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Operator Phone
              </label>
              <input
                type="tel"
                value={formData.operatorPhone}
                onChange={(e) =>
                  setFormData({ ...formData, operatorPhone: e.target.value })
                }
                placeholder="Personal phone"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              min={1}
              value={formData.lowStockThreshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lowStockThreshold: parseInt(e.target.value) || 10,
                })
              }
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Alert when product stock falls below this level
            </p>
          </div>

          {/* Error Message */}
          {createMutation.isError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">
                Failed to create store. Please try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create Store
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
// EDIT STORE MODAL
// =============================================================================

interface EditStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  store: StoreType;
}

function EditStoreModal({
  isOpen,
  onClose,
  onSuccess,
  store,
}: EditStoreModalProps) {
  const [formData, setFormData] = React.useState<UpdateStoreData>({
    name: store.name,
    address: store.address,
    city: store.city,
    state: store.state,
    pincode: store.pincode,
    phone: store.phone,
    email: store.email || "",
    operator: store.operator || undefined,
    operatorPhone: store.operatorPhone || "",
    lowStockThreshold: store.lowStockThreshold,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersService.getUsers(),
    enabled: isOpen,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateStoreData) =>
      storesService.updateStore(store.id, data),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-2xl bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                <Edit className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Edit Store</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Store Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Store Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Downtown Branch"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Full street address"
              rows={2}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            />
          </div>

          {/* City, State, Pincode */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="City"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="State"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Pincode *
              </label>
              <input
                type="text"
                required
                value={formData.pincode}
                onChange={(e) =>
                  setFormData({ ...formData, pincode: e.target.value })
                }
                placeholder="560001"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+91 9876543210"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="store@example.com"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Operator Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Store Operator
              </label>
              <select
                value={formData.operator || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    operator: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Select operator...</option>
                {users.map((user: UserType) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Operator Phone
              </label>
              <input
                type="tel"
                value={formData.operatorPhone}
                onChange={(e) =>
                  setFormData({ ...formData, operatorPhone: e.target.value })
                }
                placeholder="Personal phone"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Low Stock Threshold */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Low Stock Threshold
            </label>
            <input
              type="number"
              min={1}
              value={formData.lowStockThreshold}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lowStockThreshold: parseInt(e.target.value) || 10,
                })
              }
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Alert when product stock falls below this level
            </p>
          </div>

          {/* Error Message */}
          {updateMutation.isError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm">
                Failed to update store. Please try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Store
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
// DELETE CONFIRM MODAL
// =============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  storeName: string;
  isLoading: boolean;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  storeName,
  isLoading,
}: DeleteConfirmModalProps) {
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Delete Store</h3>
              <p className="text-sm text-zinc-400">
                This action cannot be undone
              </p>
            </div>
          </div>

          <p className="text-zinc-300 mb-6">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">{storeName}</span>? The
            store will be marked as inactive and its data will be preserved.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Store
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// STORE CARD
// =============================================================================

interface StoreCardProps {
  store: StoreListItem;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function StoreCard({ store, onClick, onEdit, onDelete }: StoreCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 hover:bg-zinc-900 transition-all cursor-pointer relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 group-hover:from-emerald-500/30 group-hover:to-teal-500/30 transition-colors">
            <Store className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
              {store.name}
            </h3>
            <p className="text-xs text-zinc-500 font-mono">{store.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              store.isActive
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {store.isActive ? "Active" : "Inactive"}
          </span>
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="p-1.5 rounded-lg hover:bg-zinc-700/50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-zinc-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-20 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <MapPin className="w-4 h-4" />
          <span>{store.city}</span>
        </div>
        {store.operatorName && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <User className="w-4 h-4" />
            <span>{store.operatorName}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-xs text-zinc-500">View Details</span>
        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
      </div>
    </motion.div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function StoresPage() {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<StoreType | null>(
    null,
  );
  const [deletingStore, setDeletingStore] =
    React.useState<StoreListItem | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const queryClient = useQueryClient();

  const {
    data: stores = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["stores", searchQuery],
    queryFn: () =>
      storesService.getStores({ search: searchQuery || undefined }),
  });

  const { data: alerts } = useQuery({
    queryKey: ["low-stock-alerts"],
    queryFn: () => storesService.getLowStockAlerts(),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (storeId: string) => storesService.deleteStore(storeId),
    onSuccess: () => {
      handleRefresh();
      setDeletingStore(null);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stores"] });
    queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
  };

  const handleEditStore = async (store: StoreListItem) => {
    // Fetch full store details for editing
    const fullStore = await storesService.getStore(store.id);
    setEditingStore(fullStore);
  };

  const handleDeleteStore = (store: StoreListItem) => {
    setDeletingStore(store);
  };

  const activeStores = stores.filter((s) => s.isActive).length;
  const inactiveStores = stores.filter((s) => !s.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Stores</h1>
            <p className="text-zinc-400">
              Manage your retail stores and stock transfers
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="p-3 rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              <RefreshCcw className="w-5 h-5 text-zinc-400" />
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Store
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Store className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-zinc-400">Total Stores</span>
            </div>
            <p className="text-3xl font-bold text-white">{stores.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm text-zinc-400">Active</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">
              {activeStores}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-sm text-zinc-400">Inactive</span>
            </div>
            <p className="text-3xl font-bold text-red-400">{inactiveStores}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-sm text-zinc-400">Low Stock Alerts</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">
              {alerts?.totalAlerts || 0}
            </p>
          </motion.div>
        </div>

        {/* Low Stock Alert Banner */}
        {alerts && alerts.totalAlerts > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-4"
          >
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <div className="flex-1">
              <p className="text-amber-300 font-medium">
                {alerts.totalAlerts} store(s) have products below stock
                threshold
              </p>
              <p className="text-amber-400/70 text-sm">
                Transfer stock from warehouse to replenish inventory
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors text-sm font-medium">
              View Details
            </button>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search stores by name, code, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Store Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">Loading stores...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 mb-4">Failed to load stores</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : stores.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="p-6 rounded-full bg-zinc-800/50 mx-auto mb-4 w-fit">
                <Store className="w-12 h-12 text-zinc-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No stores found
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Get started by adding your first store"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Store
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onClick={() => router.push(`/stores/${store.id}`)}
                onEdit={() => handleEditStore(store)}
                onDelete={() => handleDeleteStore(store)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Store Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateStoreModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleRefresh}
          />
        )}
      </AnimatePresence>

      {/* Edit Store Modal */}
      <AnimatePresence>
        {editingStore && (
          <EditStoreModal
            isOpen={!!editingStore}
            onClose={() => setEditingStore(null)}
            onSuccess={handleRefresh}
            store={editingStore}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deletingStore && (
          <DeleteConfirmModal
            isOpen={!!deletingStore}
            onClose={() => setDeletingStore(null)}
            onConfirm={() => deleteMutation.mutate(deletingStore.id)}
            storeName={deletingStore.name}
            isLoading={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

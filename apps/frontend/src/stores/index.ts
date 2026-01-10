import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User type
interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'manager' | 'employee';
  phone?: string;
  avatar?: string;
}

// Auth store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({ user: null, isAuthenticated: false, isLoading: false }),
    }),
    {
      name: 'trap-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Sidebar state
interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setMobileOpen: (isMobileOpen) => set({ isMobileOpen }),
    }),
    {
      name: 'trap-sidebar',
    }
  )
);

// Cart/POS state for invoice creation
interface CartItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_percent: number;
  discount_amount: number;
  available_quantity: number;
}

interface CartState {
  items: CartItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  notes: string;
  addItem: (item: CartItem) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  updateItemDiscount: (productId: string, discount: number, isPercent: boolean) => void;
  removeItem: (productId: string) => void;
  setCustomerInfo: (info: Partial<Pick<CartState, 'customerName' | 'customerEmail' | 'customerPhone' | 'customerAddress'>>) => void;
  setDiscount: (amount: number, isPercent: boolean) => void;
  setTaxPercent: (percent: number) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  notes: '',
  
  addItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.product_id === item.product_id
      );
      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += item.quantity;
        return { items: newItems };
      }
      return { items: [...state.items, item] };
    }),
  
  updateItemQuantity: (productId, quantity) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      ),
    })),
  
  updateItemDiscount: (productId, discount, isPercent) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.product_id === productId
          ? isPercent
            ? { ...item, discount_percent: discount, discount_amount: 0 }
            : { ...item, discount_amount: discount, discount_percent: 0 }
          : item
      ),
    })),
  
  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((item) => item.product_id !== productId),
    })),
  
  setCustomerInfo: (info) => set((state) => ({ ...state, ...info })),
  
  setDiscount: (amount, isPercent) =>
    set(isPercent ? { discountPercent: amount, discountAmount: 0 } : { discountAmount: amount, discountPercent: 0 }),
  
  setTaxPercent: (taxPercent) => set({ taxPercent }),
  
  setNotes: (notes) => set({ notes }),
  
  clearCart: () =>
    set({
      items: [],
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 0,
      notes: '',
    }),
  
  getSubtotal: () => {
    const state = get();
    return state.items.reduce((total, item) => {
      const itemSubtotal = item.unit_price * item.quantity;
      const itemDiscount = item.discount_percent > 0
        ? (itemSubtotal * item.discount_percent) / 100
        : item.discount_amount;
      return total + itemSubtotal - itemDiscount;
    }, 0);
  },
  
  getTotal: () => {
    const state = get();
    const subtotal = state.getSubtotal();
    const discountAmt = state.discountPercent > 0
      ? (subtotal * state.discountPercent) / 100
      : state.discountAmount;
    const afterDiscount = subtotal - discountAmt;
    const taxAmt = (afterDiscount * state.taxPercent) / 100;
    return afterDiscount + taxAmt;
  },
}));

// Filters state for products
interface FiltersState {
  search: string;
  brand: string | null;
  category: string | null;
  status: string | null;
  stockStatus: string | null;
  priceMin: number | null;
  priceMax: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setFilter: (key: keyof Omit<FiltersState, 'setFilter' | 'resetFilters'>, value: any) => void;
  resetFilters: () => void;
}

const initialFilters = {
  search: '',
  brand: null,
  category: null,
  status: null,
  stockStatus: null,
  priceMin: null,
  priceMax: null,
  sortBy: 'created_at',
  sortOrder: 'desc' as const,
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialFilters,
  setFilter: (key, value) => set({ [key]: value }),
  resetFilters: () => set(initialFilters),
}));

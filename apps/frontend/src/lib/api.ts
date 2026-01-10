import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('trap-access-token', token);
  } else {
    localStorage.removeItem('trap-access-token');
  }
};

export const getAccessToken = () => {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('trap-access-token');
  }
  return accessToken;
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('trap-refresh-token', token);
  } else {
    localStorage.removeItem('trap-refresh-token');
  }
};

export const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('trap-refresh-token');
  }
  return null;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          setAccessToken(access);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          setAccessToken(null);
          setRefreshToken(null);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login/', { email, password }),
  register: (data: {
    email: string;
    username: string;
    password: string;
    password_confirm: string;
    first_name: string;
    last_name: string;
  }) => api.post('/auth/register/', data),
  logout: () => {
    const refresh = getRefreshToken();
    return api.post('/auth/logout/', { refresh });
  },
  getProfile: () => api.get('/profile/'),
  updateProfile: (data: any) => api.patch('/profile/', data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/profile/change-password/', data),
};

export const productsAPI = {
  getProducts: (params?: any) => api.get('/products/', { params }),
  getProduct: (id: string) => api.get(`/products/${id}/`),
  createProduct: (data: any) => api.post('/products/', data),
  updateProduct: (id: string, data: any) => api.patch(`/products/${id}/`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}/`),
  getBarcode: (id: string) => api.get(`/products/${id}/barcode/`),
  getLowStock: () => api.get('/products/low_stock/'),
  getOutOfStock: () => api.get('/products/out_of_stock/'),
};

export const brandsAPI = {
  getBrands: (params?: any) => api.get('/brands/', { params }),
  getBrand: (id: string) => api.get(`/brands/${id}/`),
  createBrand: (data: any) => api.post('/brands/', data),
  updateBrand: (id: string, data: any) => api.patch(`/brands/${id}/`, data),
  deleteBrand: (id: string) => api.delete(`/brands/${id}/`),
};

export const categoriesAPI = {
  getCategories: (params?: any) => api.get('/categories/', { params }),
  getCategoryTree: () => api.get('/categories/tree/'),
  getCategory: (id: string) => api.get(`/categories/${id}/`),
  createCategory: (data: any) => api.post('/categories/', data),
  updateCategory: (id: string, data: any) => api.patch(`/categories/${id}/`, data),
  deleteCategory: (id: string) => api.delete(`/categories/${id}/`),
};

export const inventoryAPI = {
  getInventory: (params?: any) => api.get('/inventory/', { params }),
  getInventoryItem: (id: string) => api.get(`/inventory/${id}/`),
  updateInventory: (id: string, data: any) => api.patch(`/inventory/${id}/`, data),
  adjustStock: (id: string, data: any) => api.post(`/inventory/${id}/adjust/`, data),
  getLowStock: () => api.get('/inventory/low_stock/'),
  getOutOfStock: () => api.get('/inventory/out_of_stock/'),
  getNeedsReorder: () => api.get('/inventory/needs_reorder/'),
  scanBarcode: (barcode: string) => api.post('/scan/', { barcode }),
};

export const stockMovementsAPI = {
  getMovements: (params?: any) => api.get('/stock-movements/', { params }),
};

export const suppliersAPI = {
  getSuppliers: (params?: any) => api.get('/suppliers/', { params }),
  getSupplier: (id: string) => api.get(`/suppliers/${id}/`),
  createSupplier: (data: any) => api.post('/suppliers/', data),
  updateSupplier: (id: string, data: any) => api.patch(`/suppliers/${id}/`, data),
  deleteSupplier: (id: string) => api.delete(`/suppliers/${id}/`),
};

export const invoicesAPI = {
  getInvoices: (params?: any) => api.get('/invoices/', { params }),
  getInvoice: (id: string) => api.get(`/invoices/${id}/`),
  createInvoice: (data: any) => api.post('/invoices/', data),
  payInvoice: (id: string, data: any) => api.post(`/invoices/${id}/pay/`, data),
  cancelInvoice: (id: string) => api.post(`/invoices/${id}/cancel/`),
  getInvoicePdf: (id: string) => api.get(`/invoices/${id}/pdf/`),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesAnalytics: (params?: any) => api.get('/analytics/sales/', { params }),
  getInventoryAnalytics: () => api.get('/analytics/inventory/'),
  getProfitAnalytics: (params?: any) => api.get('/analytics/profit/', { params }),
};

export const usersAPI = {
  getUsers: (params?: any) => api.get('/users/', { params }),
  getUser: (id: string) => api.get(`/users/${id}/`),
  createUser: (data: any) => api.post('/users/', data),
  updateUser: (id: string, data: any) => api.patch(`/users/${id}/`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}/`),
};

export default api;

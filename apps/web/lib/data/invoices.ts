// Mock Invoice Data
export interface InvoiceItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  total: number;
  paymentMethod: "cash" | "card";
  status: "paid" | "cancelled" | "refunded";
  cashier: string;
}

// Customer names for mock data
const customers = [
  { name: "Rahul Sharma", phone: "+91 98765 43210" },
  { name: "Priya Patel", phone: "+91 87654 32109" },
  { name: "Amit Kumar", phone: "+91 76543 21098" },
  { name: "Sneha Gupta", phone: "+91 65432 10987" },
  { name: "Vikram Singh", phone: "+91 54321 09876" },
  { name: "Anjali Reddy", email: "anjali@email.com" },
  { name: "Arjun Nair", phone: "+91 43210 98765" },
  { name: "Kavya Iyer", email: "kavya.iyer@email.com" },
  { name: "Rohan Joshi", phone: "+91 32109 87654" },
  { name: "Meera Krishnan", phone: "+91 21098 76543" },
  { name: "Walk-in Customer" },
  { name: "Walk-in Customer" },
];

// Products for invoice items
const products = [
  { id: "1", name: "Premium Cotton T-Shirt", sku: "TSH-001", price: 1299 },
  { id: "2", name: "Slim Fit Denim Jeans", sku: "JNS-001", price: 2499 },
  { id: "3", name: "Leather Wallet", sku: "ACC-001", price: 1599 },
  { id: "4", name: "Canvas Sneakers", sku: "FTW-001", price: 2999 },
  { id: "5", name: "Classic Polo Shirt", sku: "SHT-001", price: 1799 },
  { id: "6", name: "Leather Belt", sku: "ACC-002", price: 899 },
  { id: "7", name: "Crew Neck Sweater", sku: "SWT-001", price: 2199 },
  { id: "8", name: "Chino Trousers", sku: "TRS-001", price: 1899 },
];

// Generate mock invoices
function generateInvoice(index: number): Invoice {
  const daysAgo = Math.floor(index / 3);
  const date = new Date(2026, 0, 13 - daysAgo);
  const hour = 9 + (index % 10);
  const minute = (index * 7) % 60;
  
  const customer = customers[index % customers.length];
  const numItems = 1 + (index % 4);
  
  const items: InvoiceItem[] = [];
  let subtotal = 0;
  
  for (let i = 0; i < numItems; i++) {
    const product = products[(index + i) % products.length];
    const quantity = 1 + (i % 3);
    const total = product.price * quantity;
    subtotal += total;
    
    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice: product.price,
      total,
    });
  }
  
  const hasDiscount = index % 4 === 0;
  const discountPercent = hasDiscount ? 10 : 0;
  const discount = hasDiscount ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;
  
  const isCancelled = index === 5 || index === 18;
  
  return {
    id: `inv-${1000 + index}`,
    invoiceNumber: `INV-${String(2026001 + index).padStart(7, "0")}`,
    date: date.toISOString().split("T")[0],
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    customer,
    items,
    subtotal,
    discount,
    discountPercent,
    total,
    paymentMethod: index % 3 === 0 ? "card" : "cash",
    status: isCancelled ? "cancelled" : "paid",
    cashier: index % 2 === 0 ? "Admin" : "Staff",
  };
}

// Generate 30 mock invoices
export const mockInvoices: Invoice[] = Array.from({ length: 30 }, (_, i) => generateInvoice(i));

// Store info for invoice header
export const storeInfo = {
  name: "TRAP Fashion Store",
  address: "123 Fashion Street, Mumbai 400001",
  phone: "+91 22 1234 5678",
  email: "sales@trapfashion.in",
  gstin: "27AABCT1234F1ZN",
};

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Calculate summary stats
export function getInvoiceSummary(invoices: Invoice[]) {
  const paidInvoices = invoices.filter(inv => inv.status === "paid");
  const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const avgValue = paidInvoices.length > 0 ? Math.round(totalRevenue / paidInvoices.length) : 0;
  
  return {
    totalInvoices: invoices.length,
    paidCount: paidInvoices.length,
    cancelledCount: invoices.filter(inv => inv.status === "cancelled").length,
    totalRevenue,
    avgValue,
  };
}

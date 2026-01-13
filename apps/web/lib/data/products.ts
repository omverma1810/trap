// Mock Products Data for POS
export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    sku: "SKU-1001",
    barcode: "8901234567890",
    name: "Premium Cotton T-Shirt",
    price: 1299,
    stock: 45,
    category: "Apparel",
  },
  {
    id: "2",
    sku: "SKU-1002",
    barcode: "8901234567891",
    name: "Slim Fit Denim Jeans",
    price: 2499,
    stock: 28,
    category: "Apparel",
  },
  {
    id: "3",
    sku: "SKU-1003",
    barcode: "8901234567892",
    name: "Leather Wallet",
    price: 1599,
    stock: 62,
    category: "Accessories",
  },
  {
    id: "4",
    sku: "SKU-1004",
    barcode: "8901234567893",
    name: "Classic Polo Shirt",
    price: 1799,
    stock: 35,
    category: "Apparel",
  },
  {
    id: "5",
    sku: "SKU-1005",
    barcode: "8901234567894",
    name: "Canvas Sneakers",
    price: 2999,
    stock: 18,
    category: "Footwear",
  },
  {
    id: "6",
    sku: "SKU-1006",
    barcode: "8901234567895",
    name: "Formal Blazer",
    price: 5499,
    stock: 12,
    category: "Apparel",
  },
  {
    id: "7",
    sku: "SKU-1007",
    barcode: "8901234567896",
    name: "Sports Watch",
    price: 3499,
    stock: 8,
    category: "Accessories",
  },
  {
    id: "8",
    sku: "SKU-1008",
    barcode: "8901234567897",
    name: "Graphic Hoodie",
    price: 1999,
    stock: 42,
    category: "Apparel",
  },
  {
    id: "9",
    sku: "SKU-1009",
    barcode: "8901234567898",
    name: "Chino Trousers",
    price: 1899,
    stock: 0, // Out of stock
    category: "Apparel",
  },
  {
    id: "10",
    sku: "SKU-1010",
    barcode: "8901234567899",
    name: "Leather Belt",
    price: 899,
    stock: 55,
    category: "Accessories",
  },
  {
    id: "11",
    sku: "SKU-1011",
    barcode: "8901234567900",
    name: "Sunglasses",
    price: 1499,
    stock: 3, // Low stock
    category: "Accessories",
  },
  {
    id: "12",
    sku: "SKU-1012",
    barcode: "8901234567901",
    name: "Casual Shorts",
    price: 999,
    stock: 67,
    category: "Apparel",
  },
  {
    id: "13",
    sku: "SKU-1013",
    barcode: "8901234567902",
    name: "Denim Jacket",
    price: 3299,
    stock: 15,
    category: "Apparel",
  },
  {
    id: "14",
    sku: "SKU-1014",
    barcode: "8901234567903",
    name: "Baseball Cap",
    price: 599,
    stock: 0, // Out of stock
    category: "Accessories",
  },
  {
    id: "15",
    sku: "SKU-1015",
    barcode: "8901234567904",
    name: "Crew Neck Sweater",
    price: 2199,
    stock: 22,
    category: "Apparel",
  },
  {
    id: "16",
    sku: "SKU-1016",
    barcode: "8901234567905",
    name: "Laptop Backpack",
    price: 2799,
    stock: 31,
    category: "Accessories",
  },
];

// Helper to find product by barcode or SKU
export function findProductByCode(code: string): Product | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return mockProducts.find(
    (p) =>
      p.barcode === code ||
      p.sku.toUpperCase() === normalizedCode ||
      p.name.toUpperCase().includes(normalizedCode)
  );
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

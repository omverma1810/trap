// Extended Mock Inventory Data
export interface InventoryProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: {
    total: number;
    byWarehouse: { warehouseId: string; warehouseName: string; quantity: number }[];
  };
  status: "in_stock" | "low_stock" | "out_of_stock";
  createdAt: string;
}

export const warehouses = [
  { id: "wh-1", name: "Main Warehouse", location: "Mumbai" },
  { id: "wh-2", name: "Secondary Store", location: "Delhi" },
  { id: "wh-3", name: "Distribution Center", location: "Bangalore" },
];

export const categories = [
  "T-Shirts",
  "Jeans",
  "Jackets",
  "Shirts",
  "Trousers",
  "Footwear",
  "Accessories",
  "Sweaters",
  "Shorts",
  "Activewear",
];

function getStatus(total: number): "in_stock" | "low_stock" | "out_of_stock" {
  if (total === 0) return "out_of_stock";
  if (total <= 10) return "low_stock";
  return "in_stock";
}

function generateStock(baseAmount: number) {
  const wh1 = Math.floor(baseAmount * 0.5);
  const wh2 = Math.floor(baseAmount * 0.3);
  const wh3 = baseAmount - wh1 - wh2;
  const total = wh1 + wh2 + wh3;
  
  return {
    total,
    byWarehouse: [
      { warehouseId: "wh-1", warehouseName: "Main Warehouse", quantity: wh1 },
      { warehouseId: "wh-2", warehouseName: "Secondary Store", quantity: wh2 },
      { warehouseId: "wh-3", warehouseName: "Distribution Center", quantity: wh3 },
    ],
  };
}

export const inventoryProducts: InventoryProduct[] = [
  // T-Shirts
  { id: "1", sku: "TSH-001", barcode: "8901234500001", name: "Premium Cotton T-Shirt - White", category: "T-Shirts", costPrice: 450, sellingPrice: 1299, stock: generateStock(85), status: "in_stock", createdAt: "2025-12-01" },
  { id: "2", sku: "TSH-002", barcode: "8901234500002", name: "Premium Cotton T-Shirt - Black", category: "T-Shirts", costPrice: 450, sellingPrice: 1299, stock: generateStock(72), status: "in_stock", createdAt: "2025-12-01" },
  { id: "3", sku: "TSH-003", barcode: "8901234500003", name: "Graphic Print T-Shirt - Urban", category: "T-Shirts", costPrice: 520, sellingPrice: 1499, stock: generateStock(8), status: "low_stock", createdAt: "2025-12-05" },
  { id: "4", sku: "TSH-004", barcode: "8901234500004", name: "V-Neck Essential T-Shirt", category: "T-Shirts", costPrice: 380, sellingPrice: 999, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-12-08" },
  { id: "5", sku: "TSH-005", barcode: "8901234500005", name: "Oversized Streetwear Tee", category: "T-Shirts", costPrice: 580, sellingPrice: 1699, stock: generateStock(45), status: "in_stock", createdAt: "2025-12-10" },
  
  // Jeans
  { id: "6", sku: "JNS-001", barcode: "8901234500006", name: "Slim Fit Denim Jeans - Blue", category: "Jeans", costPrice: 850, sellingPrice: 2499, stock: generateStock(56), status: "in_stock", createdAt: "2025-11-15" },
  { id: "7", sku: "JNS-002", barcode: "8901234500007", name: "Slim Fit Denim Jeans - Black", category: "Jeans", costPrice: 850, sellingPrice: 2499, stock: generateStock(38), status: "in_stock", createdAt: "2025-11-15" },
  { id: "8", sku: "JNS-003", barcode: "8901234500008", name: "Relaxed Fit Cargo Jeans", category: "Jeans", costPrice: 920, sellingPrice: 2799, stock: generateStock(5), status: "low_stock", createdAt: "2025-11-20" },
  { id: "9", sku: "JNS-004", barcode: "8901234500009", name: "Distressed Vintage Jeans", category: "Jeans", costPrice: 1100, sellingPrice: 3299, stock: generateStock(22), status: "in_stock", createdAt: "2025-11-25" },
  { id: "10", sku: "JNS-005", barcode: "8901234500010", name: "High-Waist Mom Jeans", category: "Jeans", costPrice: 780, sellingPrice: 2199, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-12-01" },
  
  // Jackets
  { id: "11", sku: "JKT-001", barcode: "8901234500011", name: "Classic Denim Jacket", category: "Jackets", costPrice: 1200, sellingPrice: 3499, stock: generateStock(28), status: "in_stock", createdAt: "2025-10-15" },
  { id: "12", sku: "JKT-002", barcode: "8901234500012", name: "Leather Biker Jacket", category: "Jackets", costPrice: 3500, sellingPrice: 8999, stock: generateStock(12), status: "in_stock", createdAt: "2025-10-20" },
  { id: "13", sku: "JKT-003", barcode: "8901234500013", name: "Puffer Jacket - Navy", category: "Jackets", costPrice: 1800, sellingPrice: 4999, stock: generateStock(3), status: "low_stock", createdAt: "2025-11-01" },
  { id: "14", sku: "JKT-004", barcode: "8901234500014", name: "Windbreaker Jacket", category: "Jackets", costPrice: 950, sellingPrice: 2699, stock: generateStock(42), status: "in_stock", createdAt: "2025-11-10" },
  
  // Shirts
  { id: "15", sku: "SHT-001", barcode: "8901234500015", name: "Oxford Button-Down Shirt", category: "Shirts", costPrice: 680, sellingPrice: 1899, stock: generateStock(67), status: "in_stock", createdAt: "2025-11-05" },
  { id: "16", sku: "SHT-002", barcode: "8901234500016", name: "Linen Casual Shirt", category: "Shirts", costPrice: 750, sellingPrice: 2199, stock: generateStock(34), status: "in_stock", createdAt: "2025-11-08" },
  { id: "17", sku: "SHT-003", barcode: "8901234500017", name: "Flannel Check Shirt", category: "Shirts", costPrice: 620, sellingPrice: 1699, stock: generateStock(9), status: "low_stock", createdAt: "2025-11-12" },
  { id: "18", sku: "SHT-004", barcode: "8901234500018", name: "Formal Dress Shirt - White", category: "Shirts", costPrice: 580, sellingPrice: 1599, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-11-15" },
  
  // Trousers
  { id: "19", sku: "TRS-001", barcode: "8901234500019", name: "Chino Trousers - Khaki", category: "Trousers", costPrice: 650, sellingPrice: 1899, stock: generateStock(48), status: "in_stock", createdAt: "2025-11-20" },
  { id: "20", sku: "TRS-002", barcode: "8901234500020", name: "Chino Trousers - Navy", category: "Trousers", costPrice: 650, sellingPrice: 1899, stock: generateStock(52), status: "in_stock", createdAt: "2025-11-20" },
  { id: "21", sku: "TRS-003", barcode: "8901234500021", name: "Formal Slim Fit Trousers", category: "Trousers", costPrice: 720, sellingPrice: 2099, stock: generateStock(6), status: "low_stock", createdAt: "2025-11-25" },
  { id: "22", sku: "TRS-004", barcode: "8901234500022", name: "Jogger Pants - Grey", category: "Trousers", costPrice: 480, sellingPrice: 1399, stock: generateStock(78), status: "in_stock", createdAt: "2025-12-01" },
  
  // Footwear
  { id: "23", sku: "FTW-001", barcode: "8901234500023", name: "Canvas Sneakers - White", category: "Footwear", costPrice: 1100, sellingPrice: 2999, stock: generateStock(35), status: "in_stock", createdAt: "2025-10-01" },
  { id: "24", sku: "FTW-002", barcode: "8901234500024", name: "Leather Loafers - Brown", category: "Footwear", costPrice: 1500, sellingPrice: 3999, stock: generateStock(18), status: "in_stock", createdAt: "2025-10-10" },
  { id: "25", sku: "FTW-003", barcode: "8901234500025", name: "Running Shoes - Black", category: "Footwear", costPrice: 1800, sellingPrice: 4499, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-10-15" },
  { id: "26", sku: "FTW-004", barcode: "8901234500026", name: "Chelsea Boots", category: "Footwear", costPrice: 2200, sellingPrice: 5499, stock: generateStock(7), status: "low_stock", createdAt: "2025-10-20" },
  
  // Accessories
  { id: "27", sku: "ACC-001", barcode: "8901234500027", name: "Leather Wallet - Black", category: "Accessories", costPrice: 480, sellingPrice: 1299, stock: generateStock(92), status: "in_stock", createdAt: "2025-09-15" },
  { id: "28", sku: "ACC-002", barcode: "8901234500028", name: "Leather Belt - Brown", category: "Accessories", costPrice: 320, sellingPrice: 899, stock: generateStock(65), status: "in_stock", createdAt: "2025-09-20" },
  { id: "29", sku: "ACC-003", barcode: "8901234500029", name: "Aviator Sunglasses", category: "Accessories", costPrice: 550, sellingPrice: 1499, stock: generateStock(4), status: "low_stock", createdAt: "2025-10-01" },
  { id: "30", sku: "ACC-004", barcode: "8901234500030", name: "Sports Watch - Digital", category: "Accessories", costPrice: 1200, sellingPrice: 3299, stock: generateStock(21), status: "in_stock", createdAt: "2025-10-10" },
  { id: "31", sku: "ACC-005", barcode: "8901234500031", name: "Canvas Backpack", category: "Accessories", costPrice: 850, sellingPrice: 2299, stock: generateStock(33), status: "in_stock", createdAt: "2025-10-15" },
  { id: "32", sku: "ACC-006", barcode: "8901234500032", name: "Baseball Cap - Black", category: "Accessories", costPrice: 220, sellingPrice: 599, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-10-20" },
  
  // Sweaters
  { id: "33", sku: "SWT-001", barcode: "8901234500033", name: "Crew Neck Sweater - Grey", category: "Sweaters", costPrice: 780, sellingPrice: 2199, stock: generateStock(42), status: "in_stock", createdAt: "2025-11-01" },
  { id: "34", sku: "SWT-002", barcode: "8901234500034", name: "V-Neck Cardigan", category: "Sweaters", costPrice: 920, sellingPrice: 2599, stock: generateStock(28), status: "in_stock", createdAt: "2025-11-05" },
  { id: "35", sku: "SWT-003", barcode: "8901234500035", name: "Turtleneck Sweater", category: "Sweaters", costPrice: 850, sellingPrice: 2399, stock: generateStock(2), status: "low_stock", createdAt: "2025-11-10" },
  { id: "36", sku: "SWT-004", barcode: "8901234500036", name: "Hoodie - Charcoal", category: "Sweaters", costPrice: 680, sellingPrice: 1899, stock: generateStock(58), status: "in_stock", createdAt: "2025-11-15" },
  
  // Shorts
  { id: "37", sku: "SHR-001", barcode: "8901234500037", name: "Bermuda Shorts - Khaki", category: "Shorts", costPrice: 420, sellingPrice: 1199, stock: generateStock(45), status: "in_stock", createdAt: "2025-12-01" },
  { id: "38", sku: "SHR-002", barcode: "8901234500038", name: "Denim Shorts - Blue", category: "Shorts", costPrice: 480, sellingPrice: 1399, stock: generateStock(38), status: "in_stock", createdAt: "2025-12-05" },
  { id: "39", sku: "SHR-003", barcode: "8901234500039", name: "Athletic Shorts", category: "Shorts", costPrice: 350, sellingPrice: 999, stock: generateStock(0), status: "out_of_stock", createdAt: "2025-12-08" },
  
  // Activewear
  { id: "40", sku: "ACT-001", barcode: "8901234500040", name: "Compression Tights", category: "Activewear", costPrice: 580, sellingPrice: 1599, stock: generateStock(32), status: "in_stock", createdAt: "2025-11-20" },
  { id: "41", sku: "ACT-002", barcode: "8901234500041", name: "Sports Tank Top", category: "Activewear", costPrice: 380, sellingPrice: 999, stock: generateStock(55), status: "in_stock", createdAt: "2025-11-22" },
  { id: "42", sku: "ACT-003", barcode: "8901234500042", name: "Track Jacket", category: "Activewear", costPrice: 720, sellingPrice: 1999, stock: generateStock(8), status: "low_stock", createdAt: "2025-11-25" },
  { id: "43", sku: "ACT-004", barcode: "8901234500043", name: "Yoga Pants", category: "Activewear", costPrice: 520, sellingPrice: 1499, stock: generateStock(41), status: "in_stock", createdAt: "2025-11-28" },
];

// Fix status based on actual stock totals
inventoryProducts.forEach((p) => {
  p.status = getStatus(p.stock.total);
});

// Utility functions
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStockColor(status: string): string {
  switch (status) {
    case "in_stock": return "#2ECC71";
    case "low_stock": return "#F5A623";
    case "out_of_stock": return "#E74C3C";
    default: return "#A1A4B3";
  }
}

export function getStockLabel(status: string): string {
  switch (status) {
    case "in_stock": return "In Stock";
    case "low_stock": return "Low Stock";
    case "out_of_stock": return "Out of Stock";
    default: return "Unknown";
  }
}

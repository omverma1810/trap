export { inventoryService } from "./inventory.service";
export type {
  Product,
  Warehouse,
  StockSummary,
  ProductListParams,
} from "./inventory.service";

export { analyticsService } from "./analytics.service";
export type {
  InventoryOverview,
  SalesSummary,
  SalesTrend,
  TopProduct,
  PerformanceOverview,
  AnalyticsParams,
  AnalyticsSummary,
} from "./analytics.service";

export { invoicesService } from "./invoices.service";
export type {
  Invoice,
  InvoiceItem,
  InvoiceListParams,
  InvoiceSummary,
} from "./invoices.service";

export { salesService } from "./sales.service";
export type {
  ScannedProduct,
  CartItem,
  CheckoutRequest,
  CheckoutResponse,
} from "./sales.service";

export { usersService } from "./users.service";
export type {
  User,
  CreateUserPayload,
  UpdateUserPayload,
  UpdateProfilePayload,
} from "./users.service";

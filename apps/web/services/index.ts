export { inventoryService } from "./inventory.service";
export type {
  Product,
  ProductPricing,
  ProductImage,
  ProductVariant,
  ProductCreateData,
  ProductUpdateData,
  Warehouse,
  Category,
  StockSummary,
  ProductListParams,
  POSProduct,
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

export { reportsService } from "./reports.service";
export type {
  CurrentStockReport,
  CurrentStockItem,
  StockAgingReport,
  AgingBucket,
  StockMovementReport,
  MovementItem,
  SalesSummaryReport,
  ProductSalesReport,
  ProductSalesItem,
  SalesTrendsReport,
  SalesTrendItem,
  ReturnsSummaryReport,
  AdjustmentsReport,
  AdjustmentItem,
  GrossProfitReport,
  ProfitItem,
  GstSummaryReport,
  GstBreakdownItem,
  ReportParams,
  MovementParams,
  TrendsParams,
} from "./reports.service";

export { purchaseOrdersService } from "./purchase-orders.service";
export type {
  Supplier,
  SupplierListItem,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderListItem,
  CreatePurchaseOrderData,
  CreateSupplierData,
  ReceiveItemData,
  PurchaseOrderListParams,
} from "./purchase-orders.service";

export { storesService, stockTransfersService } from "./stores.service";
export type {
  Store,
  StoreListItem,
  CreateStoreData,
  UpdateStoreData,
  StoreStock,
  LowStockAlert,
  LowStockAlertsResponse,
  StockTransfer,
  StockTransferItem,
  StockTransferListItem,
  CreateTransferData,
  CreateTransferItemData,
  ReceiveTransferData,
  TransferListParams,
  StoreListParams,
} from "./stores.service";

export { debitCreditNotesService } from "./debit-credit-notes.service";
export type {
  CreditNote,
  CreditNoteItem,
  DebitNote,
  DebitNoteItem,
  CreditNoteListItem,
  DebitNoteListItem,
  CreateCreditNoteData,
  CreateDebitNoteData,
} from "./debit-credit-notes.service";

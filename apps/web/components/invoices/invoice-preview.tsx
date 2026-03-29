"use client";

import * as React from "react";
import { X, Download, Printer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient } from "@/lib/api";

// Invoice types
interface InvoiceItem {
  productId: string;
  name: string;
  sku?: string;
  variantDetails?: string;
  quantity: number;
  unitPrice?: number;
  total: number;
  gstPercentage?: number;
  gstAmount?: number;
}

interface PaymentDetail {
  method: string;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time?: string;
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string;
  };
  items: InvoiceItem[];
  subtotal?: number;
  discount?: number;
  discountType?: string;
  discountPercent?: number;
  gstTotal?: number;
  total: number;
  paymentMethod: "cash" | "card" | "upi" | "credit";
  paymentMethods?: PaymentDetail[];
  status: "paid" | "cancelled" | "refunded";
  cashier?: string;
}

const RUPEE = "\u20B9";

const STORE_INFO = {
  name: "EDIT - BY TRAP",
  addressLine1: "P No 385, Ground Floor",
  addressLine2: "Film Nagar, Jubilee Hills",
  addressLine3: "Hyderabad-500033",
  gstin: "36AAXFT4221H1ZU",
  stateLine: "State Name : Telangana, Code : 36",
  bankName: "ICICI Bank Account - OD",
  bankAccount: "041005006897",
  bankIfsc: "ICIC0000410",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

function formatCurrency(amount: number): string {
  return `${RUPEE} ${formatAmount(amount)}`;
}

function formatInvoiceDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()] || "";
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

function toPaymentLabel(method?: string): string {
  const normalized = (method || "").toUpperCase();
  switch (normalized) {
    case "CASH":
    case "cash":
      return "Cash";
    case "CARD":
    case "card":
      return "Card";
    case "UPI":
    case "upi":
      return "UPI";
    case "CREDIT":
    case "credit":
      return "Credit";
    default:
      return method || "Cash";
  }
}

function amountToIndianWords(amount: number): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const twoDigits = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return ones[n] || "";
    const ten = tens[Math.floor(n / 10)] || "";
    const one = ones[n % 10] || "";
    return `${ten}${one ? ` ${one}` : ""}`.trim();
  };

  const threeDigits = (n: number): string => {
    if (n === 0) return "";
    if (n < 100) return twoDigits(n);
    const hundred = ones[Math.floor(n / 100)] || "";
    const remainder = n % 100;
    return `${hundred} Hundred${remainder ? ` ${twoDigits(remainder)}` : ""}`.trim();
  };

  const safeAmount = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
  let rupees = Math.floor(safeAmount);
  const paise = Math.round((safeAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return "Zero";
  }

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  const remainder = rupees;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (remainder) parts.push(threeDigits(remainder));

  let words = parts.join(" ").trim();
  if (paise) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  return words || "Zero";
}

interface InvoicePreviewProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoicePreview({
  invoice,
  isOpen,
  onClose,
}: InvoicePreviewProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Download handler (stub for PDF endpoint)
  const [isDownloading, setIsDownloading] = React.useState(false);
  const handleDownload = async () => {
    if (!invoice) return;
    setIsDownloading(true);
    try {
      const response = await apiClient.get(`/invoices/${invoice.id}/pdf/`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  if (!invoice) return null;

  const formattedDate = formatInvoiceDate(invoice.date);
  const paymentTerms =
    invoice.paymentMethods && invoice.paymentMethods.length > 0
      ? invoice.paymentMethods.map((p) => toPaymentLabel(p.method)).join(", ")
      : toPaymentLabel(invoice.paymentMethod);

  const customerLine = [invoice.customer.name, invoice.customer.phone]
    .filter(Boolean)
    .join(" ")
    .trim();

  const totalQuantity = invoice.items.reduce(
    (acc, item) => acc + (item.quantity || 0),
    0,
  );

  const isDiscountApplied =
    (invoice.discount || 0) > 0 &&
    !!invoice.discountType &&
    invoice.discountType !== "NONE";

  const discountLabel =
    invoice.discountType === "PERCENT" || invoice.discountType === "PERCENTAGE"
      ? `Discount (${invoice.discountPercent || 0}%)`
      : "Discount";

  const amountWords = `INR ${amountToIndianWords(invoice.total)} Only`;
  const minRows = Math.max(8, invoice.items.length);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-6xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
          >
            <div className="bg-[#FAFAFA] text-[#1A1B23]">
              {/* Header Actions */}
              <div className="flex items-center justify-between p-4 bg-[#1A1B23] text-white">
                <h2 className="text-lg font-semibold">Invoice Preview</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.1] text-sm hover:bg-white/[0.15] transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? "Downloading..." : "Download"}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/[0.1] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <div className="mx-auto w-full max-w-[980px] bg-white border border-black text-black print:max-w-none">
                  <div className="border-b border-black py-1 text-center text-sm font-semibold tracking-[0.18em]">
                    INVOICE
                  </div>

                  <div className="grid grid-cols-12 border-b border-black">
                    <div className="col-span-7 border-r border-black p-2 text-[10px] leading-tight">
                      <div className="text-[13px] font-bold">
                        {STORE_INFO.name}
                      </div>
                      <div>{STORE_INFO.addressLine1}</div>
                      <div>{STORE_INFO.addressLine2}</div>
                      <div>{STORE_INFO.addressLine3}</div>
                      <div>GSTIN/UIN: {STORE_INFO.gstin}</div>
                      <div>{STORE_INFO.stateLine}</div>
                    </div>

                    <div className="col-span-5">
                      <table className="w-full border-collapse text-[9px]">
                        <tbody>
                          <tr>
                            <td className="w-1/2 border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">Invoice No.</div>
                              <div className="font-semibold text-[9px]">
                                {invoice.invoiceNumber || ""}
                              </div>
                            </td>
                            <td className="w-1/2 border-b border-black p-1 align-top">
                              <div className="text-[8px]">Dated</div>
                              <div className="font-semibold text-[9px]">
                                {formattedDate}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">Delivery Note</div>
                              <div className="h-3" />
                            </td>
                            <td className="border-b border-black p-1 align-top">
                              <div className="text-[8px]">
                                Mode/Terms of Payment
                              </div>
                              <div className="font-semibold text-[9px]">
                                {paymentTerms}
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">
                                Reference No. &amp; Date.
                              </div>
                              <div className="h-3" />
                            </td>
                            <td className="border-b border-black p-1 align-top">
                              <div className="text-[8px]">Other References</div>
                              <div className="h-3" />
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">
                                Buyer&apos;s Order No.
                              </div>
                              <div className="h-3" />
                            </td>
                            <td className="border-b border-black p-1 align-top">
                              <div className="text-[8px]">Dated</div>
                              <div className="h-3" />
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">Dispatch Doc No.</div>
                              <div className="h-3" />
                            </td>
                            <td className="border-b border-black p-1 align-top">
                              <div className="text-[8px]">
                                Delivery Note Date
                              </div>
                              <div className="h-3" />
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-b border-black p-1 align-top">
                              <div className="text-[8px]">
                                Dispatched through
                              </div>
                              <div className="h-3" />
                            </td>
                            <td className="border-b border-black p-1 align-top">
                              <div className="text-[8px]">Destination</div>
                              <div className="h-3" />
                            </td>
                          </tr>
                          <tr>
                            <td className="p-1 align-top" colSpan={2}>
                              <div className="text-[8px]">
                                Terms of Delivery
                              </div>
                              <div className="h-4" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="border-b border-black p-2 text-[9px] leading-tight">
                    <div className="text-[8px]">Buyer (Bill to)</div>
                    <div className="text-[10px] font-semibold mt-0.5">
                      {customerLine || "Walk-in Customer"}
                    </div>
                    {invoice.customer.email ? (
                      <div>E-mail : {invoice.customer.email}</div>
                    ) : null}
                    {invoice.customer.address ? (
                      <div>{invoice.customer.address}</div>
                    ) : null}
                    {invoice.customer.gstin ? (
                      <div>GSTIN : {invoice.customer.gstin}</div>
                    ) : null}
                    <div className="mt-1">
                      State Name : Telangana, Code : 36
                    </div>
                  </div>

                  <table className="w-full border-collapse text-[9px]">
                    <thead>
                      <tr>
                        <th className="border-r border-b border-black px-1 py-1 text-left font-medium w-[5%]">
                          Sl
                          <br />
                          No.
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-left font-medium w-[40%]">
                          Description of Goods
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-center font-medium w-[10%]">
                          HSN/SAC
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-center font-medium w-[10%]">
                          Quantity
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-right font-medium w-[11%]">
                          Rate
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-center font-medium w-[6%]">
                          per
                        </th>
                        <th className="border-r border-b border-black px-1 py-1 text-center font-medium w-[8%]">
                          Disc. %
                        </th>
                        <th className="border-b border-black px-1 py-1 text-right font-medium w-[10%]">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {invoice.items.map((item, index) => {
                        const qty = item.quantity || 0;
                        const rate =
                          qty > 0 ? item.total / qty : item.unitPrice || 0;

                        return (
                          <tr key={`${item.productId}-${index}`}>
                            <td className="border-r border-b border-black px-1 py-1 text-center align-top">
                              {index + 1}
                            </td>
                            <td className="border-r border-b border-black px-1 py-1 align-top">
                              <div className="font-semibold leading-tight">
                                {item.name || "Unknown Product"}
                              </div>
                              {item.sku || item.variantDetails ? (
                                <div className="text-[8px] text-gray-600 mt-0.5 leading-tight">
                                  {item.sku ? `SKU: ${item.sku}` : ""}
                                  {item.sku && item.variantDetails ? " | " : ""}
                                  {item.variantDetails || ""}
                                </div>
                              ) : null}
                            </td>
                            <td className="border-r border-b border-black px-1 py-1 text-center align-top"></td>
                            <td className="border-r border-b border-black px-1 py-1 text-center align-top font-semibold">
                              {qty} Nos
                            </td>
                            <td className="border-r border-b border-black px-1 py-1 text-right align-top">
                              {formatAmount(rate)}
                            </td>
                            <td className="border-r border-b border-black px-1 py-1 text-center align-top">
                              Nos
                            </td>
                            <td className="border-r border-b border-black px-1 py-1 text-center align-top">
                              -
                            </td>
                            <td className="border-b border-black px-1 py-1 text-right align-top font-semibold">
                              {formatAmount(item.total || 0)}
                            </td>
                          </tr>
                        );
                      })}

                      {Array.from({
                        length: Math.max(0, minRows - invoice.items.length),
                      }).map((_, idx) => (
                        <tr key={`filler-${idx}`} className="h-8">
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-r border-b border-black" />
                          <td className="border-b border-black" />
                        </tr>
                      ))}

                      {isDiscountApplied ? (
                        <tr>
                          <td
                            className="border-r border-b border-black px-1 py-1 text-right"
                            colSpan={7}
                          >
                            {discountLabel}
                          </td>
                          <td className="border-b border-black px-1 py-1 text-right">
                            - {formatCurrency(invoice.discount || 0)}
                          </td>
                        </tr>
                      ) : null}

                      <tr>
                        <td className="border-r border-b border-black px-1 py-1" />
                        <td className="border-r border-b border-black px-1 py-1 text-right font-semibold">
                          Total
                        </td>
                        <td className="border-r border-b border-black px-1 py-1" />
                        <td className="border-r border-b border-black px-1 py-1 text-center font-semibold">
                          {totalQuantity} Nos
                        </td>
                        <td className="border-r border-b border-black px-1 py-1" />
                        <td className="border-r border-b border-black px-1 py-1" />
                        <td className="border-r border-b border-black px-1 py-1" />
                        <td className="border-b border-black px-1 py-1 text-right font-semibold">
                          {formatCurrency(invoice.total || 0)}
                        </td>
                      </tr>

                      <tr>
                        <td
                          className="border-r border-black px-1 py-1"
                          colSpan={7}
                        >
                          <div className="text-[8px]">
                            Amount Chargeable (in words)
                          </div>
                          <div className="text-[10px] font-semibold mt-0.5">
                            {amountWords}
                          </div>
                        </td>
                        <td className="px-1 py-1 text-right text-[8px] italic align-top">
                          E. &amp; O.E
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="grid grid-cols-12 border-t border-black">
                    <div className="col-span-7 border-r border-black p-2 text-[9px] leading-tight flex flex-col justify-end min-h-[88px]">
                      <div className="mb-1">Declaration</div>
                      <div>
                        1) Prices are inclusive of taxes. 2) Subject to
                        Hyderabad Jurisdiction. 3) Goods Once sold will not be
                        taken back.
                      </div>
                    </div>

                    <div className="col-span-5 p-2 text-[9px] leading-tight min-h-[88px]">
                      <div className="text-center text-[10px] mb-1">
                        Company&apos;s Bank Details
                      </div>
                      <table className="w-full text-[9px] mb-3">
                        <tbody>
                          <tr>
                            <td className="w-[45%]">Bank Name</td>
                            <td className="w-[5%]">:</td>
                            <td className="font-semibold">
                              {STORE_INFO.bankName}
                            </td>
                          </tr>
                          <tr>
                            <td>A/c No.</td>
                            <td>:</td>
                            <td className="font-semibold">
                              {STORE_INFO.bankAccount}
                            </td>
                          </tr>
                          <tr>
                            <td>Branch &amp; IFS Code</td>
                            <td>:</td>
                            <td className="font-semibold">
                              {STORE_INFO.bankIfsc}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="text-right font-semibold mb-4">
                        for {STORE_INFO.name}
                      </div>
                      <div className="text-right">Authorised Signatory</div>
                    </div>
                  </div>

                  <div className="border-t border-black py-1 text-center text-[10px]">
                    This is a Computer Generated Invoice
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

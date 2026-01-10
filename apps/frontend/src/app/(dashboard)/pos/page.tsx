'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  QrCode,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Percent,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Input, Badge } from '@/components/ui';
import { useCartStore } from '@/stores';
import { inventoryAPI, invoicesAPI } from '@/lib/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

export default function POSPage() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const {
    items,
    customerName,
    customerPhone,
    discountPercent,
    discountAmount,
    taxPercent,
    addItem,
    updateItemQuantity,
    removeItem,
    setCustomerInfo,
    setDiscount,
    setTaxPercent,
    clearCart,
    getSubtotal,
    getTotal,
  } = useCartStore();

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = async () => {
    if (!barcodeInput.trim()) return;

    setIsScanning(true);
    try {
      const response = await inventoryAPI.scanBarcode(barcodeInput);
      const product = response.data;

      // Check if already in cart
      const existingItem = items.find((i) => i.product_id === product.id);
      if (existingItem) {
        updateItemQuantity(product.id, existingItem.quantity + 1);
        toast.success(`Added another ${product.name}`);
      } else {
        addItem({
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          barcode: product.barcode,
          quantity: 1,
          unit_price: product.selling_price,
          cost_price: product.cost_price,
          discount_percent: 0,
          discount_amount: 0,
          available_quantity: product.stock_quantity || 0,
        });
        toast.success(`Added ${product.name} to cart`);
      }
      setBarcodeInput('');
    } catch (error) {
      toast.error('Product not found');
    } finally {
      setIsScanning(false);
      barcodeRef.current?.focus();
    }
  };

  // Handle checkout
  const handleCheckout = async (paymentMethod: string) => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!customerName) {
      toast.error('Please enter customer name');
      return;
    }

    setIsProcessing(true);
    try {
      const invoiceData = {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
        })),
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tax_percent: taxPercent,
        payment_method: paymentMethod,
      };

      const response = await invoicesAPI.createInvoice(invoiceData);
      toast.success(`Invoice ${response.data.invoice_number} created!`);
      clearCart();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotal();
  const discountAmt = discountPercent > 0 ? (subtotal * discountPercent) / 100 : discountAmount;
  const taxAmt = taxPercent > 0 ? ((subtotal - discountAmt) * taxPercent) / 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-6"
    >
      {/* Left Side - Product Scanner */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barcode Scanner */}
        <Card className="flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20">
              <QrCode className="w-6 h-6 text-primary-500" />
            </div>
            <div className="flex-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleBarcodeScan();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={barcodeRef}
                  placeholder="Scan barcode or enter SKU..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" isLoading={isScanning}>
                  <Search className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        </Card>

        {/* Cart Items */}
        <Card className="flex-1 overflow-hidden flex flex-col" padding="none">
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Cart ({items.length} items)
              </h2>
              {items.length > 0 && (
                <Button size="sm" variant="ghost" onClick={clearCart}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-12 text-surface-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Scan a barcode to add items</p>
              </div>
            ) : (
              items.map((item) => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 dark:text-white truncate">
                      {item.product_name}
                    </p>
                    <p className="text-sm text-surface-500">{item.product_sku}</p>
                    <p className="text-sm font-medium text-primary-600">
                      {formatCurrency(item.unit_price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.product_id, Math.max(1, item.quantity - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                      disabled={item.quantity >= item.available_quantity}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-right w-24">
                    <p className="font-semibold text-surface-900 dark:text-white">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.product_id)}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Right Side - Checkout */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Customer Info */}
        <Card>
          <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Customer Details
          </h3>
          <div className="space-y-3">
            <Input
              placeholder="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerInfo({ customerName: e.target.value })}
            />
            <Input
              placeholder="Phone Number"
              value={customerPhone}
              onChange={(e) => setCustomerInfo({ customerPhone: e.target.value })}
            />
          </div>
        </Card>

        {/* Discount & Tax */}
        <Card>
          <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Discount & Tax (Optional)
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Discount %"
                type="number"
                min="0"
                max="100"
                value={discountPercent || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0, true)}
                leftIcon={<Percent className="w-4 h-4" />}
              />
              <Input
                placeholder="Tax %"
                type="number"
                min="0"
                value={taxPercent || ''}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                leftIcon={<Percent className="w-4 h-4" />}
              />
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card variant="gradient" className="flex-1">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Order Summary
          </h3>
          <div className="space-y-2 text-white/80">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="flex justify-between text-success-light">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmt)}</span>
              </div>
            )}
            {taxAmt > 0 && (
              <div className="flex justify-between">
                <span>Tax ({taxPercent}%)</span>
                <span>+{formatCurrency(taxAmt)}</span>
              </div>
            )}
            <div className="border-t border-white/20 pt-2 mt-2">
              <div className="flex justify-between text-xl font-bold text-white">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              isLoading={isProcessing}
              onClick={() => handleCheckout('cash')}
              leftIcon={<Banknote className="w-5 h-5" />}
            >
              Pay with Cash
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              isLoading={isProcessing}
              onClick={() => handleCheckout('card')}
              leftIcon={<CreditCard className="w-5 h-5" />}
            >
              Pay with Card
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              isLoading={isProcessing}
              onClick={() => handleCheckout('upi')}
              leftIcon={<Smartphone className="w-5 h-5" />}
            >
              Pay with UPI
            </Button>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

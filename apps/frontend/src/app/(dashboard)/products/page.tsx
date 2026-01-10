'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Package,
  MoreVertical,
  Edit,
  Trash2,
  QrCode,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  Input,
  Card,
  Badge,
  StockStatusBadge,
  ProductStatusBadge,
  SkeletonProductGrid,
} from '@/components/ui';
import { productsAPI } from '@/lib/api';

// Format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ProductsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: async () => {
      const response = await productsAPI.getProducts({
        search: searchQuery || undefined,
      });
      return response.data;
    },
  });

  const products = productsData?.results || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Products
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage your product catalog
          </p>
        </div>
        <Link href="/products/new">
          <Button leftIcon={<Plus className="w-4 h-4" />}>Add Product</Button>
        </Link>
      </div>

      {/* Filters Bar */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:max-w-md">
            <Input
              placeholder="Search products..."
              variant="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
            <div className="flex items-center border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                    : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Products Grid/List */}
      {isLoading ? (
        <SkeletonProductGrid />
      ) : products.length === 0 ? (
        <Card className="py-12">
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto text-surface-400 mb-4" />
            <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
              No products found
            </h3>
            <p className="text-surface-500 mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Get started by adding your first product'}
            </p>
            {!searchQuery && (
              <Link href="/products/new">
                <Button leftIcon={<Plus className="w-4 h-4" />}>Add Product</Button>
              </Link>
            )}
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {products.map((product: any) => (
            <motion.div key={product.id} variants={itemVariants}>
              <Card hover padding="none" className="overflow-hidden group">
                {/* Product Image */}
                <div className="relative aspect-square bg-surface-100 dark:bg-surface-800">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-surface-300 dark:text-surface-600" />
                    </div>
                  )}
                  {/* Quick actions on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/products/${product.id}`}>
                      <Button size="sm" variant="secondary">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button size="sm" variant="secondary">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="secondary">
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Status badge */}
                  <div className="absolute top-3 left-3">
                    <StockStatusBadge status={product.stock_status} />
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">
                        {product.brand_name}
                      </p>
                      <h3 className="font-medium text-surface-900 dark:text-white line-clamp-1">
                        {product.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-xs text-surface-500 mb-3">
                    SKU: {product.sku}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-surface-900 dark:text-white">
                        {formatCurrency(product.selling_price)}
                      </p>
                      <p className="text-xs text-surface-500 line-through">
                        Cost: {formatCurrency(product.cost_price)}
                      </p>
                    </div>
                    <Badge variant="info" size="sm">
                      {product.stock_quantity} in stock
                    </Badge>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* List View */
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    Product
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    SKU
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    Brand
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    Price
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    Stock
                  </th>
                  <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                    Status
                  </th>
                  <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr
                    key={product.id}
                    className="border-b border-surface-200 dark:border-surface-700 table-row-hover"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-surface-400" />
                          )}
                        </div>
                        <span className="font-medium text-surface-900 dark:text-white">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                      {product.sku}
                    </td>
                    <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                      {product.brand_name}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-surface-900 dark:text-white">
                        {formatCurrency(product.selling_price)}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{product.stock_quantity}</span>
                    </td>
                    <td className="p-4">
                      <StockStatusBadge status={product.stock_status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/products/${product.id}`}>
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button size="sm" variant="ghost">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </motion.div>
  );
}

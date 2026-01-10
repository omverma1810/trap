'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Warehouse,
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  StockStatusBadge,
  SkeletonTable,
} from '@/components/ui';
import { inventoryAPI } from '@/lib/api';

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
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default function InventoryPage() {
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await inventoryAPI.getInventory();
      return response.data;
    },
  });

  const { data: lowStockData } = useQuery({
    queryKey: ['lowStock'],
    queryFn: async () => {
      const response = await inventoryAPI.getLowStock();
      return response.data;
    },
  });

  const { data: outOfStockData } = useQuery({
    queryKey: ['outOfStock'],
    queryFn: async () => {
      const response = await inventoryAPI.getOutOfStock();
      return response.data;
    },
  });

  const inventory = inventoryData?.results || [];
  const lowStockCount = lowStockData?.length || 0;
  const outOfStockCount = outOfStockData?.length || 0;
  const inStockCount = inventory.filter((i: any) => i.stock_status === 'in_stock').length;

  const stats = [
    {
      title: 'Total Items',
      value: inventory.length,
      icon: Package,
      iconColor: 'text-primary-500',
      iconBg: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      title: 'In Stock',
      value: inStockCount,
      icon: Warehouse,
      iconColor: 'text-success',
      iconBg: 'bg-success/10',
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      icon: AlertTriangle,
      iconColor: 'text-warning',
      iconBg: 'bg-warning/10',
    },
    {
      title: 'Out of Stock',
      value: outOfStockCount,
      icon: XCircle,
      iconColor: 'text-danger',
      iconBg: 'bg-danger/10',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Inventory
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Track and manage your stock levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <Button leftIcon={<RefreshCw className="w-4 h-4" />}>
            Sync Stock
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full md:max-w-md">
              <Input placeholder="Search inventory..." variant="search" />
            </div>
            <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Inventory Table */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SkeletonTable />
        ) : (
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
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Quantity
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Reserved
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Available
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Reorder Level
                    </th>
                    <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                      Location
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Status
                    </th>
                    <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item: any) => (
                    <tr
                      key={item.id}
                      className="border-b border-surface-200 dark:border-surface-700 table-row-hover"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                            <Package className="w-5 h-5 text-surface-400" />
                          </div>
                          <div>
                            <p className="font-medium text-surface-900 dark:text-white">
                              {item.product?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-surface-500">
                              {item.product?.brand_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                        {item.product?.sku}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium text-surface-900 dark:text-white">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="p-4 text-center text-surface-500">
                        {item.reserved_quantity}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`font-medium ${
                            item.available_quantity <= item.reorder_level
                              ? 'text-warning'
                              : 'text-success'
                          }`}
                        >
                          {item.available_quantity}
                        </span>
                      </td>
                      <td className="p-4 text-center text-surface-500">
                        {item.reorder_level}
                      </td>
                      <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                        {item.warehouse_location || '-'}
                      </td>
                      <td className="p-4 text-center">
                        <StockStatusBadge status={item.stock_status} />
                      </td>
                      <td className="p-4 text-right">
                        <Button size="sm" variant="outline">
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  MoreVertical,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  Input,
  InvoiceStatusBadge,
  SkeletonTable,
} from '@/components/ui';
import { invoicesAPI } from '@/lib/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

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

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', searchQuery],
    queryFn: async () => {
      const response = await invoicesAPI.getInvoices({
        search: searchQuery || undefined,
      });
      return response.data;
    },
  });

  const invoices = invoicesData?.results || [];

  // Calculate stats
  const totalRevenue = invoices.reduce((sum: number, inv: any) => 
    inv.status === 'paid' ? sum + parseFloat(inv.total) : sum, 0
  );
  const pendingAmount = invoices.reduce((sum: number, inv: any) => 
    inv.status === 'pending' ? sum + parseFloat(inv.total) : sum, 0
  );
  const paidCount = invoices.filter((inv: any) => inv.status === 'paid').length;

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: <DollarSign className="w-5 h-5 text-success" />,
      bg: 'bg-success/10',
    },
    {
      title: 'Pending',
      value: formatCurrency(pendingAmount),
      icon: <Clock className="w-5 h-5 text-warning" />,
      bg: 'bg-warning/10',
    },
    {
      title: 'Paid Invoices',
      value: paidCount,
      icon: <CheckCircle className="w-5 h-5 text-primary-500" />,
      bg: 'bg-primary-50 dark:bg-primary-900/20',
    },
    {
      title: 'Total Invoices',
      value: invoices.length,
      icon: <FileText className="w-5 h-5 text-accent-500" />,
      bg: 'bg-accent-50 dark:bg-accent-900/20',
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
            Invoices
          </h1>
          <p className="text-surface-500 dark:text-surface-400">
            Manage and track all invoices
          </p>
        </div>
        <Link href="/pos">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            Create Invoice
          </Button>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-surface-500 dark:text-surface-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-surface-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 w-full md:max-w-md">
              <Input
                placeholder="Search invoices..."
                variant="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
                Filters
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Export
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Invoices Table */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <SkeletonTable />
        ) : invoices.length === 0 ? (
          <Card className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto text-surface-400 mb-4" />
              <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
                No invoices found
              </h3>
              <p className="text-surface-500 mb-4">
                Create your first invoice using Point of Sale
              </p>
              <Link href="/pos">
                <Button leftIcon={<Plus className="w-4 h-4" />}>
                  Create Invoice
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                      Invoice
                    </th>
                    <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                      Customer
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Items
                    </th>
                    <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase">
                      Total
                    </th>
                    <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase">
                      Paid
                    </th>
                    <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase">
                      Status
                    </th>
                    <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase">
                      Date
                    </th>
                    <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice: any) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-surface-200 dark:border-surface-700 table-row-hover"
                    >
                      <td className="p-4">
                        <p className="font-medium text-surface-900 dark:text-white">
                          {invoice.invoice_number}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-surface-900 dark:text-white">
                          {invoice.customer_name}
                        </p>
                        <p className="text-xs text-surface-500">
                          {invoice.customer_phone}
                        </p>
                      </td>
                      <td className="p-4 text-center text-surface-600 dark:text-surface-400">
                        {invoice.items_count}
                      </td>
                      <td className="p-4 text-right font-medium text-surface-900 dark:text-white">
                        {formatCurrency(parseFloat(invoice.total))}
                      </td>
                      <td className="p-4 text-right text-success font-medium">
                        {formatCurrency(parseFloat(invoice.paid_amount))}
                      </td>
                      <td className="p-4 text-center">
                        <InvoiceStatusBadge status={invoice.status} />
                      </td>
                      <td className="p-4 text-sm text-surface-600 dark:text-surface-400">
                        {formatDate(invoice.created_at)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
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
    </motion.div>
  );
}

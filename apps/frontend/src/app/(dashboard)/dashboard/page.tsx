'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, Badge, Button } from '@/components/ui';
import { analyticsAPI } from '@/lib/api';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

// Sample data
const revenueData = [
  { date: 'Mon', revenue: 45000, orders: 12 },
  { date: 'Tue', revenue: 52000, orders: 18 },
  { date: 'Wed', revenue: 48000, orders: 15 },
  { date: 'Thu', revenue: 61000, orders: 22 },
  { date: 'Fri', revenue: 75000, orders: 28 },
  { date: 'Sat', revenue: 82000, orders: 35 },
  { date: 'Sun', revenue: 67000, orders: 25 },
];

const stockData = [
  { name: 'In Stock', value: 65, color: '#22c55e' },
  { name: 'Low Stock', value: 25, color: '#f59e0b' },
  { name: 'Out of Stock', value: 10, color: '#ef4444' },
];

const recentOrders = [
  { id: 'INV-001', customer: 'Rahul Sharma', amount: 12500, status: 'paid', time: '2 min ago' },
  { id: 'INV-002', customer: 'Priya Patel', amount: 8900, status: 'pending', time: '15 min ago' },
  { id: 'INV-003', customer: 'Amit Kumar', amount: 24300, status: 'paid', time: '1 hr ago' },
  { id: 'INV-004', customer: 'Sneha Reddy', amount: 6700, status: 'paid', time: '2 hrs ago' },
];

const topProducts = [
  { name: 'Nike Air Max 97', sales: 156, revenue: 2340000, change: 12 },
  { name: 'Supreme Box Logo', sales: 134, revenue: 1876000, change: -5 },
  { name: 'Jordan 1 Retro', sales: 112, revenue: 1568000, change: 23 },
];

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}

function StatCard({ title, value, change, icon: Icon, gradient, delay = 0 }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl"
           style={{ background: gradient }} />
      <div className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {typeof change === 'number' && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
            }`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </motion.div>
  );
}

// Skeleton loader
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
            <div className="h-4 bg-gray-100 rounded w-20 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const response = await analyticsAPI.getDashboard();
        return response.data;
      } catch {
        return null;
      }
    },
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const stats = [
    {
      title: 'Total Products',
      value: dashboardData?.products?.total || 248,
      change: 12,
      icon: Package,
      gradient: 'from-amber-400 to-amber-600',
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(dashboardData?.today?.revenue || 430000),
      change: 8.5,
      icon: DollarSign,
      gradient: 'from-emerald-400 to-emerald-600',
    },
    {
      title: "Today's Orders",
      value: dashboardData?.today?.orders || 57,
      change: -2.4,
      icon: ShoppingCart,
      gradient: 'from-blue-400 to-blue-600',
    },
    {
      title: 'Low Stock Alerts',
      value: dashboardData?.products?.low_stock || 12,
      icon: AlertTriangle,
      gradient: 'from-orange-400 to-red-500',
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
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-0.5">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">Download Report</Button>
          <Button size="sm">+ New Sale</Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => (
          <StatCard key={stat.title} {...stat} delay={index * 0.1} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                <p className="text-sm text-gray-500">Last 7 days performance</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">
                  <TrendingUp className="w-3 h-3 mr-1" /> +15.3%
                </Badge>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b8860b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#b8860b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      padding: '12px 16px',
                    }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#b8860b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Stock Status */}
        <motion.div variants={itemVariants}>
          <Card padding="lg" className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Stock Status</h3>
              <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                View All
              </button>
            </div>
            <div className="flex flex-col items-center">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stockData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full space-y-3 mt-4">
                {stockData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <motion.div variants={itemVariants}>
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.customer}</p>
                      <p className="text-xs text-gray-500">{order.id} • {order.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.amount)}</p>
                      <Badge variant={order.status === 'paid' ? 'success' : 'warning'} size="sm">
                        {order.status}
                      </Badge>
                    </div>
                    <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white rounded-lg transition-all">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Top Products */}
        <motion.div variants={itemVariants}>
          <Card padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Selling Products</h3>
              <button className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <motion.div
                  key={product.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center font-bold text-gray-600">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                    <div className={`flex items-center justify-end gap-1 text-xs font-medium ${
                      product.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {Math.abs(product.change)}%
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Profit Summary Card */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-8 text-white">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-amber-100 text-sm font-medium mb-2">This Month&apos;s Profit</p>
              <p className="text-4xl font-bold mb-2">
                {formatCurrency(dashboardData?.month?.profit || 1250000)}
              </p>
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" />
                <span className="font-medium">+23.5% from last month</span>
              </div>
            </div>
            <Button
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              View Full Report
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

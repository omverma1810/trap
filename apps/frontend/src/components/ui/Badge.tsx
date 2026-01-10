'use client';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'bg-charcoal-100 text-charcoal-700',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  gold: 'bg-primary-50 text-primary-700 border border-primary-200',
  outline: 'border border-charcoal-300 text-charcoal-600',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-md
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

// Stock status badge
export function StockStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    in_stock: { label: 'In Stock', variant: 'success' },
    low_stock: { label: 'Low Stock', variant: 'warning' },
    out_of_stock: { label: 'Out of Stock', variant: 'danger' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Invoice status badge
export function InvoiceStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    draft: { label: 'Draft', variant: 'outline' },
    pending: { label: 'Pending', variant: 'warning' },
    paid: { label: 'Paid', variant: 'success' },
    partially_paid: { label: 'Partial', variant: 'gold' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    refunded: { label: 'Refunded', variant: 'danger' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// Product status badge
export function ProductStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'outline' },
    discontinued: { label: 'Discontinued', variant: 'danger' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

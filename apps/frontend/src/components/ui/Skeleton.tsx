'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`bg-charcoal-100 animate-pulse ${variantStyles[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

// Preset skeleton components
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-charcoal-200">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" className="w-3/4 mb-2" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton className="w-full h-24 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-6" />
        <Skeleton className="w-16 h-6" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-white rounded-xl border border-charcoal-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-charcoal-200 bg-charcoal-50">
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="text" className="flex-1 h-4" />
          ))}
        </div>
      </div>
      {/* Rows */}
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="p-4 border-b border-charcoal-100 last:border-0"
        >
          <div className="flex gap-4 items-center">
            <Skeleton className="w-10 h-10" />
            {[1, 2, 3, 4].map((col) => (
              <Skeleton key={col} variant="text" className="flex-1 h-4" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-5 border border-charcoal-200"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton variant="text" className="w-20 h-4" />
            <Skeleton variant="circular" width={32} height={32} />
          </div>
          <Skeleton variant="text" className="w-24 h-8 mb-2" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProductGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="bg-white rounded-xl overflow-hidden border border-charcoal-200"
        >
          <Skeleton className="w-full h-48" />
          <div className="p-4">
            <Skeleton variant="text" className="w-3/4 mb-2" />
            <Skeleton variant="text" className="w-1/2 mb-4" />
            <div className="flex justify-between items-center">
              <Skeleton className="w-16 h-6" />
              <Skeleton className="w-20 h-8 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

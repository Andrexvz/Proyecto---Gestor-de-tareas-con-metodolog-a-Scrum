import React from 'react';
import { cn } from '../../lib/utils';

export type SkeletonVariant = 'text' | 'circle' | 'card' | 'button' | 'custom';

export interface SkeletonLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function SkeletonLoader({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  style,
  ...props
}: SkeletonLoaderProps) {
  const customStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  const variantStyles: Record<SkeletonVariant, string> = {
    text: 'h-4 w-full rounded-sm',
    circle: 'rounded-full w-8 h-8',
    card: 'h-32 w-full rounded-cards',
    button: 'h-9 w-24 rounded-buttons',
    custom: 'rounded-inputs',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2 w-full" aria-busy="true" aria-live="polite">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton-wave bg-carbon rounded-sm motion-reduce:animate-none',
              i === lines - 1 ? 'w-3/4 h-3.5' : 'w-full h-3.5',
              className
            )}
            style={customStyle}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'skeleton-wave bg-carbon motion-reduce:animate-none',
        variantStyles[variant],
        className
      )}
      style={customStyle}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-cards bg-obsidian border border-graphite p-5 space-y-4',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <SkeletonLoader variant="text" width="40%" height={16} />
        <SkeletonLoader variant="circle" width={24} height={24} />
      </div>
      <SkeletonLoader variant="text" lines={2} />
      <div className="pt-3 border-t border-graphite flex items-center justify-between">
        <SkeletonLoader variant="text" width="30%" height={12} />
        <SkeletonLoader variant="button" width={70} height={28} />
      </div>
    </div>
  );
}

export function SkeletonKpi({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-carbon border border-graphite/80 min-h-[175px] flex flex-col justify-between relative overflow-hidden',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <SkeletonLoader variant="text" width={120} height={16} />
        <SkeletonLoader variant="circle" width={32} height={32} />
      </div>
      <div className="mt-2 space-y-1">
        <div className="flex items-baseline gap-2">
          <SkeletonLoader variant="text" width={60} height={32} />
          <SkeletonLoader variant="custom" width={75} height={20} className="rounded-full" />
        </div>
        <SkeletonLoader variant="text" width={140} height={12} />
      </div>
      <div className="mt-3 pt-1 border-t border-graphite/40">
        <div className="h-7 w-full rounded bg-graphite/40 animate-gpu-pulse" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-carbon border border-graphite/80 min-h-[365px] flex flex-col justify-between relative overflow-hidden',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center justify-between mb-4">
        <SkeletonLoader variant="text" width={190} height={20} />
        <SkeletonLoader variant="text" width={85} height={16} />
      </div>
      <div className="flex-1 w-full flex items-center justify-center my-3">
        <div className="w-full h-48 rounded-xl bg-graphite/40 animate-gpu-pulse" />
      </div>
      <div className="pt-3 border-t border-graphite/40">
        <SkeletonLoader variant="text" width="100%" height={14} />
      </div>
    </div>
  );
}

export function SkeletonProjectCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-carbon border border-graphite/80 min-h-[265px] flex flex-col justify-between gap-5 relative overflow-hidden',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SkeletonLoader variant="custom" width={28} height={28} className="rounded-lg" />
            <SkeletonLoader variant="text" width={55} height={18} />
            <SkeletonLoader variant="custom" width={80} height={20} className="rounded-full" />
          </div>
          <SkeletonLoader variant="text" width={40} height={16} />
        </div>

        <div className="space-y-1.5 pt-1">
          <SkeletonLoader variant="text" width="70%" height={20} />
          <SkeletonLoader variant="text" lines={2} />
        </div>
      </div>

      <div className="space-y-3 pt-3.5 border-t border-graphite/70">
        <div className="flex items-center justify-between">
          <SkeletonLoader variant="text" width={90} height={14} />
          <SkeletonLoader variant="text" width={50} height={14} />
        </div>
        <div className="h-2 w-full rounded-full bg-graphite/50 animate-gpu-pulse" />
        <div className="flex items-center justify-between pt-1">
          <SkeletonLoader variant="button" width={90} height={26} />
          <SkeletonLoader variant="button" width={90} height={26} />
        </div>
      </div>
    </div>
  );
}

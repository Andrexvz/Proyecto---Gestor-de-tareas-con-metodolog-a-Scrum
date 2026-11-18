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

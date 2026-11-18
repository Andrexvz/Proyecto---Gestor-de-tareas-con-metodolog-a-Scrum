import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeShape = 'pill' | 'rounded' | 'badge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  dot?: boolean;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  shape = 'pill',
  dot = false,
  icon,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    default: {
      container: 'bg-graphite text-mist border-smoke',
      dot: 'bg-fog',
    },
    primary: {
      container: 'bg-iris-violet/15 text-iris-violet border-iris-violet/30',
      dot: 'bg-iris-violet',
    },
    success: {
      container: 'bg-pulse-green/15 text-pulse-green border-pulse-green/30',
      dot: 'bg-pulse-green',
    },
    warning: {
      container: 'bg-acid-lime/15 text-acid-lime border-acid-lime/30',
      dot: 'bg-acid-lime',
    },
    danger: {
      container: 'bg-coral-red/15 text-coral-red border-coral-red/30',
      dot: 'bg-coral-red',
    },
    info: {
      container: 'bg-signal-teal/15 text-signal-teal border-signal-teal/30',
      dot: 'bg-signal-teal',
    },
    purple: {
      container: 'bg-lavender/15 text-lavender border-lavender/30',
      dot: 'bg-lavender',
    },
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-0.5 text-[11px] gap-1.5',
    lg: 'px-2.5 py-1 text-[12px] gap-1.5',
  };

  const shapeStyles: Record<BadgeShape, string> = {
    pill: 'rounded-pills',
    rounded: 'rounded-inputs',
    badge: 'rounded-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border whitespace-nowrap select-none',
        variantStyles[variant].container,
        sizeStyles[size],
        shapeStyles[shape],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', variantStyles[variant].dot)}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

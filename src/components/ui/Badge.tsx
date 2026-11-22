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
      container: 'bg-graphite/70 text-mist border-smoke/60',
      dot: 'bg-fog',
    },
    primary: {
      container: 'bg-iris-violet/15 text-iris-violet border-iris-violet/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]',
      dot: 'bg-iris-violet shadow-[0_0_6px_#A855F7]',
    },
    success: {
      container: 'bg-pulse-green/15 text-pulse-green border-pulse-green/30 shadow-[0_0_8px_rgba(48,217,155,0.15)]',
      dot: 'bg-pulse-green shadow-[0_0_6px_#30D99B]',
    },
    warning: {
      container: 'bg-acid-lime/15 text-acid-lime border-acid-lime/30 shadow-[0_0_8px_rgba(251,191,36,0.15)]',
      dot: 'bg-acid-lime shadow-[0_0_6px_#FBBF24]',
    },
    danger: {
      container: 'bg-coral-red/15 text-coral-red border-coral-red/30 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
      dot: 'bg-coral-red shadow-[0_0_6px_#F43F5E]',
    },
    info: {
      container: 'bg-signal-teal/15 text-signal-teal border-signal-teal/30 shadow-[0_0_8px_rgba(25,217,232,0.15)]',
      dot: 'bg-signal-teal shadow-[0_0_6px_#19D9E8]',
    },
    purple: {
      container: 'bg-lavender/15 text-lavender border-lavender/30 shadow-[0_0_8px_rgba(192,132,252,0.15)]',
      dot: 'bg-lavender shadow-[0_0_6px_#C084FC]',
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

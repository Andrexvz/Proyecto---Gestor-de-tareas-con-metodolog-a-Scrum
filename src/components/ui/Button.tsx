import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-iris-violet hover:bg-iris-violet/90 text-paper border border-iris-violet/30 shadow-sm active:scale-[0.98]',
      secondary:
        'bg-graphite hover:bg-smoke text-bone border border-graphite hover:border-smoke active:scale-[0.98]',
      outline:
        'bg-transparent hover:bg-graphite/40 text-mist hover:text-paper border border-graphite hover:border-smoke active:scale-[0.98]',
      ghost:
        'bg-transparent hover:bg-graphite/40 text-mist hover:text-paper active:scale-[0.98]',
      danger:
        'bg-coral-red hover:bg-coral-red/90 text-paper border border-coral-red/30 shadow-sm active:scale-[0.98]',
      accent:
        'bg-signal-teal hover:bg-signal-teal/90 text-void font-semibold border border-signal-teal/40 shadow-sm active:scale-[0.98]',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-[11px] rounded-inputs gap-1',
      sm: 'px-2.5 py-1.5 text-[12px] rounded-inputs gap-1.5',
      md: 'px-3.5 py-2 text-[13px] rounded-buttons gap-2',
      lg: 'px-5 py-2.5 text-[14px] rounded-buttons gap-2.5',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium whitespace-nowrap select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-violet/60 focus-visible:ring-offset-2 focus-visible:ring-offset-void',
          'motion-safe:transition-all motion-reduce:transition-none duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-inherit',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon && <span className="shrink-0" aria-hidden="true">{icon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

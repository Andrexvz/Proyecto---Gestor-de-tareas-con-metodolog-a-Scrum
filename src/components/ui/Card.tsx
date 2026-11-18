import React from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'carbon' | 'interactive' | 'outline';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({
  className,
  variant = 'default',
  children,
  ...props
}: CardProps) {
  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-obsidian border-graphite shadow-subtle',
    carbon: 'bg-carbon border-graphite shadow-subtle',
    interactive:
      'bg-obsidian border-graphite hover:border-smoke hover:bg-graphite/30 transition-all duration-150 cursor-pointer active:scale-[0.99] shadow-subtle',
    outline: 'bg-transparent border-graphite',
  };

  return (
    <div
      className={cn(
        'rounded-cards border text-mist',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-4 border-b border-graphite flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-[15px] font-semibold text-bone tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[12px] text-fog leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3.5 border-t border-graphite flex items-center justify-end gap-2.5', className)}
      {...props}
    >
      {children}
    </div>
  );
}

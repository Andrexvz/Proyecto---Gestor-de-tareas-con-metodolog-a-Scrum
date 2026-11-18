import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-cards bg-carbon/50 border border-graphite text-center flex flex-col items-center justify-center',
        compact ? 'p-6 sm:p-8 space-y-3' : 'p-8 sm:p-12 space-y-4',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'rounded-cards bg-obsidian border border-graphite text-fog flex items-center justify-center shrink-0 shadow-subtle',
          compact ? 'w-10 h-10' : 'w-12 h-12'
        )}
        aria-hidden="true"
      >
        {icon || <Inbox className={compact ? 'w-5 h-5' : 'w-6 h-6'} />}
      </div>

      <div className="space-y-1 max-w-md mx-auto">
        <h4 className="text-[14px] sm:text-[15px] font-semibold text-bone tracking-tight">
          {title}
        </h4>
        {description && (
          <p className="text-[12px] sm:text-[13px] text-fog leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

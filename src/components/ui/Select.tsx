import React, { forwardRef, useId } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  wrapperClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      children,
      id,
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[12px] font-medium text-mist select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'w-full pl-3.5 pr-9 py-2.5 bg-carbon border rounded-inputs text-[13px] text-bone appearance-none cursor-pointer',
              'focus:outline-none focus:ring-1 motion-safe:transition-all motion-reduce:transition-none duration-150 shadow-subtle',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-coral-red/60 text-coral-red focus:border-coral-red focus:ring-coral-red/30'
                : 'border-graphite hover:border-smoke focus:border-iris-violet focus:ring-iris-violet/40',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-obsidian text-bone py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div
            className="absolute right-3 pointer-events-none text-fog flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p
            id={errorId}
            className="flex items-center gap-1 text-[12px] text-coral-red mt-1 motion-safe:animate-in motion-safe:fade-in-50"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[11px] text-fog mt-1">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      rightElement,
      id,
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[12px] font-medium text-mist select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div
              className="absolute left-3.5 text-fog pointer-events-none flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'w-full px-3.5 py-2.5 bg-carbon border rounded-inputs text-[13px] text-bone placeholder:text-ash',
              'focus:outline-none focus:ring-1 motion-safe:transition-all motion-reduce:transition-none duration-150 shadow-subtle',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon ? 'pl-10' : undefined,
              rightElement ? 'pr-10' : undefined,
              error
                ? 'border-coral-red/60 text-coral-red focus:border-coral-red focus:ring-coral-red/30'
                : 'border-graphite hover:border-smoke focus:border-iris-violet focus:ring-iris-violet/40'
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 text-fog flex items-center justify-center shrink-0">
              {rightElement}
            </div>
          )}
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

Input.displayName = 'Input';

import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      showCount = false,
      maxLength,
      value,
      id,
      className,
      wrapperClassName,
      rows = 3,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={textareaId}
              className="block text-[12px] font-medium text-mist select-none"
            >
              {label}
            </label>
          )}
          {showCount && maxLength !== undefined && (
            <span
              className={cn(
                'text-[11px] font-mono tabular-nums',
                currentLength >= maxLength ? 'text-coral-red' : 'text-fog'
              )}
            >
              {`${currentLength}/${maxLength}`}
            </span>
          )}
        </div>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'w-full px-3.5 py-2.5 bg-carbon border rounded-inputs text-[13px] text-bone placeholder:text-ash resize-y',
            'focus:outline-none focus:ring-1 motion-safe:transition-all motion-reduce:transition-none duration-150 shadow-subtle',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-coral-red/60 text-coral-red focus:border-coral-red focus:ring-coral-red/30'
              : 'border-graphite hover:border-smoke focus:border-iris-violet focus:ring-iris-violet/40'
          )}
          {...props}
        />
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

Textarea.displayName = 'Textarea';

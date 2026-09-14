import React, { forwardRef, useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      prefixIcon,
      suffixIcon,
      className = "",
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : generatedId);

    const descId = error || hint ? `${inputId}-desc` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none flex items-center select-none">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={descId}
            className={`w-full rounded-md border bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] disabled:bg-[var(--bg-surface-subtle)] disabled:cursor-not-allowed ${
              prefixIcon ? "pl-9" : ""
            } ${suffixIcon ? "pr-9" : ""} ${
              error
                ? "border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                : "border-[var(--border-ledger)]"
            } ${className}`}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 text-[var(--text-muted)] pointer-events-none flex items-center select-none">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={descId} className="mt-1 text-xs text-[#DC2626]">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={descId} className="mt-1 text-xs text-[var(--text-muted)]">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

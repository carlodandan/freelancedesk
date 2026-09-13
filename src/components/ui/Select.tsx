import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const descId = error || hint ? `${selectId}-desc` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={descId}
            className={`w-full appearance-none rounded-md border bg-[var(--bg-surface)] px-3 py-1.5 pr-8 text-sm text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] disabled:bg-[var(--bg-surface-subtle)] disabled:cursor-not-allowed cursor-pointer ${
              error
                ? "border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
                : "border-[var(--border-ledger)]"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-2.5 pointer-events-none text-[var(--text-muted)] flex items-center">
            <ChevronDown size={15} />
          </div>
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
  }
);

Select.displayName = "Select";


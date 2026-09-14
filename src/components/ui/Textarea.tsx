import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, rows = 3, ...props }, ref) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const descId = error || hint ? `${textareaId}-desc` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5 select-none"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={descId}
          className={`w-full rounded-md border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25 focus:border-[var(--accent)] disabled:bg-[var(--bg-surface-subtle)] disabled:cursor-not-allowed resize-y ${
            error
              ? "border-[#DC2626] focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
              : "border-[var(--border-ledger)]"
          } ${className}`}
          {...props}
        />
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

Textarea.displayName = "Textarea";

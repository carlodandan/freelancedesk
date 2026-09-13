import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
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
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#57534E] uppercase tracking-wider mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefixIcon && (
            <div className="absolute left-3 text-[#8C867A] pointer-events-none flex items-center">
              {prefixIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-md border bg-white px-3 py-1.5 text-sm text-[#1C1917] transition-colors placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20 focus:border-[#854D0E] disabled:bg-[#F5F2EB] disabled:cursor-not-allowed ${
              prefixIcon ? "pl-9" : ""
            } ${suffixIcon ? "pr-9" : ""} ${
              error
                ? "border-[#EF4444] focus:ring-[#EF4444]/20 focus:border-[#EF4444]"
                : "border-[#E5E0D5]"
            } ${className}`}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 text-[#8C867A] pointer-events-none flex items-center">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-[#8C867A]">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

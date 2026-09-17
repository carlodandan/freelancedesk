import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      icon,
      className = "",
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-md select-none cursor-pointer active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const sizeClasses = {
      sm: "px-2.5 py-1 text-xs gap-1.5",
      md: "px-3.5 py-1.5 text-sm gap-2",
      lg: "px-4 py-2 text-base gap-2.5",
    }[size];

    const variantClasses = {
      primary:
        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:opacity-90 border border-[var(--accent-hover)] shadow-xs",
      secondary:
        "bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] active:bg-[var(--border-ledger-subtle)] border border-[var(--border-ledger)] shadow-2xs",
      ghost:
        "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)] hover:text-[var(--text-primary)]",
      danger:
        "bg-white text-[#B91C1C] hover:bg-[#FEF2F2] active:bg-[#FEE2E2] border border-[#FCA5A5] shadow-2xs",
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
        disabled={disabled}
        {...props}
      >
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        {children}
      </button>
    );
  },
);

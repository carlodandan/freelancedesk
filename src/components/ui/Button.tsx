import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded-md select-none focus:outline-none focus:ring-2 focus:ring-[#854D0E]/20 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-sm gap-2",
    lg: "px-4 py-2 text-base gap-2.5",
  }[size];

  const variantClasses = {
    primary:
      "bg-[#854D0E] text-white hover:bg-[#713F12] active:bg-[#5C330F] border border-[#713F12]",
    secondary:
      "bg-white text-[#1C1917] hover:bg-[#F7F5F0] active:bg-[#ECE8DE] border border-[#E5E0D5] shadow-xs",
    ghost:
      "bg-transparent text-[#57534E] hover:bg-[#F4F1EA] hover:text-[#1C1917]",
    danger:
      "bg-white text-[#B91C1C] hover:bg-[#FEF2F2] active:bg-[#FEE2E2] border border-[#FCA5A5]",
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

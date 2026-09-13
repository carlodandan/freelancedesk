import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "neutral" | "success" | "warning" | "danger" | "info";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  dot = false,
  className = "",
}) => {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  const variantStyles = {
    neutral: {
      badge: "bg-[#F4F1EA] text-[#57534E] border border-[#E5E0D5]",
      dot: "bg-[#8C867A]",
    },
    success: {
      badge: "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]",
      dot: "bg-[#22C55E]",
    },
    warning: {
      badge: "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]",
      dot: "bg-[#F59E0B]",
    },
    danger: {
      badge: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]",
      dot: "bg-[#EF4444]",
    },
    info: {
      badge: "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]",
      dot: "bg-[#3B82F6]",
    },
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-medium ${sizeClasses} ${variantStyles.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${variantStyles.dot}`} />}
      {children}
    </span>
  );
};

import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  badge,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#E5E0D5] rounded-xl shadow-2xs my-6">
      {badge && (
        <span className="mb-4 px-2.5 py-0.5 rounded-full bg-[#F4F1EA] text-[#854D0E] text-[10px] font-mono font-semibold uppercase tracking-wider border border-[#E5E0D5]">
          {badge}
        </span>
      )}
      {icon && (
        <div className="p-3 mb-4 rounded-full bg-[#FAF8F5] border border-[#ECE8DE] text-[#8C867A]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[#1C1917] tracking-tight">{title}</h3>
      <p className="mt-1.5 text-xs text-[#78716C] max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button variant="primary" size="sm" icon={actionIcon} onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

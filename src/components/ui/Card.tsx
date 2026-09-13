import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  action,
  footer,
  noPadding = false,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-[#E5E0D5] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden ${className}`}
      {...props}
    >
      {(header || action) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E0D5] bg-[#FAF8F5]">
          <div className="text-sm font-semibold text-[#1C1917] tracking-tight">{header}</div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-[#ECE8DE] bg-[#FAF8F5] text-xs text-[#57534E]">
          {footer}
        </div>
      )}
    </div>
  );
};

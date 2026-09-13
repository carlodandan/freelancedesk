import React from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "../ui/Button";

interface HeaderProps {
  freelancerName?: string;
  businessName?: string;
  onOpenSearch: () => void;
  onQuickAction?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  freelancerName = "Freelancer",
  businessName = "Creative Studio",
  onOpenSearch,
  onQuickAction,
}) => {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="h-16 px-8 border-b border-[#E5E0D5] bg-[#FAF8F5] flex items-center justify-between shrink-0 select-none">
      {/* Date & Greeting */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-semibold text-[#1C1917] tracking-tight">
          {getGreeting()}, {freelancerName}
        </h1>
        {businessName && (
          <>
            <span className="text-xs text-[#8C867A] font-medium">•</span>
            <span className="text-xs text-[#78716C] font-medium">{businessName}</span>
          </>
        )}
        <span className="text-xs text-[#8C867A] font-medium">•</span>
        <span className="text-xs text-[#57534E] font-medium tracking-wide">
          {dateFormatted}
        </span>
      </div>

      {/* Center Search & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Ctrl+K Search Trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-md border border-[#E5E0D5] bg-white text-xs text-[#8C867A] hover:border-[#D5CEBF] hover:text-[#57534E] transition-colors shadow-2xs"
          title="Global Search (Ctrl+K)"
        >
          <Search size={14} className="text-[#8C867A]" />
          <span>Search records...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#F4F1EA] border border-[#E5E0D5] text-[10px] font-mono text-[#57534E]">
            Ctrl K
          </kbd>
        </button>

        {onQuickAction && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={onQuickAction}
          >
            New Entry
          </Button>
        )}
      </div>
    </header>
  );
};

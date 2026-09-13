import React, { useState, useEffect, useRef } from "react";
import { Search, Users, Briefcase, Sparkles, CreditCard, Receipt, FileText, ArrowRight } from "lucide-react";
import { NavigationTab } from "../../types/navigation";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNavItems: { tab: NavigationTab; label: string; icon: React.ReactNode; desc: string }[] = [
    { tab: "clients", label: "Clients", icon: <Users size={16} />, desc: "Client contacts, accounts & balances" },
    { tab: "projects", label: "Projects", icon: <Briefcase size={16} />, desc: "Active project milestones & deadlines" },
    { tab: "commissions", label: "Commissions", icon: <Sparkles size={16} />, desc: "Job orders, deposits & delivery status" },
    { tab: "payments", label: "Payments", icon: <CreditCard size={16} />, desc: "Logged payments & receipts" },
    { tab: "expenses", label: "Expenses", icon: <Receipt size={16} />, desc: "Business expenses & deductibles" },
    { tab: "invoices", label: "Invoices", icon: <FileText size={16} />, desc: "Generated client invoices" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/40 backdrop-blur-[1px] animate-in fade-in duration-100">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl bg-white border border-[#E5E0D5] rounded-xl shadow-2xl overflow-hidden z-10">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-[#E5E0D5] bg-[#FAF8F5]">
          <Search size={18} className="text-[#8C867A] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search clients, projects, commissions, payments..."
            className="w-full py-3.5 text-sm bg-transparent text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[#F4F1EA] border border-[#E5E0D5] text-[10px] font-mono text-[#78716C]">
            ESC
          </kbd>
        </div>

        {/* Search Content */}
        <div className="p-3 max-h-96 overflow-y-auto">
          {query.trim().length === 0 ? (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-[#8C867A] uppercase tracking-wider">
                Quick Navigation
              </div>
              <div className="mt-1 space-y-0.5">
                {quickNavItems.map((item) => (
                  <button
                    key={item.tab}
                    onClick={() => onNavigate(item.tab)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-[#F7F4ED] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded bg-[#F4F1EA] text-[#854D0E] group-hover:bg-[#EFE9DC]">
                        {item.icon}
                      </span>
                      <div>
                        <div className="text-xs font-medium text-[#1C1917]">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-[#78716C]">{item.desc}</div>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-[#A8A29E] group-hover:text-[#1C1917] group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="text-xs text-[#57534E]">
                Searching for <span className="font-semibold text-[#1C1917]">"{query}"</span>
              </div>
              <p className="mt-1 text-[11px] text-[#8C867A]">
                Global search index will populate as records are created.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-[#ECE8DE] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#8C867A]">
          <span>FreelanceDesk Offline Search</span>
          <span>Navigation: ↑ ↓ • Open: Enter</span>
        </div>
      </div>
    </div>
  );
};

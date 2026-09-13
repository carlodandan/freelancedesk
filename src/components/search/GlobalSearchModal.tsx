import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Users,
  Briefcase,
  Sparkles,
  CreditCard,
  FileText,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { NavigationTab } from "../../types/navigation";
import { SearchResultEntry } from "../../types/entities";
import { tauriService } from "../../services/tauri";
import { formatCents } from "../../services/currency";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavigationTab) => void;
  currencySymbol?: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currencySymbol = "₱",
}) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults([]);
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

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await tauriService.globalSearch(trimmed);
        setResults(res?.results || []);
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const quickNavItems: {
    tab: NavigationTab;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    { tab: "clients", label: "Clients", icon: <Users size={16} />, desc: "Client contacts, accounts & balances" },
    { tab: "projects", label: "Projects", icon: <Briefcase size={16} />, desc: "Active project milestones & deadlines" },
    { tab: "commissions", label: "Commissions", icon: <Sparkles size={16} />, desc: "Job orders, deposits & delivery status" },
    { tab: "payments", label: "Payments", icon: <CreditCard size={16} />, desc: "Logged payments & receipts" },
    { tab: "expenses", label: "Expenses", icon: <Receipt size={16} />, desc: "Business expenses & deductibles" },
    { tab: "invoices", label: "Invoices", icon: <FileText size={16} />, desc: "Generated client invoices" },
  ];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Users size={15} />;
      case "project":
        return <Briefcase size={15} />;
      case "commission":
        return <Sparkles size={15} />;
      case "payment":
        return <CreditCard size={15} />;
      case "invoice":
        return <FileText size={15} />;
      default:
        return <Search size={15} />;
    }
  };

  const handleResultClick = (entry: SearchResultEntry) => {
    switch (entry.entity_type) {
      case "client":
        onNavigate("clients");
        break;
      case "project":
        onNavigate("projects");
        break;
      case "commission":
        onNavigate("commissions");
        break;
      case "payment":
        onNavigate("payments");
        break;
      case "invoice":
        onNavigate("invoices");
        break;
      default:
        onNavigate("dashboard");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-[1px]">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-xl bg-white border border-[#E5E0D5] rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[#E5E0D5] bg-[#FAF8F5]">
          <Search size={18} className="text-[#8C867A] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, projects, commissions, payments, invoices..."
            className="w-full py-3.5 text-sm bg-transparent text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none"
          />
          {isSearching && (
            <span className="text-[11px] text-[#8C867A] animate-pulse mr-2">
              Searching...
            </span>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-[#F4F1EA] border border-[#E5E0D5] text-[10px] font-mono text-[#78716C]">
            ESC
          </kbd>
        </div>

        {/* Results / Navigation Body */}
        <div className="p-3 overflow-y-auto flex-1">
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
                        <div className="text-[11px] text-[#78716C]">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-[#A8A29E] group-hover:text-[#1C1917] group-hover:translate-x-0.5 transition-all"
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (results?.length ?? 0) > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[#8C867A] uppercase tracking-wider">
                Matching Records ({results.length})
              </div>
              {results.map((entry) => (
                <button
                  key={`${entry.entity_type}-${entry.id}`}
                  onClick={() => handleResultClick(entry)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-[#FAF8F5] border border-transparent hover:border-[#E5E0D5] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded bg-[#F4F1EA] text-[#854D0E]">
                      {getEntityIcon(entry.entity_type)}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-[#1C1917]">
                        {entry.title}
                      </div>
                      <div className="text-[11px] text-[#78716C]">
                        {entry.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {entry.amount_cents !== null && entry.amount_cents !== undefined && (
                      <div className="text-xs font-mono font-bold text-[#1C1917] tabular-nums">
                        {formatCents(entry.amount_cents, currencySymbol)}
                      </div>
                    )}
                    {entry.status && (
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-[#F4F1EA] text-[10px] font-medium text-[#57534E] capitalize border border-[#E5E0D5]">
                        {entry.status}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            !isSearching && (
              <div className="py-12 text-center text-xs text-[#8C867A]">
                No matching records found for "{query}".
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#ECE8DE] bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#8C867A]">
          <span>FreelanceDesk Offline Search</span>
          <span>Close: ESC • Navigate: Click</span>
        </div>
      </div>
    </div>
  );
};

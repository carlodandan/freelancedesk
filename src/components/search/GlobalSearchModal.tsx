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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchReqIdRef = useRef(0);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current =
        document.activeElement as HTMLElement | null;
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      previousActiveElementRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, results]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      const totalItems =
        query.trim().length === 0 ? quickNavItems.length : results.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          totalItems > 0 ? (prev + 1) % totalItems : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          totalItems > 0 ? (prev - 1 + totalItems) % totalItems : 0,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (query.trim().length === 0) {
          if (quickNavItems[selectedIndex]) {
            onNavigate(quickNavItems[selectedIndex].tab);
            onClose();
          }
        } else if (results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, query, results, selectedIndex]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const currentReqId = ++searchReqIdRef.current;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await tauriService.globalSearch(trimmed);
        if (currentReqId === searchReqIdRef.current) {
          setResults(res?.results || []);
        }
      } catch (err) {
        if (currentReqId === searchReqIdRef.current) {
          console.error("Global search error:", err);
        }
      } finally {
        if (currentReqId === searchReqIdRef.current) {
          setIsSearching(false);
        }
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
    {
      tab: "clients",
      label: "Clients",
      icon: <Users size={16} />,
      desc: "Client contacts, accounts & balances",
    },
    {
      tab: "projects",
      label: "Projects",
      icon: <Briefcase size={16} />,
      desc: "Active project milestones & deadlines",
    },
    {
      tab: "commissions",
      label: "Commissions",
      icon: <Sparkles size={16} />,
      desc: "Job orders, deposits & delivery status",
    },
    {
      tab: "payments",
      label: "Payments",
      icon: <CreditCard size={16} />,
      desc: "Logged payments & receipts",
    },
    {
      tab: "expenses",
      label: "Expenses",
      icon: <Receipt size={16} />,
      desc: "Business expenses & deductibles",
    },
    {
      tab: "invoices",
      label: "Invoices",
      icon: <FileText size={16} />,
      desc: "Generated client invoices",
    },
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

      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-ledger)] rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-[var(--border-ledger)] bg-[var(--bg-surface-subtle)]">
          <Search
            size={18}
            className="text-[var(--text-muted)] shrink-0 mr-3"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, projects, commissions, payments, invoices..."
            className="w-full py-3.5 text-sm bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {isSearching && (
            <span className="text-[11px] text-[var(--text-muted)] animate-pulse mr-2">
              Searching...
            </span>
          )}
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-ledger)] text-[10px] font-mono text-[var(--text-secondary)]">
            ESC
          </kbd>
        </div>

        {/* Results / Navigation Body */}
        <div className="p-3 overflow-y-auto flex-1">
          {query.trim().length === 0 ? (
            <div>
              <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider select-none">
                Quick Navigation
              </div>
              <div className="mt-1 space-y-0.5">
                {quickNavItems.map((item, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => onNavigate(item.tab)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer group ${
                        isSelected
                          ? "bg-[var(--bg-surface-subtle)] border border-[var(--border-ledger)]"
                          : "hover:bg-[var(--bg-surface-subtle)] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`p-1.5 rounded transition-colors ${
                            isSelected
                              ? "bg-[var(--accent)] text-white"
                              : "bg-[var(--bg-surface-subtle)] text-[var(--accent)] group-hover:bg-[var(--border-ledger-subtle)]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-[var(--text-primary)]">
                            {item.label}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)]">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight
                        size={14}
                        className={`transition-all ${
                          isSelected
                            ? "text-[var(--text-primary)] translate-x-0.5"
                            : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (results?.length ?? 0) > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider select-none">
                Matching Records ({results.length})
              </div>
              {results.map((entry, idx) => {
                const isSelected = selectedIndex === idx;
                return (
                  <button
                    key={`${entry.entity_type}-${entry.id}`}
                    onClick={() => handleResultClick(entry)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[var(--bg-surface-subtle)] border border-[var(--border-ledger)] shadow-2xs"
                        : "hover:bg-[var(--bg-surface-subtle)] border border-transparent hover:border-[var(--border-ledger)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`p-2 rounded transition-colors ${
                          isSelected
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--bg-surface-subtle)] text-[var(--accent)]"
                        }`}
                      >
                        {getEntityIcon(entry.entity_type)}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {entry.title}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {entry.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {entry.amount_cents !== null &&
                        entry.amount_cents !== undefined && (
                          <div className="text-xs font-mono font-bold text-[var(--text-primary)] tabular-nums">
                            {formatCents(entry.amount_cents, currencySymbol)}
                          </div>
                        )}
                      {entry.status && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded bg-[var(--bg-surface-subtle)] text-[10px] font-medium text-[var(--text-secondary)] capitalize border border-[var(--border-ledger)]">
                          {entry.status}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            !isSearching && (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                No matching records found for "{query}".
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border-ledger)] bg-[var(--bg-surface-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
          <span>FreelanceDesk Offline Search</span>
          <span>Navigate: ↑ ↓ • Select: Enter • Dismiss: ESC</span>
        </div>
      </div>
    </div>
  );
};

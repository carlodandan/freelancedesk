import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { NavigationTab } from "../../types/navigation";
import { GlobalSearchModal } from "../search/GlobalSearchModal";

interface MainLayoutProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  freelancerName?: string;
  businessName?: string;
  pendingCommissionsCount?: number;
  activeProjectsCount?: number;
  onQuickAction?: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  activeTab,
  onSelectTab,
  freelancerName,
  businessName,
  pendingCommissionsCount,
  activeProjectsCount,
  onQuickAction,
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen min-w-0 overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        pendingCommissionsCount={pendingCommissionsCount}
        activeProjectsCount={activeProjectsCount}
      />

      {/* Main Desktop View Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Header
          freelancerName={freelancerName}
          businessName={businessName}
          onOpenSearch={() => setIsSearchOpen(true)}
          onQuickAction={onQuickAction}
        />

        {/* Scrollable Content Pane */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-7">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Ctrl+K Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => {
          setIsSearchOpen(false);
          onSelectTab(tab);
        }}
      />
    </div>
  );
};

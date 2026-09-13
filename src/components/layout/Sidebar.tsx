import React from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Sparkles,
  CreditCard,
  Receipt,
  FileText,
  BarChart3,
  Calendar,
  FolderArchive,
  Settings as SettingsIcon,
  ShieldCheck,
} from "lucide-react";
import { NavigationTab } from "../../types/navigation";

interface SidebarNavItem {
  id: NavigationTab;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

interface SidebarSection {
  title: string | null;
  items: SidebarNavItem[];
}

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  pendingCommissionsCount?: number;
  activeProjectsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingCommissionsCount = 0,
  activeProjectsCount = 0,
}) => {
  const sections: SidebarSection[] = [
    {
      title: null,
      items: [
        {
          id: "dashboard" as NavigationTab,
          label: "Dashboard",
          icon: <LayoutDashboard size={18} />,
        },
      ],
    },
    {
      title: "WORK",
      items: [
        {
          id: "clients" as NavigationTab,
          label: "Clients",
          icon: <Users size={18} />,
        },
        {
          id: "projects" as NavigationTab,
          label: "Projects",
          icon: <Briefcase size={18} />,
          badge: activeProjectsCount > 0 ? activeProjectsCount : undefined,
        },
        {
          id: "commissions" as NavigationTab,
          label: "Commissions",
          icon: <Sparkles size={18} />,
          badge: pendingCommissionsCount > 0 ? pendingCommissionsCount : undefined,
        },
      ],
    },
    {
      title: "FINANCES",
      items: [
        {
          id: "payments" as NavigationTab,
          label: "Payments",
          icon: <CreditCard size={18} />,
        },
        {
          id: "expenses" as NavigationTab,
          label: "Expenses",
          icon: <Receipt size={18} />,
        },
        {
          id: "invoices" as NavigationTab,
          label: "Invoices",
          icon: <FileText size={18} />,
        },
        {
          id: "reports" as NavigationTab,
          label: "Reports",
          icon: <BarChart3 size={18} />,
        },
      ],
    },
    {
      title: "ORGANIZATION",
      items: [
        {
          id: "calendar" as NavigationTab,
          label: "Calendar",
          icon: <Calendar size={18} />,
        },
        {
          id: "files" as NavigationTab,
          label: "Files",
          icon: <FolderArchive size={18} />,
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          id: "settings" as NavigationTab,
          label: "Settings",
          icon: <SettingsIcon size={18} />,
        },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#F7F4ED] border-r border-[#E5E0D5] flex flex-col justify-between h-screen select-none">
      {/* App Branding */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-[#E5E0D5] bg-[#F3EFE6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#854D0E] flex items-center justify-center text-white font-serif font-bold text-base shadow-xs">
              F
            </div>
            <div>
              <div className="font-semibold text-sm text-[#1C1917] tracking-tight leading-none">
                FreelanceDesk
              </div>
              <div className="text-[11px] text-[#8C867A] mt-1 font-mono tracking-wider">
                LEDGER v0.1
              </div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              {sec.title && (
                <div className="px-3 text-[10px] font-bold text-[#8C867A] tracking-wider uppercase">
                  {sec.title}
                </div>
              )}
              {sec.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#EFE9DC] text-[#1C1917] font-semibold shadow-xs border border-[#E0D8C8]"
                        : "text-[#57534E] hover:bg-[#EFEBE4] hover:text-[#1C1917]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-[#854D0E]" : "text-[#78716C]"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? "bg-[#854D0E] text-white"
                            : "bg-[#E5E0D5] text-[#57534E]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Offline status */}
      <div className="p-3 border-t border-[#E5E0D5] bg-[#F3EFE6]/50">
        <div className="flex items-center justify-between px-3 py-1.5 text-xs text-[#78716C]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#166534]" />
            <span className="text-[11px] font-medium text-[#166534]">Local & Offline</span>
          </div>
          <span className="text-[11px] font-mono text-[#8C867A]">SQLite</span>
        </div>
      </div>
    </aside>
  );
};

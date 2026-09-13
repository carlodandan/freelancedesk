import React from "react";
import {
  Users,
  Briefcase,
  Sparkles,
  CreditCard,
  Receipt,
  FileText,
  BarChart3,
  Calendar,
  FolderArchive,
  Plus,
} from "lucide-react";
import { EmptyState } from "./EmptyState";
import { NavigationTab } from "../../types/navigation";

interface PlaceholderViewProps {
  tab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
}

export const PlaceholderView: React.FC<PlaceholderViewProps> = ({ tab, onNavigate }) => {
  const configs: Record<
    string,
    {
      title: string;
      subtitle: string;
      icon: React.ReactNode;
      emptyTitle: string;
      emptyDesc: string;
      actionLabel: string;
      phase: string;
    }
  > = {
    clients: {
      title: "Client Directory",
      subtitle: "Track your client relationships, accounts, earnings, and contact details.",
      icon: <Users size={28} />,
      emptyTitle: "No clients registered yet",
      emptyDesc: "Register your clients to associate them with projects, commissions, and invoices.",
      actionLabel: "Add First Client",
      phase: "Phase 2 — Core Records",
    },
    projects: {
      title: "Projects",
      subtitle: "Organize larger scopes of freelance work and milestones.",
      icon: <Briefcase size={28} />,
      emptyTitle: "No active projects",
      emptyDesc: "Create multi-stage client projects to group deliverables, deadlines, and expenses.",
      actionLabel: "Create Project",
      phase: "Phase 2 — Core Records",
    },
    commissions: {
      title: "Commissions",
      subtitle: "Manage individual freelance orders, customized line items, and deposit requirements.",
      icon: <Sparkles size={28} />,
      emptyTitle: "No commissions yet",
      emptyDesc: "Create your first commission to start tracking freelance jobs, deposits, and delivery dates.",
      actionLabel: "New Commission",
      phase: "Phase 2 — Core Records",
    },
    payments: {
      title: "Payment Ledger",
      subtitle: "Record full and partial client payments, deposits, and payment methods.",
      icon: <CreditCard size={28} />,
      emptyTitle: "No payments recorded yet",
      emptyDesc: "Payments received via Cash, Bank Transfer, GCash, Maya, or PayPal will be itemized here.",
      actionLabel: "Record Payment",
      phase: "Phase 3 — Money",
    },
    expenses: {
      title: "Business Expenses",
      subtitle: "Track operating costs, software subscriptions, equipment, and deductible items.",
      icon: <Receipt size={28} />,
      emptyTitle: "No expenses recorded",
      emptyDesc: "Keep track of deductible business expenses by category and project attribution.",
      actionLabel: "Add Expense",
      phase: "Phase 3 — Money",
    },
    invoices: {
      title: "Invoices",
      subtitle: "Generate, send, and export clean PDF invoices with custom prefixes.",
      icon: <FileText size={28} />,
      emptyTitle: "No invoices created",
      emptyDesc: "Generate professional offline PDF invoices with auto-incremented invoice numbers.",
      actionLabel: "Draft Invoice",
      phase: "Phase 4 — Documents",
    },
    reports: {
      title: "Financial Reports",
      subtitle: "Monthly income, category expenses, and net profit breakdowns.",
      icon: <BarChart3 size={28} />,
      emptyTitle: "Ready for reporting data",
      emptyDesc: "Reports calculate income vs. expenses automatically once financial entries are logged.",
      actionLabel: "Back to Dashboard",
      phase: "Phase 6 — Reports",
    },
    calendar: {
      title: "Deadline Calendar",
      subtitle: "High-level visual timeline of commission and project due dates.",
      icon: <Calendar size={28} />,
      emptyTitle: "Calendar timeline",
      emptyDesc: "Commission deadlines and invoice due dates will appear on your desktop timeline.",
      actionLabel: "Go to Commissions",
      phase: "Phase 5 — Organization",
    },
    files: {
      title: "Files & Attachments",
      subtitle: "Local filesystem storage of reference materials, sketches, and deliverables.",
      icon: <FolderArchive size={28} />,
      emptyTitle: "No attachments stored yet",
      emptyDesc: "Files attached to clients, projects, or commissions will be stored safely in your app-data folder.",
      actionLabel: "Browse Files",
      phase: "Phase 5 — Organization",
    },
  };

  const config = configs[tab] || {
    title: tab.charAt(0).toUpperCase() + tab.slice(1),
    subtitle: "Management ledger view",
    icon: <Users size={28} />,
    emptyTitle: `No ${tab} entries yet`,
    emptyDesc: "This section is ready for records.",
    actionLabel: "Add Entry",
    phase: "Upcoming Phase",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
              {config.title}
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#FAF8F5] border border-[#E5E0D5] text-[10px] font-mono text-[#854D0E] font-medium">
              {config.phase}
            </span>
          </div>
          <p className="text-xs text-[#78716C] mt-0.5">{config.subtitle}</p>
        </div>
      </div>

      <EmptyState
        icon={config.icon}
        title={config.emptyTitle}
        description={config.emptyDesc}
        actionLabel={config.actionLabel}
        actionIcon={<Plus size={14} />}
        onAction={() => {
          if (tab === "reports") onNavigate("dashboard");
          else if (tab === "calendar") onNavigate("commissions");
          else onNavigate("dashboard");
        }}
      />
    </div>
  );
};

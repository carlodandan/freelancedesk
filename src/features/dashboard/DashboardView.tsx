import React from "react";
import {
  TrendingUp,
  Clock,
  Briefcase,
  Sparkles,
  Calendar as CalendarIcon,
  ArrowUpRight,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DashboardSummary } from "../../types/dashboard";
import { formatCents } from "../../services/currency";
import { NavigationTab } from "../../types/navigation";

interface DashboardViewProps {
  summary: DashboardSummary | null;
  currencySymbol: string;
  onNavigate: (tab: NavigationTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  currencySymbol,
  onNavigate,
}) => {
  const incomeFormatted = summary
    ? formatCents(summary.total_income_cents, currencySymbol)
    : `${currencySymbol}0.00`;

  const outstandingFormatted = summary
    ? formatCents(summary.outstanding_payments_cents, currencySymbol)
    : `${currencySymbol}0.00`;

  const activeProjects = summary ? summary.active_projects_count : 0;
  const pendingCommissions = summary ? summary.pending_commissions_count : 0;
  const upcomingDeadlinesCount = summary ? summary.upcoming_deadlines_count : 0;

  return (
    <div className="space-y-8">
      {/* Top Banner / Philosophy Note */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Business Overview
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Your personal digital freelance ledger at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate("commissions")}
            icon={<Sparkles size={14} className="text-[#854D0E]" />}
          >
            New Commission
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate("payments")}
            icon={<PlusCircle size={14} />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* 4 Core Financial & Work Ledger Cards */}
      <div className="grid grid-cols-4 gap-5">
        {/* Income */}
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            <span>Total Income</span>
            <TrendingUp size={16} className="text-[#166534]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#1C1917] tracking-tight tabular-nums">
            {incomeFormatted}
          </div>
          <div className="mt-2 text-[11px] text-[#166534] font-medium flex items-center gap-1">
            <span>Collected payments</span>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            <span>Outstanding</span>
            <Clock size={16} className="text-[#B45309]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#1C1917] tracking-tight tabular-nums">
            {outstandingFormatted}
          </div>
          <div className="mt-2 text-[11px] text-[#B45309] font-medium flex items-center gap-1">
            <span>Uncollected balance</span>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            <span>Active Projects</span>
            <Briefcase size={16} className="text-[#854D0E]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#1C1917] tracking-tight tabular-nums">
            {activeProjects}
          </div>
          <div className="mt-2 text-[11px] text-[#78716C] font-medium flex items-center gap-1">
            <span>In progress or planning</span>
          </div>
        </div>

        {/* Pending Commissions / Upcoming */}
        <div className="bg-white border border-[#E5E0D5] rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            <span>Pending Jobs</span>
            <CalendarIcon size={16} className="text-[#4338CA]" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono text-[#1C1917] tracking-tight tabular-nums">
            {pendingCommissions}
          </div>
          <div className="mt-2 text-[11px] text-[#4338CA] font-medium flex items-center gap-1">
            <span>{upcomingDeadlinesCount} deadlines soon</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Deadlines & Recent Activity */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Deadlines & Deliveries */}
        <div className="col-span-2 space-y-6">
          <Card
            header={
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-[#854D0E]" />
                <span>Upcoming Deadlines</span>
              </div>
            }
            action={
              <button
                onClick={() => onNavigate("calendar")}
                className="text-xs text-[#854D0E] font-medium hover:underline flex items-center gap-1"
              >
                <span>View calendar</span>
                <ArrowUpRight size={12} />
              </button>
            }
            noPadding
          >
            {summary && summary.upcoming_deadlines.length > 0 ? (
              <div className="divide-y divide-[#ECE8DE]">
                {summary.upcoming_deadlines.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-[#F4F1EA] text-[#854D0E] mt-0.5">
                        {item.entity_type === "project" ? (
                          <Briefcase size={16} />
                        ) : (
                          <Sparkles size={16} />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#1C1917]">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#78716C] mt-0.5">
                          Client:{" "}
                          <span className="font-medium text-[#57534E]">
                            {item.client_name}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-mono font-medium text-[#1C1917]">
                        {item.deadline}
                      </div>
                      <Badge
                        variant={
                          item.days_remaining <= 3 ? "danger" : "warning"
                        }
                        size="sm"
                        className="mt-1"
                      >
                        {item.days_remaining <= 0
                          ? "Due today"
                          : `${item.days_remaining} days left`}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex p-3 rounded-full bg-[#F4F1EA] text-[#8C867A] mb-3">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  No impending deadlines
                </h3>
                <p className="text-xs text-[#78716C] max-w-sm mx-auto mt-1">
                  You are all caught up on scheduled commissions and projects.
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate("commissions")}
                  >
                    Add Commission Deadline
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Recent Payments Card */}
          <Card
            header={
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-[#166534]" />
                <span>Recent Payments</span>
              </div>
            }
            action={
              <button
                onClick={() => onNavigate("payments")}
                className="text-xs text-[#854D0E] font-medium hover:underline flex items-center gap-1"
              >
                <span>All payments</span>
                <ArrowUpRight size={12} />
              </button>
            }
            noPadding
          >
            {summary && summary.recent_payments.length > 0 ? (
              <div className="divide-y divide-[#ECE8DE]">
                {summary.recent_payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#1C1917]">
                        {p.client_name}
                      </div>
                      <div className="text-xs text-[#78716C] mt-0.5">
                        {p.payment_method} • {p.payment_date}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold text-[#166534] tabular-nums">
                      +{formatCents(p.amount_cents, currencySymbol)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="inline-flex p-3 rounded-full bg-[#F4F1EA] text-[#8C867A] mb-3">
                  <Clock size={24} />
                </div>
                <h3 className="text-sm font-semibold text-[#1C1917]">
                  No payments recorded yet
                </h3>
                <p className="text-xs text-[#78716C] max-w-sm mx-auto mt-1">
                  Recorded deposits and job payments will be itemized here.
                </p>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onNavigate("payments")}
                  >
                    Record First Payment
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right 1 Col: Recent Ledger Activity */}
        <div className="col-span-1">
          <Card
            header={
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#854D0E]" />
                <span>Recent Activity</span>
              </div>
            }
            noPadding
          >
            {summary && summary.recent_activities.length > 0 ? (
              <div className="divide-y divide-[#ECE8DE] max-h-[460px] overflow-y-auto">
                {summary.recent_activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase font-bold text-[#854D0E] tracking-wider">
                        {act.entity_type}
                      </span>
                      <span className="text-[10px] text-[#A8A29E] font-mono">
                        {act.created_at.slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[#292524] leading-relaxed">
                      {act.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#8C867A]">
                No recent activity logged yet.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

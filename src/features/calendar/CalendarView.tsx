import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Briefcase,
  Sparkles,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { tauriService } from "../../services/tauri";
import { NavigationTab } from "../../types/navigation";

interface CalendarViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

interface DeadlineEvent {
  id: string;
  type: "project" | "commission" | "invoice";
  title: string;
  clientName: string;
  date: string;
  status: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
  const [events, setEvents] = useState<DeadlineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const [projects, commissions, invoices] = await Promise.all([
          tauriService.getProjects(),
          tauriService.getCommissions(),
          tauriService.getInvoices(),
        ]);

        const eventList: DeadlineEvent[] = [];

        for (const p of projects) {
          if (p.deadline) {
            eventList.push({
              id: p.id,
              type: "project",
              title: p.name,
              clientName: p.client_name,
              date: p.deadline,
              status: p.status,
            });
          }
        }

        for (const c of commissions) {
          if (c.deadline) {
            eventList.push({
              id: c.id,
              type: "commission",
              title: c.title,
              clientName: c.client_name,
              date: c.deadline,
              status: c.status,
            });
          }
        }

        for (const inv of invoices) {
          if (inv.due_date) {
            eventList.push({
              id: inv.id,
              type: "invoice",
              title: `Invoice #${inv.invoice_number}`,
              clientName: inv.client_name,
              date: inv.due_date,
              status: inv.status,
            });
          }
        }

        // Sort chronologically
        eventList.sort((a, b) => a.date.localeCompare(b.date));
        setEvents(eventList);
      } catch (err) {
        console.error("Failed to load deadline events:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Deadlines Calendar
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Chronological overview of project milestones, commission deliveries,
            and invoice due dates.
          </p>
        </div>
      </div>

      <Card
        header={
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-[#854D0E]" />
            <span>Scheduled Delivery & Payment Deadlines</span>
          </div>
        }
        noPadding
      >
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#8C867A]">
            Loading scheduled delivery & payment deadlines...
          </div>
        ) : events.length > 0 ? (
          <div className="divide-y divide-[#ECE8DE]">
            {events.map((evt) => (
              <div
                key={`${evt.type}-${evt.id}`}
                onClick={() => {
                  if (evt.type === "project") onNavigate("projects");
                  else if (evt.type === "commission") onNavigate("commissions");
                  else onNavigate("invoices");
                }}
                className="p-4 flex items-center justify-between hover:bg-[#FAF8F5] cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded bg-[#F4F1EA] text-[#854D0E] mt-0.5">
                    {evt.type === "project" ? (
                      <Briefcase size={16} />
                    ) : evt.type === "commission" ? (
                      <Sparkles size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1C1917]">
                      {evt.title}
                    </div>
                    <div className="text-xs text-[#78716C] mt-0.5">
                      Client:{" "}
                      <span className="font-medium text-[#57534E]">
                        {evt.clientName}
                      </span>{" "}
                      • Type: <span className="capitalize">{evt.type}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-[#1C1917]">
                    {evt.date}
                  </div>
                  <Badge variant="neutral" size="sm" className="mt-1">
                    {evt.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#8C867A]">
            <CheckCircle2 size={24} className="mx-auto text-[#166534] mb-2" />
            No pending project deadlines or invoice due dates scheduled.
          </div>
        )}
      </Card>
    </div>
  );
};

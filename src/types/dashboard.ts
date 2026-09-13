export interface RecentPaymentItem {
  id: string;
  client_name: string;
  amount_cents: number;
  payment_date: string;
  payment_method: string;
}

export interface UpcomingDeadlineItem {
  id: string;
  entity_type: "project" | "commission";
  title: string;
  client_name: string;
  deadline: string;
  days_remaining: number;
  status: string;
}

export interface ActivityItem {
  id: string;
  entity_type: string;
  entity_id?: string | null;
  action: string;
  description: string;
  created_at: string;
}

export interface DashboardSummary {
  total_income_cents: number;
  outstanding_payments_cents: number;
  active_projects_count: number;
  pending_commissions_count: number;
  upcoming_deadlines_count: number;
  recent_payments: RecentPaymentItem[];
  upcoming_deadlines: UpcomingDeadlineItem[];
  recent_activities: ActivityItem[];
}

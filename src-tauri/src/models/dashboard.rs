use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub total_income_cents: i64,
    pub outstanding_payments_cents: i64,
    pub active_projects_count: i64,
    pub pending_commissions_count: i64,
    pub upcoming_deadlines_count: i64,
    pub recent_payments: Vec<RecentPaymentItem>,
    pub upcoming_deadlines: Vec<UpcomingDeadlineItem>,
    pub recent_activities: Vec<ActivityItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentPaymentItem {
    pub id: String,
    pub client_name: String,
    pub amount_cents: i64,
    pub payment_date: String,
    pub payment_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpcomingDeadlineItem {
    pub id: String,
    pub entity_type: String, // "project" or "commission"
    pub title: String,
    pub client_name: String,
    pub deadline: String,
    pub days_remaining: i64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityItem {
    pub id: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub action: String,
    pub description: String,
    pub created_at: String,
}

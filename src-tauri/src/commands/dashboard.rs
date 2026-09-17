use crate::models::dashboard::{
    ActivityItem, DashboardSummary, RecentPaymentItem, UpcomingDeadlineItem,
};
use crate::AppState;
use tauri::State;

/// Aggregates financial totals, deadlines, and recent activity for the dashboard.
#[tauri::command]
pub fn get_dashboard_summary(state: State<'_, AppState>) -> Result<DashboardSummary, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Total income
    let total_income_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM payments",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Outstanding payments
    let outstanding_payments_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(remaining_balance_cents), 0) FROM commissions WHERE status NOT IN ('completed', 'cancelled')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Active projects count
    let active_projects_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM projects WHERE status IN ('planning', 'in_progress', 'waiting')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Pending commissions count
    let pending_commissions_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM commissions WHERE status NOT IN ('completed', 'cancelled')",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Upcoming deadlines count (next 14 days)
    let upcoming_deadlines_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM (
                SELECT deadline FROM projects WHERE deadline IS NOT NULL AND deadline != '' AND status IN ('planning', 'in_progress', 'waiting') AND deadline >= date('now') AND deadline <= date('now', '+14 days')
                UNION ALL
                SELECT deadline FROM commissions WHERE deadline IS NOT NULL AND deadline != '' AND status NOT IN ('completed', 'cancelled') AND deadline >= date('now') AND deadline <= date('now', '+14 days')
            )",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Recent payments
    let mut recent_payments = Vec::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT p.id, COALESCE(c.name, 'Direct Client') as client_name, p.amount_cents, p.payment_date, p.payment_method
         FROM payments p
         LEFT JOIN clients c ON p.client_id = c.id
         ORDER BY p.payment_date DESC, p.created_at DESC
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(RecentPaymentItem {
                id: row.get(0)?,
                client_name: row.get(1)?,
                amount_cents: row.get(2)?,
                payment_date: row.get(3)?,
                payment_method: row.get(4)?,
            })
        }) {
            for item in rows.flatten() {
                recent_payments.push(item);
            }
        }
    }

    // Upcoming deadlines
    let mut upcoming_deadlines = Vec::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT p.id, 'project' as entity_type, p.name as title, c.name as client_name, p.deadline,
                CAST(ROUND(julianday(p.deadline) - julianday(date('now'))) AS INTEGER) as days_remaining, p.status
         FROM projects p
         JOIN clients c ON p.client_id = c.id
         WHERE p.deadline IS NOT NULL AND deadline != '' AND p.status IN ('planning', 'in_progress', 'waiting') AND p.deadline >= date('now')
         UNION ALL
         SELECT com.id, 'commission' as entity_type, com.title, c.name as client_name, com.deadline,
                CAST(ROUND(julianday(com.deadline) - julianday(date('now'))) AS INTEGER) as days_remaining, com.status
         FROM commissions com
         JOIN clients c ON com.client_id = c.id
         WHERE com.deadline IS NOT NULL AND deadline != '' AND com.status NOT IN ('completed', 'cancelled') AND com.deadline >= date('now')
         ORDER BY deadline ASC
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(UpcomingDeadlineItem {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                title: row.get(2)?,
                client_name: row.get(3)?,
                deadline: row.get(4)?,
                days_remaining: row.get(5)?,
                status: row.get(6)?,
            })
        }) {
            for item in rows.flatten() {
                upcoming_deadlines.push(item);
            }
        }
    }

    // Recent activity
    let mut recent_activities = Vec::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, entity_type, entity_id, action, description, created_at
         FROM activity_log
         ORDER BY created_at DESC
         LIMIT 10",
    ) {
        if let Ok(rows) = stmt.query_map([], |row| {
            Ok(ActivityItem {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                entity_id: row.get(2)?,
                action: row.get(3)?,
                description: row.get(4)?,
                created_at: row.get(5)?,
            })
        }) {
            for item in rows.flatten() {
                recent_activities.push(item);
            }
        }
    }

    Ok(DashboardSummary {
        total_income_cents,
        outstanding_payments_cents,
        active_projects_count,
        pending_commissions_count,
        upcoming_deadlines_count,
        recent_payments,
        upcoming_deadlines,
        recent_activities,
    })
}

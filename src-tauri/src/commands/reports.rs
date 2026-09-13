use crate::models::entities::{
    CategoryExpensePoint, ClientIncomePoint, FinancialReportData, MonthlyFinancialPoint,
};
use crate::AppState;
use std::collections::HashMap;
use tauri::State;

#[tauri::command]
pub fn get_financial_reports(
    state: State<'_, AppState>,
    _date_range: Option<String>,
) -> Result<FinancialReportData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let total_income_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM payments",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let total_expenses_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM expenses",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let net_profit_cents = total_income_cents - total_expenses_cents;

    // Monthly breakdown: gather monthly income and monthly expenses
    let mut monthly_income: HashMap<String, i64> = HashMap::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT strftime('%Y-%m', payment_date) as m, SUM(amount_cents)
         FROM payments
         WHERE payment_date IS NOT NULL AND payment_date != ''
         GROUP BY m ORDER BY m ASC",
    ) {
        if let Ok(rows) = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?))) {
            for item in rows.flatten() {
                monthly_income.insert(item.0, item.1);
            }
        }
    }

    let mut monthly_expense: HashMap<String, i64> = HashMap::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT strftime('%Y-%m', date) as m, SUM(amount_cents)
         FROM expenses
         WHERE date IS NOT NULL AND date != ''
         GROUP BY m ORDER BY m ASC",
    ) {
        if let Ok(rows) = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?))) {
            for item in rows.flatten() {
                monthly_expense.insert(item.0, item.1);
            }
        }
    }

    // Merge months
    let mut all_months: Vec<String> = monthly_income.keys().cloned().collect();
    for k in monthly_expense.keys() {
        if !all_months.contains(k) {
            all_months.push(k.clone());
        }
    }
    all_months.sort();

    let mut monthly_breakdown = Vec::new();
    for m in all_months {
        let inc = *monthly_income.get(&m).unwrap_or(&0);
        let exp = *monthly_expense.get(&m).unwrap_or(&0);
        monthly_breakdown.push(MonthlyFinancialPoint {
            month: m,
            income_cents: inc,
            expense_cents: exp,
            profit_cents: inc - exp,
        });
    }

    // Category breakdown
    let mut category_breakdown = Vec::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT c.name, SUM(e.amount_cents)
         FROM expenses e
         JOIN expense_categories c ON e.category_id = c.id
         GROUP BY c.name ORDER BY SUM(e.amount_cents) DESC",
    ) {
        if let Ok(rows) = stmt.query_map([], |r| {
            let cat_name: String = r.get(0)?;
            let sum_cents: i64 = r.get(1)?;
            let pct = if total_expenses_cents > 0 {
                ((sum_cents as f64) / (total_expenses_cents as f64)) * 100.0
            } else {
                0.0
            };
            Ok(CategoryExpensePoint {
                category_name: cat_name,
                total_cents: sum_cents,
                percentage: (pct * 10.0).round() / 10.0,
            })
        }) {
            for item in rows.flatten() {
                category_breakdown.push(item);
            }
        }
    }

    // Client breakdown
    let mut client_breakdown = Vec::new();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT c.name, SUM(p.amount_cents)
         FROM payments p
         JOIN clients c ON p.client_id = c.id
         GROUP BY c.name ORDER BY SUM(p.amount_cents) DESC LIMIT 10",
    ) {
        if let Ok(rows) = stmt.query_map([], |r| {
            Ok(ClientIncomePoint {
                client_name: r.get(0)?,
                total_cents: r.get(1)?,
            })
        }) {
            for item in rows.flatten() {
                client_breakdown.push(item);
            }
        }
    }

    Ok(FinancialReportData {
        total_income_cents,
        total_expenses_cents,
        net_profit_cents,
        monthly_breakdown,
        category_breakdown,
        client_breakdown,
    })
}

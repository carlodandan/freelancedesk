use crate::models::entities::{
    CategoryExpensePoint, ClientIncomePoint, FinancialReportData, MonthlyFinancialPoint,
};
use crate::AppState;
use chrono::{Datelike, NaiveDate, Utc};
use rusqlite::params;
use std::collections::HashMap;
use tauri::State;

fn report_date_bounds(
    date_range: Option<&str>,
) -> Result<(Option<String>, Option<String>), String> {
    let today = Utc::now().date_naive();
    let bounds = match date_range.unwrap_or("all") {
        "all" => return Ok((None, None)),
        "year" => (
            NaiveDate::from_ymd_opt(today.year(), 1, 1),
            NaiveDate::from_ymd_opt(today.year() + 1, 1, 1),
        ),
        "month" => {
            let (next_year, next_month) = if today.month() == 12 {
                (today.year() + 1, 1)
            } else {
                (today.year(), today.month() + 1)
            };
            (
                NaiveDate::from_ymd_opt(today.year(), today.month(), 1),
                NaiveDate::from_ymd_opt(next_year, next_month, 1),
            )
        }
        value => {
            return Err(format!(
                "Unsupported report date range '{}'; expected 'all', 'year', or 'month'",
                value
            ))
        }
    };

    match bounds {
        (Some(start), Some(end)) => Ok((Some(start.to_string()), Some(end.to_string()))),
        _ => Err("Failed to calculate report date range".to_string()),
    }
}

#[tauri::command]
pub fn get_financial_reports(
    state: State<'_, AppState>,
    date_range: Option<String>,
) -> Result<FinancialReportData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let (start_date, end_date) = report_date_bounds(date_range.as_deref())?;

    let total_income_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM payments
             WHERE (?1 IS NULL OR payment_date >= ?1)
               AND (?2 IS NULL OR payment_date < ?2)",
            params![start_date.as_deref(), end_date.as_deref()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let total_expenses_cents: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount_cents), 0) FROM expenses
             WHERE (?1 IS NULL OR date >= ?1)
               AND (?2 IS NULL OR date < ?2)",
            params![start_date.as_deref(), end_date.as_deref()],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let net_profit_cents = total_income_cents - total_expenses_cents;

    let monthly_income: HashMap<String, i64> = {
        let mut stmt = conn
            .prepare(
                "SELECT strftime('%Y-%m', payment_date) AS month, SUM(amount_cents)
                 FROM payments
                 WHERE payment_date IS NOT NULL AND payment_date != ''
                   AND (?1 IS NULL OR payment_date >= ?1)
                   AND (?2 IS NULL OR payment_date < ?2)
                 GROUP BY month ORDER BY month ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![start_date.as_deref(), end_date.as_deref()], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(|e| e.to_string())?
    };

    let monthly_expense: HashMap<String, i64> = {
        let mut stmt = conn
            .prepare(
                "SELECT strftime('%Y-%m', date) AS month, SUM(amount_cents)
                 FROM expenses
                 WHERE date IS NOT NULL AND date != ''
                   AND (?1 IS NULL OR date >= ?1)
                   AND (?2 IS NULL OR date < ?2)
                 GROUP BY month ORDER BY month ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![start_date.as_deref(), end_date.as_deref()], |row| {
                Ok((row.get(0)?, row.get(1)?))
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<HashMap<_, _>, _>>()
            .map_err(|e| e.to_string())?
    };

    let mut all_months: Vec<String> = monthly_income.keys().cloned().collect();
    for month in monthly_expense.keys() {
        if !all_months.contains(month) {
            all_months.push(month.clone());
        }
    }
    all_months.sort();

    let monthly_breakdown = all_months
        .into_iter()
        .map(|month| {
            let income_cents = *monthly_income.get(&month).unwrap_or(&0);
            let expense_cents = *monthly_expense.get(&month).unwrap_or(&0);
            MonthlyFinancialPoint {
                month,
                income_cents,
                expense_cents,
                profit_cents: income_cents - expense_cents,
            }
        })
        .collect();

    let category_breakdown = {
        let mut stmt = conn
            .prepare(
                "SELECT c.name, SUM(e.amount_cents)
                 FROM expenses e
                 JOIN expense_categories c ON e.category_id = c.id
                 WHERE (?1 IS NULL OR e.date >= ?1)
                   AND (?2 IS NULL OR e.date < ?2)
                 GROUP BY c.name ORDER BY SUM(e.amount_cents) DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![start_date.as_deref(), end_date.as_deref()], |row| {
                let category_name: String = row.get(0)?;
                let sum_cents: i64 = row.get(1)?;
                let percentage = if total_expenses_cents > 0 {
                    ((sum_cents as f64) / (total_expenses_cents as f64)) * 100.0
                } else {
                    0.0
                };
                Ok(CategoryExpensePoint {
                    category_name,
                    total_cents: sum_cents,
                    percentage: (percentage * 10.0).round() / 10.0,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    let client_breakdown = {
        let mut stmt = conn
            .prepare(
                "SELECT c.name, SUM(p.amount_cents)
                 FROM payments p
                 JOIN clients c ON p.client_id = c.id
                 WHERE (?1 IS NULL OR p.payment_date >= ?1)
                   AND (?2 IS NULL OR p.payment_date < ?2)
                 GROUP BY c.id, c.name ORDER BY SUM(p.amount_cents) DESC LIMIT 10",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![start_date.as_deref(), end_date.as_deref()], |row| {
                Ok(ClientIncomePoint {
                    client_name: row.get(0)?,
                    total_cents: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    Ok(FinancialReportData {
        total_income_cents,
        total_expenses_cents,
        net_profit_cents,
        monthly_breakdown,
        category_breakdown,
        client_breakdown,
    })
}

#[cfg(test)]
mod tests {
    use super::report_date_bounds;

    #[test]
    fn rejects_unknown_report_date_ranges() {
        assert!(report_date_bounds(Some("quarter")).is_err());
    }

    #[test]
    fn lifetime_reports_have_no_date_bounds() {
        assert_eq!(report_date_bounds(Some("all")).unwrap(), (None, None));
    }
}

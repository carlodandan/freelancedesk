use crate::models::entities::{GlobalSearchResult, SearchResultEntry};
use crate::AppState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn global_search(
    state: State<'_, AppState>,
    query: String,
) -> Result<GlobalSearchResult, String> {
    let clean_query = query.trim();
    if clean_query.is_empty() {
        return Ok(GlobalSearchResult {
            query,
            results: Vec::new(),
        });
    }

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", clean_query);
    let mut results = Vec::new();

    // 1. Search Clients
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, name, COALESCE(company_name, email, phone, 'Client') as sub, status
         FROM clients
         WHERE name LIKE ?1 OR company_name LIKE ?1 OR email LIKE ?1 OR phone LIKE ?1
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map(params![pattern], |r| {
            Ok(SearchResultEntry {
                id: r.get(0)?,
                entity_type: "client".to_string(),
                title: r.get(1)?,
                subtitle: r.get(2)?,
                status: Some(r.get(3)?),
                amount_cents: None,
            })
        }) {
            for item in rows.flatten() {
                results.push(item);
            }
        }
    }

    // 2. Search Projects
    if let Ok(mut stmt) = conn.prepare(
        "SELECT p.id, p.name, c.name, p.status, p.price_cents
         FROM projects p
         JOIN clients c ON p.client_id = c.id
         WHERE p.name LIKE ?1 OR p.description LIKE ?1
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map(params![pattern], |r| {
            Ok(SearchResultEntry {
                id: r.get(0)?,
                entity_type: "project".to_string(),
                title: r.get(1)?,
                subtitle: format!("Project • {}", r.get::<_, String>(2)?),
                status: Some(r.get(3)?),
                amount_cents: Some(r.get(4)?),
            })
        }) {
            for item in rows.flatten() {
                results.push(item);
            }
        }
    }

    // 3. Search Commissions
    if let Ok(mut stmt) = conn.prepare(
        "SELECT com.id, com.title, c.name, com.status, com.price_cents
         FROM commissions com
         JOIN clients c ON com.client_id = c.id
         WHERE com.title LIKE ?1 OR com.description LIKE ?1
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map(params![pattern], |r| {
            Ok(SearchResultEntry {
                id: r.get(0)?,
                entity_type: "commission".to_string(),
                title: r.get(1)?,
                subtitle: format!("Commission • {}", r.get::<_, String>(2)?),
                status: Some(r.get(3)?),
                amount_cents: Some(r.get(4)?),
            })
        }) {
            for item in rows.flatten() {
                results.push(item);
            }
        }
    }

    // 4. Search Invoices
    if let Ok(mut stmt) = conn.prepare(
        "SELECT inv.id, inv.invoice_number, c.name, inv.status, inv.total_cents
         FROM invoices inv
         JOIN clients c ON inv.client_id = c.id
         WHERE inv.invoice_number LIKE ?1
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map(params![pattern], |r| {
            Ok(SearchResultEntry {
                id: r.get(0)?,
                entity_type: "invoice".to_string(),
                title: r.get(1)?,
                subtitle: format!("Invoice • {}", r.get::<_, String>(2)?),
                status: Some(r.get(3)?),
                amount_cents: Some(r.get(4)?),
            })
        }) {
            for item in rows.flatten() {
                results.push(item);
            }
        }
    }

    // 5. Search Payments
    if let Ok(mut stmt) = conn.prepare(
        "SELECT p.id, COALESCE(p.receipt_number, p.reference_number, 'Payment'), c.name, p.payment_method, p.amount_cents
         FROM payments p
         JOIN clients c ON p.client_id = c.id
         WHERE p.reference_number LIKE ?1 OR p.receipt_number LIKE ?1
         LIMIT 5",
    ) {
        if let Ok(rows) = stmt.query_map(params![pattern], |r| {
            Ok(SearchResultEntry {
                id: r.get(0)?,
                entity_type: "payment".to_string(),
                title: r.get(1)?,
                subtitle: format!("Payment from {} via {}", r.get::<_, String>(2)?, r.get::<_, String>(3)?),
                status: None,
                amount_cents: Some(r.get(4)?),
            })
        }) {
            for item in rows.flatten() {
                results.push(item);
            }
        }
    }

    Ok(GlobalSearchResult {
        query,
        results,
    })
}

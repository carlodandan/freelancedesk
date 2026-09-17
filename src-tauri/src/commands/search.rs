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

    // 1. Search Clients (decrypting sensitive email and phone in memory)
    let query_lower = clean_query.to_lowercase();
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, name, company_name, email, phone, status FROM clients",
    ) {
        if let Ok(rows) = stmt.query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, Option<String>>(2)?,
                r.get::<_, Option<String>>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, String>(5)?,
            ))
        }) {
            let mut client_matches = 0;
            for row in rows.flatten() {
                if client_matches >= 5 {
                    break;
                }
                let (id, name, company_name, raw_email, raw_phone, status) = row;
                let dec_email = raw_email.map(|s| crate::security::crypto::decrypt_field(&s, &state.vault_key));
                let dec_phone = raw_phone.map(|s| crate::security::crypto::decrypt_field(&s, &state.vault_key));

                let name_match = name.to_lowercase().contains(&query_lower);
                let company_match = company_name.as_ref().map(|c| c.to_lowercase().contains(&query_lower)).unwrap_or(false);
                let email_match = dec_email.as_ref().map(|e| e.to_lowercase().contains(&query_lower)).unwrap_or(false);
                let phone_match = dec_phone.as_ref().map(|p| p.to_lowercase().contains(&query_lower)).unwrap_or(false);

                if name_match || company_match || email_match || phone_match {
                    let subtitle = company_name
                        .or(dec_email)
                        .or(dec_phone)
                        .unwrap_or_else(|| "Client".to_string());

                    results.push(SearchResultEntry {
                        id,
                        entity_type: "client".to_string(),
                        title: name,
                        subtitle,
                        status: Some(status),
                        amount_cents: None,
                    });
                    client_matches += 1;
                }
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

    Ok(GlobalSearchResult { query, results })
}

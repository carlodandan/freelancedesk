use crate::models::entities::{CreateInvoiceInput, InvoiceItem, InvoiceLineItem};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_invoices(
    state: State<'_, AppState>,
    client_id: Option<String>,
) -> Result<Vec<InvoiceItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            inv.id, inv.client_id, c.name as client_name, c.email as client_email, c.address as client_address,
            inv.invoice_number, inv.issue_date, inv.due_date,
            inv.subtotal_cents, inv.discount_cents, inv.tax_rate_bps, inv.tax_amount_cents, inv.total_cents,
            COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.invoice_id = inv.id), 0) as total_paid,
            inv.status, inv.notes, inv.payment_instructions, inv.created_at, inv.updated_at
        FROM invoices inv
        JOIN clients c ON inv.client_id = c.id
        WHERE (?1 IS NULL OR inv.client_id = ?1)
        ORDER BY inv.issue_date DESC, inv.created_at DESC";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![client_id], |row| {
            let inv_id: String = row.get(0)?;
            Ok(InvoiceItem {
                id: inv_id,
                client_id: row.get(1)?,
                client_name: row.get(2)?,
                client_email: row.get(3)?,
                client_address: row.get(4)?,
                invoice_number: row.get(5)?,
                issue_date: row.get(6)?,
                due_date: row.get(7)?,
                subtotal_cents: row.get(8)?,
                discount_cents: row.get(9)?,
                tax_rate_bps: row.get(10)?,
                tax_amount_cents: row.get(11)?,
                total_cents: row.get(12)?,
                total_paid_cents: row.get(13)?,
                status: row.get(14)?,
                notes: row.get(15)?,
                payment_instructions: row.get(16)?,
                items: Vec::new(),
                created_at: row.get(17)?,
                updated_at: row.get(18)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut invoices = Vec::new();
    for inv in rows.flatten() {
        invoices.push(inv);
    }

    // Attach items
    for inv in &mut invoices {
        if let Ok(mut item_stmt) = conn.prepare(
            "SELECT id, commission_id, description, quantity, unit_price_cents, total_price_cents, sort_order
             FROM invoice_items WHERE invoice_id = ?1 ORDER BY sort_order ASC",
        ) {
            if let Ok(item_rows) = item_stmt.query_map(params![inv.id], |r| {
                Ok(InvoiceLineItem {
                    id: r.get(0)?,
                    commission_id: r.get(1)?,
                    description: r.get(2)?,
                    quantity: r.get(3)?,
                    unit_price_cents: r.get(4)?,
                    total_price_cents: r.get(5)?,
                    sort_order: r.get(6)?,
                })
            }) {
                inv.items = item_rows.flatten().collect();
            }
        }
    }

    Ok(invoices)
}

#[tauri::command]
pub fn create_invoice(
    state: State<'_, AppState>,
    input: CreateInvoiceInput,
) -> Result<InvoiceItem, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();

    // Fetch client details
    let (client_name, client_email, client_address): (String, Option<String>, Option<String>) =
        conn.query_row(
            "SELECT name, email, address FROM clients WHERE id = ?1",
            params![input.client_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|_| "Client not found".to_string())?;

    // Fetch invoice prefix
    let prefix: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'invoice_prefix'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "INV".to_string());

    // Generate unique sequential invoice number based on existing sequence
    let current_year = chrono::Utc::now().format("%Y").to_string();
    let pattern = format!("{}-{}-%", prefix, current_year);
    let existing_numbers: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT invoice_number FROM invoices WHERE invoice_number LIKE ?1")
            .map_err(|e| e.to_string())?;
        let list = stmt
            .query_map(params![pattern], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .collect();
        list
    };

    let mut max_seq = 0;
    for num in existing_numbers {
        if let Some(suffix) = num.split('-').last() {
            if let Ok(seq) = suffix.parse::<i64>() {
                if seq > max_seq {
                    max_seq = seq;
                }
            }
        }
    }
    let invoice_number = format!("{}-{}-{:03}", prefix, current_year, max_seq + 1);

    // Calculate subtotal from line items
    let mut subtotal_cents: i64 = 0;
    for item in &input.items {
        subtotal_cents += item.unit_price_cents * (item.quantity as i64);
    }

    let discount_cents = input.discount_cents.unwrap_or(0);
    let tax_rate_bps = input.tax_rate_bps.unwrap_or(0);

    let taxable_amount = if subtotal_cents > discount_cents {
        subtotal_cents - discount_cents
    } else {
        0
    };

    let tax_amount_cents = (taxable_amount * (tax_rate_bps as i64)) / 10000;
    let total_cents = taxable_amount + tax_amount_cents;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO invoices (
            id, client_id, invoice_number, issue_date, due_date,
            subtotal_cents, discount_cents, tax_rate_bps, tax_amount_cents, total_cents,
            status, notes, payment_instructions, created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'sent', ?11, ?12, datetime('now'), datetime('now')
        )",
        params![
            id,
            input.client_id,
            invoice_number,
            input.issue_date.trim(),
            input.due_date.as_deref().map(str::trim),
            subtotal_cents,
            discount_cents,
            tax_rate_bps,
            tax_amount_cents,
            total_cents,
            input.notes.as_deref().map(str::trim),
            input.payment_instructions.as_deref().map(str::trim),
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut line_items = Vec::new();
    for (idx, item) in input.items.iter().enumerate() {
        let item_id = Uuid::new_v4().to_string();
        let total = item.unit_price_cents * (item.quantity as i64);

        tx.execute(
            "INSERT INTO invoice_items (id, invoice_id, commission_id, description, quantity, unit_price_cents, total_price_cents, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                item_id,
                id,
                item.commission_id,
                item.description.trim(),
                item.quantity,
                item.unit_price_cents,
                total,
                idx as i32
            ],
        )
        .map_err(|e| e.to_string())?;

        line_items.push(InvoiceLineItem {
            id: item_id,
            commission_id: item.commission_id.clone(),
            description: item.description.clone(),
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            total_price_cents: total,
            sort_order: idx as i32,
        });
    }

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Invoice #{} generated for {}", invoice_number, client_name);
    let _ = tx.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'invoice', ?2, 'created', ?3)",
        params![act_id, id, desc],
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(InvoiceItem {
        id,
        client_id: input.client_id,
        client_name,
        client_email,
        client_address,
        invoice_number,
        issue_date: input.issue_date,
        due_date: input.due_date,
        subtotal_cents,
        discount_cents,
        tax_rate_bps,
        tax_amount_cents,
        total_cents,
        total_paid_cents: 0,
        status: "sent".to_string(),
        notes: input.notes,
        payment_instructions: input.payment_instructions,
        items: line_items,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_invoice_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE invoices SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![status, id],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Invoice status changed to '{}'", status);
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'invoice', ?2, 'status_changed', ?3)",
        params![act_id, id, desc],
    );

    Ok(true)
}

#[tauri::command]
pub fn delete_invoice(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM invoices WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'invoice', ?2, 'deleted', 'Invoice deleted')",
        params![act_id, id],
    );

    Ok(true)
}

use crate::models::entities::{CreatePaymentInput, PaymentItem};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_payments(
    state: State<'_, AppState>,
    client_id: Option<String>,
    commission_id: Option<String>,
) -> Result<Vec<PaymentItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            p.id, p.client_id, c.name as client_name,
            p.project_id, pr.name as project_name,
            p.commission_id, com.title as commission_title,
            p.invoice_id, p.amount_cents, p.payment_date, p.payment_method,
            p.reference_number, p.receipt_number, p.notes, p.created_at
        FROM payments p
        JOIN clients c ON p.client_id = c.id
        LEFT JOIN projects pr ON p.project_id = pr.id
        LEFT JOIN commissions com ON p.commission_id = com.id
        WHERE (?1 IS NULL OR p.client_id = ?1)
          AND (?2 IS NULL OR p.commission_id = ?2)
        ORDER BY p.payment_date DESC, p.created_at DESC";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![client_id, commission_id], |row| {
            Ok(PaymentItem {
                id: row.get(0)?,
                client_id: row.get(1)?,
                client_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                commission_id: row.get(5)?,
                commission_title: row.get(6)?,
                invoice_id: row.get(7)?,
                amount_cents: row.get(8)?,
                payment_date: row.get(9)?,
                payment_method: row.get(10)?,
                reference_number: row.get(11)?,
                receipt_number: row.get(12)?,
                notes: row.get(13)?,
                created_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_payment(
    state: State<'_, AppState>,
    input: CreatePaymentInput,
) -> Result<PaymentItem, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();

    let client_name: String = conn
        .query_row(
            "SELECT name FROM clients WHERE id = ?1",
            params![input.client_id],
            |r| r.get(0),
        )
        .map_err(|_| "Client not found".to_string())?;

    // Auto-generate receipt number if omitted
    let receipt_number = input.receipt_number.unwrap_or_else(|| {
        let date_compact = chrono::Utc::now().format("%Y%m%d").to_string();
        let suffix = &id[0..4].to_uppercase();
        format!("RCP-{}-{}", date_compact, suffix)
    });

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let project_name: Option<String> = match &input.project_id {
        Some(project_id) => Some(
            tx.query_row(
                "SELECT name FROM projects WHERE id = ?1 AND client_id = ?2",
                params![project_id, input.client_id],
                |row| row.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    "Selected project does not belong to the selected client".to_string()
                }
                _ => e.to_string(),
            })?,
        ),
        None => None,
    };

    let commission_title: Option<String> = match &input.commission_id {
        Some(commission_id) => Some(
            tx.query_row(
                "SELECT title FROM commissions WHERE id = ?1 AND client_id = ?2",
                params![commission_id, input.client_id],
                |row| row.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    "Selected commission does not belong to the selected client".to_string()
                }
                _ => e.to_string(),
            })?,
        ),
        None => None,
    };

    if let Some(invoice_id) = &input.invoice_id {
        tx.query_row(
            "SELECT 1 FROM invoices WHERE id = ?1 AND client_id = ?2",
            params![invoice_id, input.client_id],
            |_| Ok(()),
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => {
                "Selected invoice does not belong to the selected client".to_string()
            }
            _ => e.to_string(),
        })?;
    }

    tx.execute(
        "INSERT INTO payments (
            id, client_id, project_id, commission_id, invoice_id,
            amount_cents, payment_date, payment_method, reference_number,
            receipt_number, notes, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, datetime('now'))",
        params![
            id,
            input.client_id,
            input.project_id,
            input.commission_id,
            input.invoice_id,
            input.amount_cents,
            input.payment_date.trim(),
            input.payment_method.trim(),
            input.reference_number.as_deref().map(str::trim),
            Some(&receipt_number),
            input.notes.as_deref().map(str::trim),
        ],
    )
    .map_err(|e| e.to_string())?;

    // Update Commission Remaining Balance & Payment Status
    if let Some(ref comm_id) = input.commission_id {
        let (comm_price, deposit_amount): (i64, i64) = tx
            .query_row(
                "SELECT price_cents, deposit_amount_cents FROM commissions WHERE id = ?1",
                params![comm_id],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|e| e.to_string())?;

        let total_paid: i64 = tx
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE commission_id = ?1",
                params![comm_id],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        let new_remaining = if comm_price > total_paid {
            comm_price - total_paid
        } else {
            0
        };

        let new_payment_status = if total_paid == 0 {
            "unpaid"
        } else if total_paid >= comm_price {
            "paid"
        } else if total_paid == deposit_amount {
            "deposit_paid"
        } else {
            "partially_paid"
        };

        tx.execute(
            "UPDATE commissions
             SET remaining_balance_cents = ?1, payment_status = ?2, updated_at = datetime('now')
             WHERE id = ?3",
            params![new_remaining, new_payment_status, comm_id],
        )
        .map_err(|e| e.to_string())?;
    }

    let currency_symbol: String = tx
        .query_row(
            "SELECT value FROM settings WHERE key = 'currency_symbol'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "$".to_string());

    let act_id = Uuid::new_v4().to_string();
    let desc = format!(
        "Payment of {}{:.2} received from {} via {}",
        currency_symbol,
        (input.amount_cents as f64) / 100.0,
        client_name,
        input.payment_method
    );
    tx.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'payment', ?2, 'payment_received', ?3)",
        params![act_id, id, desc],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(PaymentItem {
        id,
        client_id: input.client_id,
        client_name,
        project_id: input.project_id,
        project_name,
        commission_id: input.commission_id,
        commission_title,
        invoice_id: input.invoice_id,
        amount_cents: input.amount_cents,
        payment_date: input.payment_date,
        payment_method: input.payment_method,
        reference_number: input.reference_number,
        receipt_number: Some(receipt_number),
        notes: input.notes,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn delete_payment(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let comm_id: Option<String> = tx
        .query_row(
            "SELECT commission_id FROM payments WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    tx.execute("DELETE FROM payments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    if let Some(ref cid) = comm_id {
        let (comm_price, deposit_amount): (i64, i64) = tx
            .query_row(
                "SELECT price_cents, deposit_amount_cents FROM commissions WHERE id = ?1",
                params![cid],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
            .map_err(|e| e.to_string())?;

        let total_paid: i64 = tx
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE commission_id = ?1",
                params![cid],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;

        let new_remaining = if comm_price > total_paid {
            comm_price - total_paid
        } else {
            0
        };

        let new_payment_status = if total_paid == 0 {
            "unpaid"
        } else if total_paid >= comm_price {
            "paid"
        } else if total_paid == deposit_amount {
            "deposit_paid"
        } else {
            "partially_paid"
        };

        tx.execute(
            "UPDATE commissions
             SET remaining_balance_cents = ?1, payment_status = ?2, updated_at = datetime('now')
             WHERE id = ?3",
            params![new_remaining, new_payment_status, cid],
        )
        .map_err(|e| e.to_string())?;
    }

    let act_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'payment', ?2, 'deleted', 'Payment entry deleted')",
        params![act_id, id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(true)
}

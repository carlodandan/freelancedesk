use crate::models::entities::{CommissionItem, CommissionLineItem, CreateCommissionInput};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

/// Lists commissions, optionally filtered by client or project, with their line items.
#[tauri::command]
pub fn get_commissions(
    state: State<'_, AppState>,
    client_id: Option<String>,
    project_id: Option<String>,
) -> Result<Vec<CommissionItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            com.id, com.client_id, c.name as client_name, com.project_id, pr.name as project_name,
            com.title, com.description, com.commission_type, com.price_cents,
            com.deposit_percentage, com.deposit_amount_cents, com.remaining_balance_cents,
            COALESCE((SELECT SUM(py.amount_cents) FROM payments py WHERE py.commission_id = com.id), 0) as total_paid,
            com.date_requested, com.start_date, com.deadline, com.completion_date,
            com.status, com.payment_status, com.notes, com.created_at, com.updated_at
        FROM commissions com
        JOIN clients c ON com.client_id = c.id
        LEFT JOIN projects pr ON com.project_id = pr.id
        WHERE (?1 IS NULL OR com.client_id = ?1)
          AND (?2 IS NULL OR com.project_id = ?2)
        ORDER BY com.created_at DESC";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![client_id, project_id], |row| {
            let comm_id: String = row.get(0)?;

            Ok(CommissionItem {
                id: comm_id,
                client_id: row.get(1)?,
                client_name: row.get(2)?,
                project_id: row.get(3)?,
                project_name: row.get(4)?,
                title: row.get(5)?,
                description: row.get(6)?,
                commission_type: row.get(7)?,
                price_cents: row.get(8)?,
                deposit_percentage: row.get(9)?,
                deposit_amount_cents: row.get(10)?,
                remaining_balance_cents: row.get(11)?,
                total_paid_cents: row.get(12)?,
                date_requested: row.get(13)?,
                start_date: row.get(14)?,
                deadline: row.get(15)?,
                completion_date: row.get(16)?,
                status: row.get(17)?,
                payment_status: row.get(18)?,
                notes: row.get(19)?,
                items: Vec::new(),
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut commissions: Vec<CommissionItem> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Attach line items for each commission
    for comm in &mut commissions {
        let mut item_stmt = conn
            .prepare(
                "SELECT id, description, quantity, unit_price_cents, total_price_cents, is_percentage, percentage_value
                 FROM commission_items WHERE commission_id = ?1 ORDER BY sort_order ASC",
            )
            .map_err(|e| e.to_string())?;

        let item_rows = item_stmt
            .query_map(params![comm.id], |r| {
                let is_pct_int: i32 = r.get(5)?;
                Ok(CommissionLineItem {
                    id: r.get(0)?,
                    description: r.get(1)?,
                    quantity: r.get(2)?,
                    unit_price_cents: r.get(3)?,
                    total_price_cents: r.get(4)?,
                    is_percentage: is_pct_int == 1,
                    percentage_value: r.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?;

        comm.items = item_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
    }

    Ok(commissions)
}

/// Creates a commission and its line items in a single transaction.
#[tauri::command]
pub fn create_commission(
    state: State<'_, AppState>,
    input: CreateCommissionInput,
) -> Result<CommissionItem, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let deposit_pct = input.deposit_percentage.unwrap_or(50);
    let deposit_amount_cents = (input.price_cents * deposit_pct as i64) / 100;
    let remaining_balance_cents = input.price_cents;
    let status = input.status.unwrap_or_else(|| "inquiry".to_string());
    let payment_status = "unpaid".to_string();

    let client_name: String = conn
        .query_row(
            "SELECT name FROM clients WHERE id = ?1",
            params![input.client_id],
            |r| r.get(0),
        )
        .map_err(|_| "Client not found".to_string())?;

    let project_name: Option<String> = match &input.project_id {
        Some(pid) => conn
            .query_row(
                "SELECT name FROM projects WHERE id = ?1",
                params![pid],
                |r| r.get(0),
            )
            .ok(),
        None => None,
    };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO commissions (
            id, client_id, project_id, title, description, commission_type,
            price_cents, deposit_percentage, deposit_amount_cents, remaining_balance_cents,
            date_requested, start_date, deadline, status, payment_status, notes,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, datetime('now'), datetime('now')
        )",
        params![
            id,
            input.client_id,
            input.project_id,
            input.title.trim(),
            input.description.as_deref().map(str::trim),
            input.commission_type.as_deref().map(str::trim),
            input.price_cents,
            deposit_pct,
            deposit_amount_cents,
            remaining_balance_cents,
            input.date_requested.as_deref().map(str::trim),
            input.start_date.as_deref().map(str::trim),
            input.deadline.as_deref().map(str::trim),
            status,
            payment_status,
            input.notes.as_deref().map(str::trim),
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut line_items = Vec::new();
    for (idx, item) in input.items.iter().enumerate() {
        let item_id = Uuid::new_v4().to_string();
        let is_pct = item.is_percentage.unwrap_or(false);
        let is_pct_int = if is_pct { 1 } else { 0 };
        let total = item.unit_price_cents * (item.quantity as i64);

        tx.execute(
            "INSERT INTO commission_items (id, commission_id, description, quantity, unit_price_cents, total_price_cents, is_percentage, percentage_value, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                item_id,
                id,
                item.description.trim(),
                item.quantity,
                item.unit_price_cents,
                total,
                is_pct_int,
                item.percentage_value,
                idx as i32
            ],
        )
        .map_err(|e| e.to_string())?;

        line_items.push(CommissionLineItem {
            id: item_id,
            description: item.description.clone(),
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            total_price_cents: total,
            is_percentage: is_pct,
            percentage_value: item.percentage_value,
        });
    }

    let act_id = Uuid::new_v4().to_string();
    let desc = format!(
        "Commission '{}' created for {}",
        input.title.trim(),
        client_name
    );
    let _ = tx.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'commission', ?2, 'created', ?3)",
        params![act_id, id, desc],
    );

    tx.commit().map_err(|e| e.to_string())?;

    Ok(CommissionItem {
        id,
        client_id: input.client_id,
        client_name,
        project_id: input.project_id,
        project_name,
        title: input.title,
        description: input.description,
        commission_type: input.commission_type,
        price_cents: input.price_cents,
        deposit_percentage: deposit_pct,
        deposit_amount_cents,
        remaining_balance_cents,
        total_paid_cents: 0,
        date_requested: input.date_requested,
        start_date: input.start_date,
        deadline: input.deadline,
        completion_date: None,
        status,
        payment_status,
        notes: input.notes,
        items: line_items,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

/// Changes a commission's status and maintains its completion date.
#[tauri::command]
pub fn update_commission_status(
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = if status == "completed" {
        "UPDATE commissions
         SET status = ?1, completion_date = COALESCE(completion_date, date('now')), updated_at = datetime('now')
         WHERE id = ?2"
    } else {
        "UPDATE commissions
         SET status = ?1, updated_at = datetime('now')
         WHERE id = ?2"
    };

    conn.execute(sql, params![status, id])
        .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Commission status updated to '{}'", status);
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'commission', ?2, 'status_changed', ?3)",
        params![act_id, id, desc],
    );

    Ok(true)
}

/// Deletes an unpaid commission or cancels one with an existing payment trail.
#[tauri::command]
pub fn delete_commission(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Check if payments exist
    let payment_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM payments WHERE commission_id = ?1",
            params![id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if payment_count > 0 {
        // Protect financial audit trail by marking cancelled
        conn.execute(
            "UPDATE commissions SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        // Cascade delete will automatically delete commission_items
        conn.execute("DELETE FROM commissions WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    }

    let act_id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'commission', ?2, 'deleted', 'Commission removed or cancelled')",
        params![act_id, id],
    );

    Ok(true)
}

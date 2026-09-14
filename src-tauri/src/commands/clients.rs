use crate::models::entities::{ClientItem, CreateClientInput, UpdateClientInput};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_clients(state: State<'_, AppState>) -> Result<Vec<ClientItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            c.id, c.name, c.company_name, c.email, c.phone, c.contact_handle, c.address, c.notes, c.status,
            COALESCE((SELECT SUM(com.price_cents) FROM commissions com WHERE com.client_id = c.id AND com.status != 'cancelled'), 0) as total_billed,
            COALESCE((SELECT SUM(p.amount_cents) FROM payments p WHERE p.client_id = c.id), 0) as total_paid,
            COALESCE((SELECT COUNT(1) FROM projects pr WHERE pr.client_id = c.id AND pr.status IN ('planning', 'in_progress', 'waiting')), 0) as active_projects,
            c.created_at, c.updated_at
        FROM clients c
        ORDER BY c.created_at DESC";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let total_billed: i64 = row.get(9)?;
            let total_paid: i64 = row.get(10)?;
            let outstanding = if total_billed > total_paid {
                total_billed - total_paid
            } else {
                0
            };

            Ok(ClientItem {
                id: row.get(0)?,
                name: row.get(1)?,
                company_name: row.get(2)?,
                email: row.get(3)?,
                phone: row.get(4)?,
                contact_handle: row.get(5)?,
                address: row.get(6)?,
                notes: row.get(7)?,
                status: row.get(8)?,
                total_billed_cents: total_billed,
                total_paid_cents: total_paid,
                outstanding_cents: outstanding,
                active_projects_count: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut clients = Vec::new();
    for client in rows.flatten() {
        clients.push(client);
    }

    Ok(clients)
}

#[tauri::command]
pub fn create_client(
    state: State<'_, AppState>,
    input: CreateClientInput,
) -> Result<ClientItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let status = input.status.unwrap_or_else(|| "active".to_string());

    conn.execute(
        "INSERT INTO clients (id, name, company_name, email, phone, contact_handle, address, notes, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
        params![
            id,
            input.name.trim(),
            input.company_name.as_deref().map(str::trim),
            input.email.as_deref().map(str::trim),
            input.phone.as_deref().map(str::trim),
            input.contact_handle.as_deref().map(str::trim),
            input.address.as_deref().map(str::trim),
            input.notes.as_deref().map(str::trim),
            status
        ],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Client '{}' added", input.name.trim());
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'client', ?2, 'created', ?3)",
        params![act_id, id, desc],
    );

    Ok(ClientItem {
        id,
        name: input.name,
        company_name: input.company_name,
        email: input.email,
        phone: input.phone,
        contact_handle: input.contact_handle,
        address: input.address,
        notes: input.notes,
        status,
        total_billed_cents: 0,
        total_paid_cents: 0,
        outstanding_cents: 0,
        active_projects_count: 0,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_client(
    state: State<'_, AppState>,
    input: UpdateClientInput,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE clients
         SET name = ?1, company_name = ?2, email = ?3, phone = ?4, contact_handle = ?5, address = ?6, notes = ?7, status = ?8, updated_at = datetime('now')
         WHERE id = ?9",
        params![
            input.name.trim(),
            input.company_name.as_deref().map(str::trim),
            input.email.as_deref().map(str::trim),
            input.phone.as_deref().map(str::trim),
            input.contact_handle.as_deref().map(str::trim),
            input.address.as_deref().map(str::trim),
            input.notes.as_deref().map(str::trim),
            input.status,
            input.id
        ],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Client '{}' details updated", input.name);
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'client', ?2, 'updated', ?3)",
        params![act_id, input.id, desc],
    );

    Ok(true)
}

#[tauri::command]
pub fn delete_client(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Check if client has related projects, commissions, payments, or invoices
    let has_records: i64 = conn
        .query_row(
            "SELECT (SELECT COUNT(1) FROM projects WHERE client_id = ?1) +
                    (SELECT COUNT(1) FROM commissions WHERE client_id = ?1) +
                    (SELECT COUNT(1) FROM payments WHERE client_id = ?1) +
                    (SELECT COUNT(1) FROM invoices WHERE client_id = ?1)",
            params![id],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if has_records > 0 {
        // Soft delete / archive if related work exists to protect financial integrity
        conn.execute(
            "UPDATE clients SET status = 'archived', updated_at = datetime('now') WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute("DELETE FROM clients WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    }

    let act_id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'client', ?2, 'deleted', 'Client archived or removed')",
        params![act_id, id],
    );

    Ok(true)
}

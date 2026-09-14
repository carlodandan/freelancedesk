use crate::models::entities::{CreateProjectInput, ProjectItem, UpdateProjectInput};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_projects(
    state: State<'_, AppState>,
    client_id: Option<String>,
) -> Result<Vec<ProjectItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = match &client_id {
        Some(_) => "
            SELECT 
                p.id, p.client_id, c.name as client_name, p.name, p.description, 
                p.start_date, p.deadline, p.status, p.price_cents,
                COALESCE((SELECT SUM(py.amount_cents) FROM payments py WHERE py.project_id = p.id), 0) as total_paid,
                p.notes, p.created_at, p.updated_at
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            WHERE p.client_id = ?1
            ORDER BY p.created_at DESC",
        None => "
            SELECT 
                p.id, p.client_id, c.name as client_name, p.name, p.description, 
                p.start_date, p.deadline, p.status, p.price_cents,
                COALESCE((SELECT SUM(py.amount_cents) FROM payments py WHERE py.project_id = p.id), 0) as total_paid,
                p.notes, p.created_at, p.updated_at
            FROM projects p
            JOIN clients c ON p.client_id = c.id
            ORDER BY p.created_at DESC",
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = match &client_id {
        Some(cid) => stmt
            .query_map(params![cid], map_project_row)
            .map_err(|e| e.to_string())?,
        None => stmt
            .query_map([], map_project_row)
            .map_err(|e| e.to_string())?,
    };

    let mut projects = Vec::new();
    for p in rows.flatten() {
        projects.push(p);
    }

    Ok(projects)
}

fn map_project_row(row: &rusqlite::Row) -> rusqlite::Result<ProjectItem> {
    Ok(ProjectItem {
        id: row.get(0)?,
        client_id: row.get(1)?,
        client_name: row.get(2)?,
        name: row.get(3)?,
        description: row.get(4)?,
        start_date: row.get(5)?,
        deadline: row.get(6)?,
        status: row.get(7)?,
        price_cents: row.get(8)?,
        total_paid_cents: row.get(9)?,
        notes: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    input: CreateProjectInput,
) -> Result<ProjectItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    let status = input.status.unwrap_or_else(|| "planning".to_string());

    // Get client name
    let client_name: String = conn
        .query_row(
            "SELECT name FROM clients WHERE id = ?1",
            params![input.client_id],
            |r| r.get(0),
        )
        .map_err(|_| "Client not found".to_string())?;

    conn.execute(
        "INSERT INTO projects (id, client_id, name, description, start_date, deadline, status, price_cents, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
        params![
            id,
            input.client_id,
            input.name.trim(),
            input.description.as_deref().map(str::trim),
            input.start_date.as_deref().map(str::trim),
            input.deadline.as_deref().map(str::trim),
            status,
            input.price_cents,
            input.notes.as_deref().map(str::trim)
        ],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!(
        "Project '{}' created for {}",
        input.name.trim(),
        client_name
    );
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'project', ?2, 'created', ?3)",
        params![act_id, id, desc],
    );

    Ok(ProjectItem {
        id,
        client_id: input.client_id,
        client_name,
        name: input.name,
        description: input.description,
        start_date: input.start_date,
        deadline: input.deadline,
        status,
        price_cents: input.price_cents,
        total_paid_cents: 0,
        notes: input.notes,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_project(
    state: State<'_, AppState>,
    input: UpdateProjectInput,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects
         SET client_id = ?1, name = ?2, description = ?3, start_date = ?4, deadline = ?5, status = ?6, price_cents = ?7, notes = ?8, updated_at = datetime('now')
         WHERE id = ?9",
        params![
            input.client_id,
            input.name.trim(),
            input.description.as_deref().map(str::trim),
            input.start_date.as_deref().map(str::trim),
            input.deadline.as_deref().map(str::trim),
            input.status,
            input.price_cents,
            input.notes.as_deref().map(str::trim),
            input.id
        ],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!(
        "Project '{}' updated (status: {})",
        input.name, input.status
    );
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'project', ?2, 'updated', ?3)",
        params![act_id, input.id, desc],
    );

    Ok(true)
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE projects SET status = 'archived', updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'project', ?2, 'deleted', 'Project archived')",
        params![act_id, id],
    );

    Ok(true)
}

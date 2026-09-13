use crate::models::entities::{CreateExpenseInput, ExpenseCategoryItem, ExpenseItem};
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_expenses(
    state: State<'_, AppState>,
    category_id: Option<String>,
    project_id: Option<String>,
) -> Result<Vec<ExpenseItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let sql = "
        SELECT 
            e.id, e.project_id, pr.name as project_name,
            e.category_id, c.name as category_name,
            e.amount_cents, e.date, e.description, e.payment_method,
            e.receipt_file_path, e.notes, e.created_at
        FROM expenses e
        JOIN expense_categories c ON e.category_id = c.id
        LEFT JOIN projects pr ON e.project_id = pr.id
        WHERE (?1 IS NULL OR e.category_id = ?1)
          AND (?2 IS NULL OR e.project_id = ?2)
        ORDER BY e.date DESC, e.created_at DESC";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![category_id, project_id], |row| {
            Ok(ExpenseItem {
                id: row.get(0)?,
                project_id: row.get(1)?,
                project_name: row.get(2)?,
                category_id: row.get(3)?,
                category_name: row.get(4)?,
                amount_cents: row.get(5)?,
                date: row.get(6)?,
                description: row.get(7)?,
                payment_method: row.get(8)?,
                receipt_file_path: row.get(9)?,
                notes: row.get(10)?,
                created_at: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut expenses = Vec::new();
    for exp in rows.flatten() {
        expenses.push(exp);
    }

    Ok(expenses)
}

#[tauri::command]
pub fn create_expense(
    state: State<'_, AppState>,
    input: CreateExpenseInput,
) -> Result<ExpenseItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();

    let category_name: String = conn
        .query_row(
            "SELECT name FROM expense_categories WHERE id = ?1",
            params![input.category_id],
            |r| r.get(0),
        )
        .map_err(|_| "Expense category not found".to_string())?;

    let project_name: Option<String> = match &input.project_id {
        Some(pid) => conn
            .query_row("SELECT name FROM projects WHERE id = ?1", params![pid], |r| {
                r.get(0)
            })
            .ok(),
        None => None,
    };

    conn.execute(
        "INSERT INTO expenses (
            id, project_id, category_id, amount_cents, date, description, payment_method, receipt_file_path, notes, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))",
        params![
            id,
            input.project_id,
            input.category_id,
            input.amount_cents,
            input.date.trim(),
            input.description.trim(),
            input.payment_method.trim(),
            input.receipt_file_path.as_deref().map(str::trim),
            input.notes.as_deref().map(str::trim),
        ],
    )
    .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let desc = format!("Expense logged: {} ({})", input.description.trim(), category_name);
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'expense', ?2, 'created', ?3)",
        params![act_id, id, desc],
    );

    Ok(ExpenseItem {
        id,
        project_id: input.project_id,
        project_name,
        category_id: input.category_id,
        category_name,
        amount_cents: input.amount_cents,
        date: input.date,
        description: input.description,
        payment_method: input.payment_method,
        receipt_file_path: input.receipt_file_path,
        notes: input.notes,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn delete_expense(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM expenses WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let act_id = Uuid::new_v4().to_string();
    let _ = conn.execute(
        "INSERT INTO activity_log (id, entity_type, entity_id, action, description) VALUES (?1, 'expense', ?2, 'deleted', 'Expense deleted')",
        params![act_id, id],
    );

    Ok(true)
}

#[tauri::command]
pub fn get_expense_categories(
    state: State<'_, AppState>,
) -> Result<Vec<ExpenseCategoryItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, is_system FROM expense_categories ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let is_sys_int: i32 = row.get(2)?;
            Ok(ExpenseCategoryItem {
                id: row.get(0)?,
                name: row.get(1)?,
                is_system: is_sys_int == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut categories = Vec::new();
    for c in rows.flatten() {
        categories.push(c);
    }

    Ok(categories)
}

#[tauri::command]
pub fn create_expense_category(
    state: State<'_, AppState>,
    name: String,
) -> Result<ExpenseCategoryItem, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO expense_categories (id, name, is_system) VALUES (?1, ?2, 0)",
        params![id, name.trim()],
    )
    .map_err(|e| e.to_string())?;

    Ok(ExpenseCategoryItem {
        id,
        name,
        is_system: false,
    })
}

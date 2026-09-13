use crate::AppState;
use rusqlite::Connection;
use std::fs;
use tauri::State;

#[tauri::command]
pub fn create_backup(state: State<'_, AppState>) -> Result<String, String> {
    let backups_dir = state.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("FreelanceDesk_Backup_{}.db", timestamp);
    let backup_path = backups_dir.join(&backup_filename);

    // Flush WAL to disk first
    {
        let conn = state.db.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| e.to_string())?;
    }

    fs::copy(&state.db_path, &backup_path).map_err(|e| e.to_string())?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    backup_file_path: String,
) -> Result<String, String> {
    let source_path = std::path::Path::new(&backup_file_path);
    if !source_path.exists() {
        return Err("Selected backup file does not exist".to_string());
    }

    // Verify source database integrity first
    {
        let verify_conn = Connection::open(source_path)
            .map_err(|e| format!("Invalid SQLite backup file: {}", e))?;
        let check: String = verify_conn
            .query_row("PRAGMA integrity_check;", [], |r| r.get(0))
            .map_err(|e| format!("Integrity check failed: {}", e))?;
        if check != "ok" {
            return Err(format!("Backup database is corrupted: {}", check));
        }
    }

    // Create a safety backup of the current database before restoring!
    let backups_dir = state.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let safety_path = backups_dir.join(format!("Safety_Backup_Before_Restore_{}.db", timestamp));

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    // Checkpoint current DB and copy
    let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    let _ = fs::copy(&state.db_path, &safety_path);

    // Copy source backup over active db
    fs::copy(source_path, &state.db_path).map_err(|e| e.to_string())?;

    // Reopen database connection
    *conn = Connection::open(&state.db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )
    .map_err(|e| e.to_string())?;

    Ok(format!(
        "Database restored successfully. A safety backup was saved at: {}",
        safety_path.to_string_lossy()
    ))
}

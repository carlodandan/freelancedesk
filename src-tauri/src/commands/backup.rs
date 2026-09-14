use crate::AppState;
use rusqlite::backup::Backup;
use rusqlite::Connection;
use std::fs;
use std::time::Duration;
use tauri::State;

#[tauri::command]
pub fn create_backup(state: State<'_, AppState>) -> Result<String, String> {
    let backups_dir = state.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("FreelanceDesk_Backup_{}.db", timestamp);
    let backup_path = backups_dir.join(&backup_filename);

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Use SQLite Online Backup API while holding the mutex lock
    let mut dst = Connection::open(&backup_path).map_err(|e| e.to_string())?;
    let backup = Backup::new(&conn, &mut dst).map_err(|e| e.to_string())?;
    backup
        .run_to_completion(100, Duration::from_millis(10), None)
        .map_err(|e| format!("Backup creation failed: {}", e))?;

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

    // Verify source database integrity and FreelanceDesk schema
    let verify_conn =
        Connection::open(source_path).map_err(|e| format!("Invalid SQLite backup file: {}", e))?;

    let check: String = verify_conn
        .query_row("PRAGMA integrity_check;", [], |r| r.get(0))
        .map_err(|e| format!("Integrity check failed: {}", e))?;
    if check != "ok" {
        return Err(format!("Backup database is corrupted: {}", check));
    }

    // Verify schema compatibility (must have schema_migrations table)
    let has_schema: bool = verify_conn
        .query_row(
            "SELECT COUNT(1) > 0 FROM sqlite_master WHERE type='table' AND name='schema_migrations';",
            [],
            |r| r.get(0),
        )
        .unwrap_or(false);
    if !has_schema {
        return Err(
            "Backup file does not contain a valid FreelanceDesk database schema".to_string(),
        );
    }

    let backups_dir = state.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let safety_path = backups_dir.join(format!("Safety_Backup_Before_Restore_{}.db", timestamp));

    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    // Create an atomic safety backup using SQLite Online Backup API
    {
        let mut safety_conn = Connection::open(&safety_path).map_err(|e| e.to_string())?;
        let safety_backup = Backup::new(&*conn, &mut safety_conn).map_err(|e| e.to_string())?;
        safety_backup
            .run_to_completion(100, Duration::from_millis(10), None)
            .map_err(|e| format!("Failed to create safety backup: {}", e))?;
    }

    // Restore from source into active connection using SQLite Online Backup API
    {
        let restore = Backup::new(&verify_conn, &mut *conn).map_err(|e| e.to_string())?;
        restore
            .run_to_completion(100, Duration::from_millis(10), None)
            .map_err(|e| format!("Failed to restore database: {}", e))?;
    }

    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA wal_checkpoint(TRUNCATE);",
    )
    .map_err(|e| e.to_string())?;

    Ok(format!(
        "Database restored successfully. A safety backup was saved at: {}",
        safety_path.to_string_lossy()
    ))
}

use crate::AppState;
use rusqlite::backup::Backup;
use rusqlite::Connection;
use std::collections::HashSet;
use std::fs;
use std::time::Duration;
use tauri::State;

const SUPPORTED_SCHEMA_VERSION: i64 = 1;

const REQUIRED_SCHEMA: &[(&str, &[&str])] = &[
    ("schema_migrations", &["version", "name", "applied_at"]),
    ("settings", &["key", "value", "updated_at"]),
    (
        "clients",
        &[
            "id",
            "name",
            "company_name",
            "email",
            "phone",
            "contact_handle",
            "address",
            "notes",
            "status",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "projects",
        &[
            "id",
            "client_id",
            "name",
            "description",
            "start_date",
            "deadline",
            "status",
            "price_cents",
            "notes",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "commissions",
        &[
            "id",
            "client_id",
            "project_id",
            "title",
            "description",
            "commission_type",
            "price_cents",
            "deposit_percentage",
            "deposit_amount_cents",
            "remaining_balance_cents",
            "date_requested",
            "start_date",
            "deadline",
            "completion_date",
            "status",
            "payment_status",
            "notes",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "commission_items",
        &[
            "id",
            "commission_id",
            "description",
            "quantity",
            "unit_price_cents",
            "total_price_cents",
            "is_percentage",
            "percentage_value",
            "sort_order",
        ],
    ),
    (
        "invoices",
        &[
            "id",
            "client_id",
            "invoice_number",
            "issue_date",
            "due_date",
            "subtotal_cents",
            "discount_cents",
            "tax_rate_bps",
            "tax_amount_cents",
            "total_cents",
            "status",
            "notes",
            "payment_instructions",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "invoice_items",
        &[
            "id",
            "invoice_id",
            "commission_id",
            "description",
            "quantity",
            "unit_price_cents",
            "total_price_cents",
            "sort_order",
        ],
    ),
    (
        "payments",
        &[
            "id",
            "client_id",
            "project_id",
            "commission_id",
            "invoice_id",
            "amount_cents",
            "payment_date",
            "payment_method",
            "reference_number",
            "receipt_number",
            "notes",
            "created_at",
        ],
    ),
    (
        "expense_categories",
        &["id", "name", "is_system", "created_at"],
    ),
    (
        "expenses",
        &[
            "id",
            "project_id",
            "category_id",
            "amount_cents",
            "date",
            "description",
            "payment_method",
            "receipt_file_path",
            "notes",
            "created_at",
        ],
    ),
    (
        "pricing_items",
        &[
            "id",
            "title",
            "description",
            "base_price_cents",
            "is_percentage",
            "percentage_value",
            "category",
            "created_at",
            "updated_at",
        ],
    ),
    (
        "attachments",
        &[
            "id",
            "entity_type",
            "entity_id",
            "file_name",
            "storage_path",
            "file_size_bytes",
            "mime_type",
            "created_at",
        ],
    ),
    (
        "activity_log",
        &[
            "id",
            "entity_type",
            "entity_id",
            "action",
            "description",
            "created_at",
        ],
    ),
];

/// Verifies that a backup contains the supported schema version and required columns.
fn validate_backup_schema(conn: &Connection) -> Result<(), String> {
    let has_migrations_table: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to inspect backup schema: {}", e))?;
    if !has_migrations_table {
        return Err("Backup file does not contain a FreelanceDesk schema".to_string());
    }

    let versions = {
        let mut stmt = conn
            .prepare("SELECT version FROM schema_migrations ORDER BY version")
            .map_err(|e| format!("Failed to read backup schema version: {}", e))?;
        let rows = stmt
            .query_map([], |row| row.get::<_, i64>(0))
            .map_err(|e| format!("Failed to read backup schema version: {}", e))?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to read backup schema version: {}", e))?
    };

    if versions.as_slice() != [SUPPORTED_SCHEMA_VERSION] {
        return Err(format!(
            "Unsupported backup schema version: expected exactly version {}, found {:?}",
            SUPPORTED_SCHEMA_VERSION, versions
        ));
    }

    for &(table, required_columns) in REQUIRED_SCHEMA {
        let is_table: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                [table],
                |row| row.get(0),
            )
            .map_err(|e| format!("Failed to inspect backup table '{}': {}", table, e))?;
        if !is_table {
            return Err(format!(
                "Backup schema is missing required table '{}'",
                table
            ));
        }

        let columns = {
            let mut stmt = conn
                .prepare("SELECT name FROM pragma_table_info(?1)")
                .map_err(|e| format!("Failed to inspect backup table '{}': {}", table, e))?;
            let rows = stmt
                .query_map([table], |row| row.get::<_, String>(0))
                .map_err(|e| format!("Failed to inspect backup table '{}': {}", table, e))?;
            rows.collect::<Result<HashSet<_>, _>>()
                .map_err(|e| format!("Failed to inspect backup table '{}': {}", table, e))?
        };

        for &column in required_columns {
            if !columns.contains(column) {
                return Err(format!(
                    "Backup schema table '{}' is missing required column '{}'",
                    table, column
                ));
            }
        }
    }

    Ok(())
}

/// Creates either a local SQLite backup or a passphrase-protected portable backup.
#[tauri::command]
pub fn create_backup(
    state: State<'_, AppState>,
    passphrase: Option<String>,
) -> Result<String, String> {
    let backups_dir = state.app_data_dir.join("backups");
    fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let clean_passphrase = passphrase.as_deref().map(str::trim).filter(|s| !s.is_empty());

    if let Some(pass) = clean_passphrase {
        // Encrypted portable backup (.fdesk)
        let temp_path = backups_dir.join(format!("temp_export_{}.db", timestamp));

        {
            let conn = state.db.lock().map_err(|e| e.to_string())?;
            let mut dst = Connection::open(&temp_path).map_err(|e| e.to_string())?;
            let backup = Backup::new(&conn, &mut dst).map_err(|e| e.to_string())?;
            backup
                .run_to_completion(100, Duration::from_millis(10), None)
                .map_err(|e| format!("Temporary backup snapshot failed: {}", e))?;
        }

        // Decrypt client fields in temporary snapshot so DB is in clean canonical format
        {
            let mut temp_conn = Connection::open(&temp_path).map_err(|e| e.to_string())?;
            crate::security::crypto::decrypt_all_client_fields(&mut temp_conn, &state.vault_key)?;
            // Remove local machine-specific vault key from exported settings
            let _ = temp_conn.execute("DELETE FROM settings WHERE key = 'local_vault_key'", []);
            temp_conn
                .execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
                .map_err(|e| e.to_string())?;
        }

        let raw_bytes = fs::read(&temp_path).map_err(|e| format!("Failed to read temporary snapshot: {}", e))?;
        let _ = fs::remove_file(&temp_path);

        let encrypted_bytes = crate::security::crypto::encrypt_backup_payload(&raw_bytes, pass)?;
        let backup_filename = format!("FreelanceDesk_Backup_{}.fdesk", timestamp);
        let backup_path = backups_dir.join(&backup_filename);

        fs::write(&backup_path, encrypted_bytes)
            .map_err(|e| format!("Failed to write encrypted backup file: {}", e))?;

        Ok(backup_path.to_string_lossy().to_string())
    } else {
        // Standard unencrypted local SQLite backup (.db)
        let backup_filename = format!("FreelanceDesk_Backup_{}.db", timestamp);
        let backup_path = backups_dir.join(&backup_filename);

        let conn = state.db.lock().map_err(|e| e.to_string())?;

        let mut dst = Connection::open(&backup_path).map_err(|e| e.to_string())?;
        let backup = Backup::new(&conn, &mut dst).map_err(|e| e.to_string())?;
        backup
            .run_to_completion(100, Duration::from_millis(10), None)
            .map_err(|e| format!("Backup creation failed: {}", e))?;

        Ok(backup_path.to_string_lossy().to_string())
    }
}

/// Restores a validated SQLite snapshot after preserving the current database.
fn restore_from_sqlite_path(
    state: &AppState,
    source_path: &std::path::Path,
) -> Result<String, String> {
    // Verify source database integrity and FreelanceDesk schema
    let verify_conn =
        Connection::open(source_path).map_err(|e| format!("Invalid SQLite backup file: {}", e))?;

    let check: String = verify_conn
        .query_row("PRAGMA integrity_check;", [], |r| r.get(0))
        .map_err(|e| format!("Integrity check failed: {}", e))?;
    if check != "ok" {
        return Err(format!("Backup database is corrupted: {}", check));
    }

    validate_backup_schema(&verify_conn)?;

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

    // Ensure local vault key is configured for this machine and seal clients
    crate::security::save_vault_key(&conn, &state.vault_key)?;
    crate::security::crypto::migrate_unencrypted_clients(&mut *conn, &state.vault_key)?;

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

/// Restores a plain or passphrase-protected backup into the active database.
#[tauri::command]
pub fn restore_backup(
    state: State<'_, AppState>,
    backup_file_path: String,
    passphrase: Option<String>,
) -> Result<String, String> {
    let source_path = std::path::Path::new(&backup_file_path);
    if !source_path.exists() {
        return Err("Selected backup file does not exist".to_string());
    }

    let file_bytes = fs::read(source_path).map_err(|e| format!("Failed to read backup file: {}", e))?;

    let is_encrypted = crate::security::crypto::is_encrypted_backup(&file_bytes)
        || source_path.extension().map_or(false, |ext| ext == "fdesk");

    if is_encrypted {
        let pass = match passphrase.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            Some(p) => p,
            None => return Err("A passphrase is required to decrypt this protected backup (.fdesk).".to_string()),
        };

        let decrypted_bytes = crate::security::crypto::decrypt_backup_payload(&file_bytes, pass)?;

        let backups_dir = state.app_data_dir.join("backups");
        fs::create_dir_all(&backups_dir).map_err(|e| e.to_string())?;
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let temp_restore_path = backups_dir.join(format!("temp_restore_{}.db", timestamp));

        fs::write(&temp_restore_path, decrypted_bytes)
            .map_err(|e| format!("Failed to write decrypted database snapshot: {}", e))?;

        let res = restore_from_sqlite_path(&state, &temp_restore_path);
        let _ = fs::remove_file(&temp_restore_path);
        res
    } else {
        restore_from_sqlite_path(&state, source_path)
    }
}

#[cfg(test)]
mod tests {
    use super::validate_backup_schema;
    use crate::database::migrations::run_migrations;
    use rusqlite::Connection;

    fn valid_database() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn accepts_the_supported_complete_schema() {
        assert!(validate_backup_schema(&valid_database()).is_ok());
    }

    #[test]
    fn rejects_empty_or_unsupported_schema_versions() {
        let conn = valid_database();
        conn.execute("DELETE FROM schema_migrations", []).unwrap();
        assert!(validate_backup_schema(&conn).is_err());

        conn.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (2, 'future')",
            [],
        )
        .unwrap();
        assert!(validate_backup_schema(&conn).is_err());
    }

    #[test]
    fn rejects_a_schema_missing_required_tables() {
        let conn = valid_database();
        conn.execute("DROP TABLE payments", []).unwrap();
        assert!(validate_backup_schema(&conn).is_err());
    }

    #[test]
    fn fdesk_roundtrip_encryption_and_decryption() {
        let dummy_db = b"SQLite format 3\0-mock-database-bytes-for-freelancedesk";
        let pass = "CorrectHorseBatteryStaple!";

        let encrypted = crate::security::crypto::encrypt_backup_payload(dummy_db, pass).unwrap();
        assert!(crate::security::crypto::is_encrypted_backup(&encrypted));

        let decrypted = crate::security::crypto::decrypt_backup_payload(&encrypted, pass).unwrap();
        assert_eq!(decrypted, dummy_db);

        let wrong_err = crate::security::crypto::decrypt_backup_payload(&encrypted, "wrong-pass");
        assert!(wrong_err.is_err());
    }

    #[test]
    fn fdesk_rejects_corrupted_payload() {
        let mut corrupted =
            crate::security::crypto::encrypt_backup_payload(b"SQLite format 3\0", "testpass").unwrap();
        let len = corrupted.len();
        corrupted[len - 1] ^= 0xFF;

        let err = crate::security::crypto::decrypt_backup_payload(&corrupted, "testpass");
        assert!(err.is_err());
    }
}

pub mod crypto;
pub mod dpapi;

use base64::Engine;
use rusqlite::Connection;
use std::sync::Mutex;

const VAULT_SETTING_KEY: &str = "local_vault_key";

pub fn save_vault_key(conn: &Connection, key: &[u8; 32]) -> Result<(), String> {
    let protected = dpapi::protect(key)?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&protected);

    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        [VAULT_SETTING_KEY, &b64],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn get_or_create_vault_key(db: &Mutex<Connection>) -> Result<[u8; 32], String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    // Check if key already exists in settings
    let row_result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [VAULT_SETTING_KEY],
        |row| row.get::<_, String>(0),
    );

    match row_result {
        Ok(base64_val) => {
            let blob = base64::engine::general_purpose::STANDARD
                .decode(base64_val.trim())
                .map_err(|e| format!("Corrupted vault key in settings: {}", e))?;

            if blob.is_empty() {
                return Err("Stored vault key is empty".to_string());
            }

            let unprotected = dpapi::unprotect(&blob)
                .map_err(|e| format!("Failed to unlock local vault key via Windows DPAPI: {}", e))?;

            if unprotected.len() != 32 {
                return Err(format!(
                    "Invalid vault key length: expected 32 bytes, got {}",
                    unprotected.len()
                ));
            }

            let mut key = [0u8; 32];
            key.copy_from_slice(&unprotected);
            Ok(key)
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            // Generate new master key only on fresh database
            let key = crypto::generate_master_key();
            save_vault_key(&conn, &key)?;
            Ok(key)
        }
        Err(e) => Err(format!("Failed to query settings table for vault key: {}", e)),
    }
}


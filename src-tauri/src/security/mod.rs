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
    let existing_blob: Option<Vec<u8>> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            [VAULT_SETTING_KEY],
            |row| {
                let s: String = row.get(0)?;
                match base64::engine::general_purpose::STANDARD.decode(s) {
                    Ok(bytes) => Ok(bytes),
                    Err(_) => Ok(Vec::new()),
                }
            },
        )
        .ok();

    if let Some(blob) = existing_blob {
        if !blob.is_empty() {
            if let Ok(unprotected) = dpapi::unprotect(&blob) {
                if unprotected.len() == 32 {
                    let mut key = [0u8; 32];
                    key.copy_from_slice(&unprotected);
                    return Ok(key);
                }
            }
        }
    }

    // Generate new master key
    let key = crypto::generate_master_key();
    save_vault_key(&conn, &key)?;

    Ok(key)
}


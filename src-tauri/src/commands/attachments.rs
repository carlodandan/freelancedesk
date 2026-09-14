use crate::models::entities::{AddAttachmentInput, AttachmentItem};
use crate::AppState;
use rusqlite::params;
use std::fs;
use tauri::State;
use uuid::Uuid;

fn validate_entity_type(entity_type: &str) -> Result<(), String> {
    match entity_type {
        "client" | "project" | "commission" | "expense" | "invoice" => Ok(()),
        _ => Err(format!("Unsupported or invalid entity type: {}", entity_type)),
    }
}

#[tauri::command]
pub fn get_attachments(
    state: State<'_, AppState>,
    entity_type: String,
    entity_id: String,
) -> Result<Vec<AttachmentItem>, String> {
    validate_entity_type(&entity_type)?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, entity_type, entity_id, file_name, storage_path, file_size_bytes, mime_type, created_at
             FROM attachments
             WHERE entity_type = ?1 AND entity_id = ?2
             ORDER BY created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![entity_type, entity_id], |r| {
            Ok(AttachmentItem {
                id: r.get(0)?,
                entity_type: r.get(1)?,
                entity_id: r.get(2)?,
                file_name: r.get(3)?,
                storage_path: r.get(4)?,
                file_size_bytes: r.get(5)?,
                mime_type: r.get(6)?,
                created_at: r.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let attachments: Vec<AttachmentItem> = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(attachments)
}

#[tauri::command]
pub fn add_attachment(
    state: State<'_, AppState>,
    input: AddAttachmentInput,
) -> Result<AttachmentItem, String> {
    validate_entity_type(&input.entity_type)?;

    let id = Uuid::new_v4().to_string();

    // Sanitize filename
    let clean_name: String = input
        .file_name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect();

    let clean_name = if clean_name.is_empty() {
        "attachment.bin".to_string()
    } else {
        clean_name
    };

    let target_dir = state.app_data_dir.join("attachments").join(&input.entity_type);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let stored_file_name = format!("{}_{}", id, clean_name);
    let target_path = target_dir.join(&stored_file_name);

    // Decode base64 content before acquiring database mutex
    let raw_bytes = if let Some(comma_pos) = input.file_base64.find(',') {
        &input.file_base64[comma_pos + 1..]
    } else {
        &input.file_base64
    };

    let decoded = base64_decode(raw_bytes).map_err(|e| format!("Base64 decode failed: {}", e))?;
    let file_size = decoded.len() as i64;

    fs::write(&target_path, &decoded).map_err(|e| e.to_string())?;

    let storage_rel_path = target_path.to_string_lossy().to_string();

    // Acquire lock solely for the database insertion
    let conn = state.db.lock().map_err(|e| {
        let _ = fs::remove_file(&target_path);
        e.to_string()
    })?;

    if let Err(e) = conn.execute(
        "INSERT INTO attachments (id, entity_type, entity_id, file_name, storage_path, file_size_bytes, mime_type, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        params![
            id,
            input.entity_type,
            input.entity_id,
            clean_name,
            storage_rel_path,
            file_size,
            input.mime_type,
        ],
    ) {
        let _ = fs::remove_file(&target_path);
        return Err(e.to_string());
    }

    Ok(AttachmentItem {
        id,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        file_name: clean_name,
        storage_path: storage_rel_path,
        file_size_bytes: file_size,
        mime_type: input.mime_type,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn delete_attachment(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let storage_path: Option<String> = conn
        .query_row(
            "SELECT storage_path FROM attachments WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .ok();

    if let Some(path_str) = storage_path {
        let path = std::path::Path::new(&path_str);
        if path.exists() {
            fs::remove_file(path).map_err(|e| format!("Failed to remove attachment file: {}", e))?;
        }
    }

    conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(true)
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    // Simple custom base64 decoder to avoid requiring an extra crate
    let table = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut clean = Vec::new();
    for b in input.bytes() {
        if b != b'\r' && b != b'\n' && b != b' ' {
            clean.push(b);
        }
    }

    let mut out = Vec::new();
    let mut buf: u32 = 0;
    let mut bits = 0;

    for &b in &clean {
        if b == b'=' {
            break;
        }
        let val = table
            .iter()
            .position(|&x| x == b)
            .ok_or_else(|| "Invalid base64 character".to_string())? as u32;
        buf = (buf << 6) | val;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
            buf &= (1 << bits) - 1;
        }
    }

    Ok(out)
}

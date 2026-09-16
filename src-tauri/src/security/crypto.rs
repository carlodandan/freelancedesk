use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use argon2::Argon2;
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use rand::Rng;

pub const ENC_PREFIX: &str = "enc:v1:";
pub const BACKUP_MAGIC: &[u8; 4] = b"FDSK";
pub const BACKUP_VERSION: u8 = 1;

pub fn generate_master_key() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::thread_rng().fill(&mut key);
    key
}

pub fn encrypt_field(plaintext: &str, key: &[u8; 32]) -> String {
    let trimmed = plaintext.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = match Aes256Gcm::new_from_slice(key) {
        Ok(c) => c,
        Err(_) => return plaintext.to_string(),
    };

    match cipher.encrypt(nonce, trimmed.as_bytes()) {
        Ok(ciphertext) => {
            let mut combined = Vec::with_capacity(12 + ciphertext.len());
            combined.extend_from_slice(&nonce_bytes);
            combined.extend_from_slice(&ciphertext);
            format!("{}{}", ENC_PREFIX, BASE64.encode(&combined))
        }
        Err(_) => plaintext.to_string(),
    }
}

pub fn decrypt_field(stored: &str, key: &[u8; 32]) -> String {
    if !stored.starts_with(ENC_PREFIX) {
        // Return plaintext as-is for backward compatibility
        return stored.to_string();
    }

    let payload = &stored[ENC_PREFIX.len()..];
    let decoded = match BASE64.decode(payload) {
        Ok(bytes) => bytes,
        Err(_) => return stored.to_string(),
    };

    if decoded.len() < 12 {
        return stored.to_string();
    }

    let (nonce_bytes, ciphertext) = decoded.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = match Aes256Gcm::new_from_slice(key) {
        Ok(c) => c,
        Err(_) => return stored.to_string(),
    };

    match cipher.decrypt(nonce, ciphertext) {
        Ok(decrypted_bytes) => String::from_utf8(decrypted_bytes).unwrap_or_else(|_| stored.to_string()),
        Err(_) => stored.to_string(),
    }
}

pub fn derive_key_from_passphrase(passphrase: &str, salt: &[u8; 16]) -> Result<[u8; 32], String> {
    let mut derived_key = [0u8; 32];
    let argon2 = Argon2::default();
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut derived_key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(derived_key)
}

pub fn encrypt_backup_payload(sqlite_bytes: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    if passphrase.trim().is_empty() {
        return Err("Passphrase cannot be empty".to_string());
    }

    let mut salt = [0u8; 16];
    rand::thread_rng().fill(&mut salt);

    let key = derive_key_from_passphrase(passphrase, &salt)?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let ciphertext = cipher
        .encrypt(nonce, sqlite_bytes)
        .map_err(|e| format!("Backup encryption failed: {}", e))?;

    let mut output = Vec::with_capacity(4 + 1 + 16 + 12 + ciphertext.len());
    output.extend_from_slice(BACKUP_MAGIC);
    output.push(BACKUP_VERSION);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

pub fn is_encrypted_backup(payload: &[u8]) -> bool {
    payload.len() >= 4 && &payload[0..4] == BACKUP_MAGIC
}

pub fn decrypt_backup_payload(payload: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    if !is_encrypted_backup(payload) {
        return Err("Backup file does not have a valid encrypted header".to_string());
    }

    if payload.len() < 4 + 1 + 16 + 12 + 16 {
        return Err("Corrupted or truncated backup file".to_string());
    }

    let version = payload[4];
    if version != BACKUP_VERSION {
        return Err(format!("Unsupported backup encryption version: {}", version));
    }

    let salt: [u8; 16] = payload[5..21].try_into().map_err(|e| format!("{}", e))?;
    let nonce_bytes: [u8; 12] = payload[21..33].try_into().map_err(|e| format!("{}", e))?;
    let ciphertext = &payload[33..];

    let key = derive_key_from_passphrase(passphrase, &salt)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Incorrect passphrase or corrupted backup file".to_string())
}

pub fn migrate_unencrypted_clients(conn: &mut rusqlite::Connection, key: &[u8; 32]) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id, email, phone, contact_handle, address, notes FROM clients")
        .map_err(|e| e.to_string())?;

    let rows: Vec<(
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    )> = stmt
        .query_map([], |r| {
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                r.get(3)?,
                r.get(4)?,
                r.get(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    for (id, email, phone, handle, address, notes) in rows {
        let mut needs_update = false;

        let enc_email = email.map(|v| {
            if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() {
                needs_update = true;
                encrypt_field(&v, key)
            } else {
                v
            }
        });

        let enc_phone = phone.map(|v| {
            if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() {
                needs_update = true;
                encrypt_field(&v, key)
            } else {
                v
            }
        });

        let enc_handle = handle.map(|v| {
            if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() {
                needs_update = true;
                encrypt_field(&v, key)
            } else {
                v
            }
        });

        let enc_address = address.map(|v| {
            if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() {
                needs_update = true;
                encrypt_field(&v, key)
            } else {
                v
            }
        });

        let enc_notes = notes.map(|v| {
            if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() {
                needs_update = true;
                encrypt_field(&v, key)
            } else {
                v
            }
        });

        if needs_update {
            conn.execute(
                "UPDATE clients SET email = ?1, phone = ?2, contact_handle = ?3, address = ?4, notes = ?5 WHERE id = ?6",
                rusqlite::params![enc_email, enc_phone, enc_handle, enc_address, enc_notes, id],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn decrypt_all_client_fields(conn: &mut rusqlite::Connection, key: &[u8; 32]) -> Result<(), String> {
    let mut stmt = conn
        .prepare("SELECT id, email, phone, contact_handle, address, notes FROM clients")
        .map_err(|e| e.to_string())?;

    let rows: Vec<(
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    )> = stmt
        .query_map([], |r| {
            Ok((
                r.get(0)?,
                r.get(1)?,
                r.get(2)?,
                r.get(3)?,
                r.get(4)?,
                r.get(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .collect();

    for (id, email, phone, handle, address, notes) in rows {
        let dec_email = email.map(|v| decrypt_field(&v, key));
        let dec_phone = phone.map(|v| decrypt_field(&v, key));
        let dec_handle = handle.map(|v| decrypt_field(&v, key));
        let dec_address = address.map(|v| decrypt_field(&v, key));
        let dec_notes = notes.map(|v| decrypt_field(&v, key));

        conn.execute(
            "UPDATE clients SET email = ?1, phone = ?2, contact_handle = ?3, address = ?4, notes = ?5 WHERE id = ?6",
            rusqlite::params![dec_email, dec_phone, dec_handle, dec_address, dec_notes, id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn roundtrip_field_encryption() {
        let key = generate_master_key();
        let original = "maria.santos@creativestudio.ph";
        let encrypted = encrypt_field(original, &key);
        assert!(encrypted.starts_with(ENC_PREFIX));
        assert_ne!(encrypted, original);

        let decrypted = decrypt_field(&encrypted, &key);
        assert_eq!(decrypted, original);
    }

    #[test]
    fn handles_unencrypted_legacy_plaintext() {
        let key = generate_master_key();
        let plaintext = "legacy.client@example.com";
        // Plain text without enc:v1: prefix must pass through untouched
        let decrypted = decrypt_field(plaintext, &key);
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn roundtrip_backup_payload_encryption() {
        let dummy_db = b"SQLite format 3\0 dummy database test content for freelancedesk";
        let pass = "StudioSuperSecretPass123!";

        let encrypted = encrypt_backup_payload(dummy_db, pass).expect("Encryption should succeed");
        assert!(is_encrypted_backup(&encrypted));

        // Decrypt with correct passphrase
        let decrypted = decrypt_backup_payload(&encrypted, pass).expect("Decryption should succeed");
        assert_eq!(decrypted, dummy_db);

        // Decrypt with wrong passphrase must fail
        assert!(decrypt_backup_payload(&encrypted, "wrongpass").is_err());
    }
}

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

pub fn encrypt_field(plaintext: &str, key: &[u8; 32]) -> Result<String, String> {
    let trimmed = plaintext.trim();
    if trimmed.is_empty() {
        return Ok(String::new());
    }

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("AES initialization failed: {}", e))?;

    let ciphertext = cipher
        .encrypt(nonce, trimmed.as_bytes())
        .map_err(|e| format!("AES encryption failed: {}", e))?;

    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);
    Ok(format!("{}{}", ENC_PREFIX, BASE64.encode(&combined)))
}

pub fn decrypt_field(stored: &str, key: &[u8; 32]) -> String {
    try_decrypt_field(stored, key).unwrap_or_else(|_| stored.to_string())
}

pub fn try_decrypt_field(stored: &str, key: &[u8; 32]) -> Result<String, String> {
    if !stored.starts_with(ENC_PREFIX) {
        // Return plaintext as-is for backward compatibility.
        return Ok(stored.to_string());
    }

    let payload = &stored[ENC_PREFIX.len()..];
    let decoded = BASE64
        .decode(payload)
        .map_err(|e| format!("Invalid encrypted field encoding: {}", e))?;

    // AES-GCM requires a 12-byte nonce and appends a 16-byte authentication tag.
    if decoded.len() < 12 + 16 {
        return Err("Encrypted field data is truncated".to_string());
    }

    let (nonce_bytes, ciphertext) = decoded.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("AES initialization failed: {}", e))?;

    let decrypted_bytes = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Encrypted field authentication failed".to_string())?;

    String::from_utf8(decrypted_bytes)
        .map_err(|e| format!("Encrypted field contains invalid UTF-8: {}", e))
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

pub fn migrate_unencrypted_clients(
    conn: &mut rusqlite::Connection,
    key: &[u8; 32],
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let rows: Vec<(
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    )> = {
        let mut stmt = tx
            .prepare("SELECT id, email, phone, contact_handle, address, notes FROM clients")
            .map_err(|e| e.to_string())?;

        let mapped_rows = stmt
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
            .map_err(|e| e.to_string())?;

        mapped_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    for (id, email, phone, handle, address, notes) in rows {
        let mut needs_update = false;

        let enc_email = match email {
            Some(v) if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() => {
                needs_update = true;
                Some(encrypt_field(&v, key)?)
            }
            other => other,
        };

        let enc_phone = match phone {
            Some(v) if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() => {
                needs_update = true;
                Some(encrypt_field(&v, key)?)
            }
            other => other,
        };

        let enc_handle = match handle {
            Some(v) if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() => {
                needs_update = true;
                Some(encrypt_field(&v, key)?)
            }
            other => other,
        };

        let enc_address = match address {
            Some(v) if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() => {
                needs_update = true;
                Some(encrypt_field(&v, key)?)
            }
            other => other,
        };

        let enc_notes = match notes {
            Some(v) if !v.starts_with(ENC_PREFIX) && !v.trim().is_empty() => {
                needs_update = true;
                Some(encrypt_field(&v, key)?)
            }
            other => other,
        };

        if needs_update {
            tx.execute(
                "UPDATE clients SET email = ?1, phone = ?2, contact_handle = ?3, address = ?4, notes = ?5 WHERE id = ?6",
                rusqlite::params![enc_email, enc_phone, enc_handle, enc_address, enc_notes, id],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())
}

pub fn decrypt_all_client_fields(
    conn: &mut rusqlite::Connection,
    key: &[u8; 32],
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let rows: Vec<(
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    )> = {
        let mut stmt = tx
            .prepare("SELECT id, email, phone, contact_handle, address, notes FROM clients")
            .map_err(|e| e.to_string())?;

        let mapped_rows = stmt
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
            .map_err(|e| e.to_string())?;

        mapped_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };

    for (id, email, phone, handle, address, notes) in rows {
        let dec_email = email.map(|v| try_decrypt_field(&v, key)).transpose()?;
        let dec_phone = phone.map(|v| try_decrypt_field(&v, key)).transpose()?;
        let dec_handle = handle.map(|v| try_decrypt_field(&v, key)).transpose()?;
        let dec_address = address.map(|v| try_decrypt_field(&v, key)).transpose()?;
        let dec_notes = notes.map(|v| try_decrypt_field(&v, key)).transpose()?;

        tx.execute(
            "UPDATE clients SET email = ?1, phone = ?2, contact_handle = ?3, address = ?4, notes = ?5 WHERE id = ?6",
            rusqlite::params![dec_email, dec_phone, dec_handle, dec_address, dec_notes, id],
        ).map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_clients_table(conn: &rusqlite::Connection) {
        conn.execute_batch(
            "CREATE TABLE clients (
                id TEXT PRIMARY KEY,
                email TEXT,
                phone TEXT,
                contact_handle TEXT,
                address TEXT,
                notes TEXT
            );",
        )
        .expect("clients table should be created");
    }

    fn encrypt_bytes_for_test(plaintext: &[u8], key: &[u8; 32]) -> String {
        let nonce_bytes = [7u8; 12];
        let nonce = Nonce::from_slice(&nonce_bytes);
        let cipher = Aes256Gcm::new_from_slice(key).expect("cipher should initialize");
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .expect("test payload should encrypt");
        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);
        format!("{}{}", ENC_PREFIX, BASE64.encode(combined))
    }

    #[test]
    fn roundtrip_field_encryption() {
        let key = generate_master_key();
        let original = "maria.santos@creativestudio.ph";
        let encrypted = encrypt_field(original, &key).expect("Encryption should succeed");
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
        assert_eq!(try_decrypt_field(plaintext, &key).unwrap(), plaintext);
    }

    #[test]
    fn strict_field_decryption_rejects_malformed_encrypted_values() {
        let key = generate_master_key();

        assert!(try_decrypt_field("enc:v1:not base64", &key).is_err());
        assert!(try_decrypt_field("enc:v1:AA==", &key).is_err());

        let encrypted = encrypt_field("authenticated", &key).unwrap();
        let mut tampered = BASE64
            .decode(&encrypted[ENC_PREFIX.len()..])
            .expect("encrypted payload should be valid base64");
        let last = tampered.len() - 1;
        tampered[last] ^= 1;
        let tampered = format!("{}{}", ENC_PREFIX, BASE64.encode(tampered));
        assert!(try_decrypt_field(&tampered, &key).is_err());

        let invalid_utf8 = encrypt_bytes_for_test(&[0xff], &key);
        assert!(try_decrypt_field(&invalid_utf8, &key).is_err());
    }

    #[test]
    fn client_migration_rolls_back_all_updates_on_failure() {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        create_clients_table(&conn);
        conn.execute_batch(
            "INSERT INTO clients (id, email) VALUES ('first', 'first@example.com');
             INSERT INTO clients (id, email) VALUES ('second', 'second@example.com');
             CREATE TRIGGER reject_second_client_update
             BEFORE UPDATE ON clients WHEN OLD.id = 'second'
             BEGIN
                 SELECT RAISE(ABORT, 'blocked update');
             END;",
        )
        .unwrap();

        let result = migrate_unencrypted_clients(&mut conn, &generate_master_key());
        assert!(result.is_err());

        let emails: Vec<String> = conn
            .prepare("SELECT email FROM clients ORDER BY id")
            .unwrap()
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<_, _>>()
            .unwrap();
        assert_eq!(emails, ["first@example.com", "second@example.com"]);
    }

    #[test]
    fn client_migration_propagates_row_read_errors() {
        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        create_clients_table(&conn);
        conn.execute(
            "INSERT INTO clients (id, email) VALUES ('client', X'80')",
            [],
        )
        .unwrap();

        assert!(migrate_unencrypted_clients(&mut conn, &generate_master_key()).is_err());
    }

    #[test]
    fn decrypting_all_clients_rolls_back_when_any_field_is_invalid() {
        let key = generate_master_key();
        let valid = encrypt_field("first@example.com", &key).unwrap();
        let mut invalid = BASE64.decode(&valid[ENC_PREFIX.len()..]).unwrap();
        let last = invalid.len() - 1;
        invalid[last] ^= 1;
        let invalid = format!("{}{}", ENC_PREFIX, BASE64.encode(invalid));

        let mut conn = rusqlite::Connection::open_in_memory().unwrap();
        create_clients_table(&conn);
        conn.execute(
            "INSERT INTO clients (id, email) VALUES (?1, ?2)",
            rusqlite::params!["first", valid],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO clients (id, email) VALUES (?1, ?2)",
            rusqlite::params!["second", invalid],
        )
        .unwrap();

        assert!(decrypt_all_client_fields(&mut conn, &key).is_err());
        let stored: String = conn
            .query_row("SELECT email FROM clients WHERE id = 'first'", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert!(stored.starts_with(ENC_PREFIX));
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

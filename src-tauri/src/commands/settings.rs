use crate::models::settings::AppSettings;
use crate::AppState;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })
        .map_err(|e| e.to_string())?;

    let mut settings = AppSettings::default();

    for row in rows {
        if let Ok((key, value)) = row {
            match key.as_str() {
                "freelancer_name" => settings.freelancer_name = value,
                "business_name" => settings.business_name = value,
                "email" => settings.email = value,
                "phone" => settings.phone = value,
                "address" => settings.address = value,
                "currency_code" => settings.currency_code = value,
                "currency_symbol" => settings.currency_symbol = value,
                "date_format" => settings.date_format = value,
                "invoice_prefix" => settings.invoice_prefix = value,
                "default_deposit_pct" => {
                    if let Ok(pct) = value.parse::<i32>() {
                        settings.default_deposit_pct = pct;
                    }
                }
                "default_payment_terms" => settings.default_payment_terms = value,
                "theme" => settings.theme = value,
                "auto_backup_enabled" => settings.auto_backup_enabled = value == "true",
                "backup_frequency" => settings.backup_frequency = value,
                "backup_location" => {
                    if !value.trim().is_empty() {
                        settings.backup_location = Some(value);
                    }
                }
                _ => {}
            }
        }
    }

    Ok(settings)
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let pairs = [
        ("freelancer_name", settings.freelancer_name.clone()),
        ("business_name", settings.business_name.clone()),
        ("email", settings.email.clone()),
        ("phone", settings.phone.clone()),
        ("address", settings.address.clone()),
        ("currency_code", settings.currency_code.clone()),
        ("currency_symbol", settings.currency_symbol.clone()),
        ("date_format", settings.date_format.clone()),
        ("invoice_prefix", settings.invoice_prefix.clone()),
        (
            "default_deposit_pct",
            settings.default_deposit_pct.to_string(),
        ),
        (
            "default_payment_terms",
            settings.default_payment_terms.clone(),
        ),
        ("theme", settings.theme.clone()),
        (
            "auto_backup_enabled",
            settings.auto_backup_enabled.to_string(),
        ),
        ("backup_frequency", settings.backup_frequency.clone()),
        (
            "backup_location",
            settings.backup_location.clone().unwrap_or_default(),
        ),
    ];

    for (k, v) in &pairs {
        tx.execute(
            "INSERT INTO settings (key, value, updated_at)
             VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');",
            params![k, v],
        )
        .map_err(|e| e.to_string())?;
    }

    // Log update in activity_log
    let activity_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO activity_log (id, entity_type, action, description)
         VALUES (?1, 'settings', 'updated', 'Settings updated by user');",
        params![activity_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(settings)
}

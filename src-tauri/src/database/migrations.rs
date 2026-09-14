use rusqlite::{params, Connection, Result};
use uuid::Uuid;

const INITIAL_SCHEMA: &str = include_str!("schema.sql");

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;",
    )?;

    // Ensure migration table exists
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
        [],
    )?;

    // Check if migration 1 has been applied
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM schema_migrations WHERE version = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if count == 0 {
        let tx = conn.transaction()?;

        tx.execute_batch(INITIAL_SCHEMA)?;

        // Seed default expense categories
        let default_categories = [
            "Software",
            "Equipment",
            "Internet",
            "Transportation",
            "Office",
            "Marketing",
            "Services",
            "Other",
        ];

        for cat in &default_categories {
            let cat_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT OR IGNORE INTO expense_categories (id, name, is_system) VALUES (?1, ?2, 1);",
                params![cat_id, cat],
            )?;
        }

        // Seed default settings
        let default_settings = [
            ("freelancer_name", "Freelancer"),
            ("business_name", "Creative Studio"),
            ("email", "freelancer@example.com"),
            ("phone", ""),
            ("address", ""),
            ("currency_code", "PHP"),
            ("currency_symbol", "₱"),
            ("date_format", "YYYY-MM-DD"),
            ("invoice_prefix", "INV"),
            ("default_deposit_pct", "50"),
            ("default_payment_terms", "Due on receipt"),
            ("theme", "system"),
            ("auto_backup_enabled", "false"),
            ("backup_frequency", "weekly"),
        ];

        for (k, v) in &default_settings {
            tx.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2);",
                params![k, v],
            )?;
        }

        // Record migration
        tx.execute(
            "INSERT INTO schema_migrations (version, name) VALUES (1, 'initial_schema');",
            [],
        )?;

        // Log initial activity
        let activity_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO activity_log (id, entity_type, action, description) VALUES (?1, 'system', 'initialized', 'FreelanceDesk database initialized');",
            params![activity_id],
        )?;

        tx.commit()?;
    }

    Ok(())
}

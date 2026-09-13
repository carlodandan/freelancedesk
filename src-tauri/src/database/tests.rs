#[cfg(test)]
mod tests {
    use rusqlite::{params, Connection};
    use uuid::Uuid;
    use crate::database::migrations::run_migrations;

    fn create_test_db() -> Connection {
        let mut conn = Connection::open_in_memory().expect("Failed to open in-memory db");
        run_migrations(&mut conn).expect("Failed to run migrations");
        conn
    }

    #[test]
    fn test_migrations_and_seeding() {
        let conn = create_test_db();

        // Verify schema_migrations table has version 1
        let version: i32 = conn
            .query_row("SELECT version FROM schema_migrations WHERE version = 1", [], |r| r.get(0))
            .expect("Migration 1 not found");
        assert_eq!(version, 1);

        // Verify default categories seeded
        let cat_count: i64 = conn
            .query_row("SELECT COUNT(1) FROM expense_categories", [], |r| r.get(0))
            .expect("Failed to query categories");
        assert_eq!(cat_count, 8);

        // Verify default settings seeded
        let default_currency: String = conn
            .query_row("SELECT value FROM settings WHERE key = 'currency_code'", [], |r| r.get(0))
            .expect("Failed to query currency_code");
        assert_eq!(default_currency, "PHP");
    }

    #[test]
    fn test_foreign_key_enforcement() {
        let conn = create_test_db();

        // Inserting project with non-existent client_id MUST fail
        let fake_client_id = Uuid::new_v4().to_string();
        let proj_id = Uuid::new_v4().to_string();

        let res = conn.execute(
            "INSERT INTO projects (id, client_id, name, price_cents) VALUES (?1, ?2, 'Test Project', 10000);",
            params![proj_id, fake_client_id],
        );

        assert!(res.is_err(), "Foreign key constraint was not enforced!");
    }

    #[test]
    fn test_cascade_delete_commission_items() {
        let conn = create_test_db();

        let client_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO clients (id, name, email) VALUES (?1, 'Maria Santos', 'maria@example.com');",
            params![client_id],
        ).unwrap();

        let comm_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO commissions (id, client_id, title, price_cents, deposit_percentage, deposit_amount_cents, remaining_balance_cents)
             VALUES (?1, ?2, 'Full Body Illustration', 200000, 50, 100000, 200000);",
            params![comm_id, client_id],
        ).unwrap();

        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO commission_items (id, commission_id, description, quantity, unit_price_cents, total_price_cents)
             VALUES (?1, ?2, 'Base Lineart', 1, 100000, 100000);",
            params![item_id, comm_id],
        ).unwrap();

        // Verify item exists
        let item_count: i64 = conn
            .query_row("SELECT COUNT(1) FROM commission_items WHERE commission_id = ?1", params![comm_id], |r| r.get(0))
            .unwrap();
        assert_eq!(item_count, 1);

        // Delete commission
        conn.execute("DELETE FROM commissions WHERE id = ?1;", params![comm_id]).unwrap();

        // Verify commission_items was cascade deleted
        let item_count_after: i64 = conn
            .query_row("SELECT COUNT(1) FROM commission_items WHERE id = ?1", params![item_id], |r| r.get(0))
            .unwrap();
        assert_eq!(item_count_after, 0, "Commission items were not cascade deleted!");
    }

    #[test]
    fn test_client_restrict_delete_with_active_commissions() {
        let conn = create_test_db();

        let client_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO clients (id, name) VALUES (?1, 'Maria Santos');",
            params![client_id],
        ).unwrap();

        let comm_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO commissions (id, client_id, title, price_cents) VALUES (?1, ?2, 'Logo Design', 50000);",
            params![comm_id, client_id],
        ).unwrap();

        // Attempting to delete client should fail because ON DELETE RESTRICT is set
        let del_res = conn.execute("DELETE FROM clients WHERE id = ?1;", params![client_id]);
        assert!(del_res.is_err(), "Deleting client with active commissions should be restricted!");
    }

    #[test]
    fn test_monetary_calculations_precision() {
        // Test integer centavos calculations
        let price_cents: i64 = 200000; // ₱2,000.00
        let deposit_pct: i64 = 50;
        let deposit_cents = (price_cents * deposit_pct) / 100;
        assert_eq!(deposit_cents, 100000); // ₱1,000.00

        let payment1_cents: i64 = 50000; // ₱500.00
        let payment2_cents: i64 = 50000; // ₱500.00
        let total_deposit_paid = payment1_cents + payment2_cents;
        assert_eq!(total_deposit_paid, 100000);

        let remaining_cents = price_cents - total_deposit_paid;
        assert_eq!(remaining_cents, 100000);

        let final_payment_cents: i64 = 100000; // ₱1,000.00
        let final_remaining = remaining_cents - final_payment_cents;
        assert_eq!(final_remaining, 0); // ₱0.00
    }

    #[test]
    fn test_invoice_sequential_numbering_logic() {
        let conn = create_test_db();
        let client_id = Uuid::new_v4().to_string();
        conn.execute("INSERT INTO clients (id, name) VALUES (?1, 'Juan Dela Cruz');", params![client_id]).unwrap();

        let current_year = chrono::Utc::now().format("%Y").to_string();
        let prefix = format!("INV-{}-", current_year);

        // First invoice number
        let next_seq: i64 = conn
            .query_row(
                "SELECT COUNT(1) + 1 FROM invoices WHERE invoice_number LIKE ?1",
                params![format!("{}%", prefix)],
                |r| r.get(0),
            )
            .unwrap();
        let inv_num_1 = format!("INV-{}-{:03}", current_year, next_seq);
        assert_eq!(inv_num_1, format!("INV-{}-001", current_year));

        conn.execute(
            "INSERT INTO invoices (id, client_id, invoice_number, subtotal_cents, total_cents, issue_date)
             VALUES (?1, ?2, ?3, 100000, 100000, '2026-09-14')",
            params![Uuid::new_v4().to_string(), client_id, inv_num_1],
        ).unwrap();

        // Second invoice number
        let next_seq_2: i64 = conn
            .query_row(
                "SELECT COUNT(1) + 1 FROM invoices WHERE invoice_number LIKE ?1",
                params![format!("{}%", prefix)],
                |r| r.get(0),
            )
            .unwrap();
        let inv_num_2 = format!("INV-{}-{:03}", current_year, next_seq_2);
        assert_eq!(inv_num_2, format!("INV-{}-002", current_year));
    }

    #[test]
    fn test_commission_payment_balance_deduction() {
        let conn = create_test_db();
        let client_id = Uuid::new_v4().to_string();
        conn.execute("INSERT INTO clients (id, name) VALUES (?1, 'Studio Client');", params![client_id]).unwrap();

        let comm_id = Uuid::new_v4().to_string();
        let price_cents = 500000; // ₱5,000.00
        let deposit_cents = 250000; // ₱2,500.00
        conn.execute(
            "INSERT INTO commissions (id, client_id, title, price_cents, deposit_percentage, deposit_amount_cents, remaining_balance_cents, payment_status)
             VALUES (?1, ?2, 'Website Overhaul', ?3, 50, ?4, ?3, 'unpaid');",
            params![comm_id, client_id, price_cents, deposit_cents],
        ).unwrap();

        // Pay deposit
        let payment1_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO payments (id, client_id, commission_id, amount_cents, payment_date, payment_method)
             VALUES (?1, ?2, ?3, 250000, '2026-09-14', 'GCash');",
            params![payment1_id, client_id, comm_id],
        ).unwrap();

        // Recalculate remaining
        let total_paid: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE commission_id = ?1",
                params![comm_id],
                |r| r.get(0),
            )
            .unwrap();
        let remaining = price_cents - total_paid;
        let new_status = if remaining <= 0 {
            "fully_paid"
        } else if total_paid >= deposit_cents {
            "deposit_paid"
        } else {
            "partially_paid"
        };

        assert_eq!(remaining, 250000);
        assert_eq!(new_status, "deposit_paid");

        // Pay remaining balance
        let payment2_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO payments (id, client_id, commission_id, amount_cents, payment_date, payment_method)
             VALUES (?1, ?2, ?3, 250000, '2026-09-15', 'Bank Transfer');",
            params![payment2_id, client_id, comm_id],
        ).unwrap();

        let total_paid_2: i64 = conn
            .query_row(
                "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE commission_id = ?1",
                params![comm_id],
                |r| r.get(0),
            )
            .unwrap();
        let remaining_2 = price_cents - total_paid_2;
        let new_status_2 = if remaining_2 <= 0 {
            "fully_paid"
        } else {
            "partially_paid"
        };

        assert_eq!(remaining_2, 0);
        assert_eq!(new_status_2, "fully_paid");
    }
}

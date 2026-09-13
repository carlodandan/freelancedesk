pub mod commands;
pub mod database;
pub mod models;
pub mod services;

use rusqlite::Connection;
use services::storage::StorageManager;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub app_data_dir: PathBuf,
    pub db_path: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app_data_dir: {}", e))?;

            StorageManager::init_directories(&app_data_dir)
                .map_err(|e| format!("Failed to init directories: {}", e))?;

            let db_path = StorageManager::get_db_path(&app_data_dir);
            let conn = database::init_database(&db_path)
                .map_err(|e| format!("Failed to init SQLite database: {}", e))?;

            app.manage(AppState {
                db: Mutex::new(conn),
                app_data_dir,
                db_path,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::dashboard::get_dashboard_summary,
            commands::app::get_app_info,
            // Clients
            commands::clients::get_clients,
            commands::clients::create_client,
            commands::clients::update_client,
            commands::clients::delete_client,
            // Projects
            commands::projects::get_projects,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            // Commissions
            commands::commissions::get_commissions,
            commands::commissions::create_commission,
            commands::commissions::update_commission_status,
            commands::commissions::delete_commission,
            // Payments
            commands::payments::get_payments,
            commands::payments::create_payment,
            commands::payments::delete_payment,
            // Expenses
            commands::expenses::get_expenses,
            commands::expenses::create_expense,
            commands::expenses::delete_expense,
            commands::expenses::get_expense_categories,
            commands::expenses::create_expense_category,
            // Invoices
            commands::invoices::get_invoices,
            commands::invoices::create_invoice,
            commands::invoices::update_invoice_status,
            commands::invoices::delete_invoice,
            // Reports
            commands::reports::get_financial_reports,
            // Search
            commands::search::global_search,
            // Attachments
            commands::attachments::get_attachments,
            commands::attachments::add_attachment,
            commands::attachments::delete_attachment,
            // Backup & Restore
            commands::backup::create_backup,
            commands::backup::restore_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

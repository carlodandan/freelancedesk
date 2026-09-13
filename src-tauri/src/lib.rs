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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

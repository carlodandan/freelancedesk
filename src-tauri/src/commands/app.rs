use crate::models::app::AppInfo;
use crate::AppState;
use tauri::State;

/// Returns application metadata and the path of the active local database.
#[tauri::command]
pub fn get_app_info(state: State<'_, AppState>) -> Result<AppInfo, String> {
    let conn_healthy = match state.db.lock() {
        Ok(conn) => {
            let res: Result<i64, _> = conn.query_row("SELECT 1", [], |r| r.get(0));
            res.is_ok()
        }
        Err(_) => false,
    };

    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        app_data_dir: state.app_data_dir.to_string_lossy().to_string(),
        db_path: state.db_path.to_string_lossy().to_string(),
        is_healthy: conn_healthy,
    })
}

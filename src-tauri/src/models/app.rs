use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub version: String,
    pub app_data_dir: String,
    pub db_path: String,
    pub is_healthy: bool,
}

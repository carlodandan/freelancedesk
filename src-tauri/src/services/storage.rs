use std::fs;
use std::path::{Path, PathBuf};

pub struct StorageManager;

impl StorageManager {
    pub fn init_directories(base_dir: &Path) -> Result<(), std::io::Error> {
        let dirs = [
            base_dir.join("database"),
            base_dir.join("attachments").join("clients"),
            base_dir.join("attachments").join("projects"),
            base_dir.join("attachments").join("commissions"),
            base_dir.join("attachments").join("expenses"),
            base_dir.join("invoices"),
            base_dir.join("receipts"),
            base_dir.join("backups"),
        ];

        for dir in &dirs {
            if !dir.exists() {
                fs::create_dir_all(dir)?;
            }
        }

        Ok(())
    }

    pub fn get_db_path(base_dir: &Path) -> PathBuf {
        base_dir.join("database").join("freelance.db")
    }

    pub fn get_attachments_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("attachments")
    }

    pub fn get_invoices_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("invoices")
    }

    pub fn get_receipts_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("receipts")
    }

    pub fn get_backups_dir(base_dir: &Path) -> PathBuf {
        base_dir.join("backups")
    }
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub freelancer_name: String,
    pub business_name: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub currency_code: String,
    pub currency_symbol: String,
    pub date_format: String,
    pub invoice_prefix: String,
    pub default_deposit_pct: i32,
    pub default_payment_terms: String,
    pub theme: String,
    pub auto_backup_enabled: bool,
    pub backup_frequency: String,
    pub backup_location: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            freelancer_name: "Freelancer".to_string(),
            business_name: "Creative Studio".to_string(),
            email: "freelancer@example.com".to_string(),
            phone: "".to_string(),
            address: "".to_string(),
            currency_code: "PHP".to_string(),
            currency_symbol: "₱".to_string(),
            date_format: "YYYY-MM-DD".to_string(),
            invoice_prefix: "INV".to_string(),
            default_deposit_pct: 50,
            default_payment_terms: "Due on receipt".to_string(),
            theme: "system".to_string(),
            auto_backup_enabled: false,
            backup_frequency: "weekly".to_string(),
            backup_location: None,
        }
    }
}

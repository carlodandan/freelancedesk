export interface AppSettings {
  freelancer_name: string;
  business_name: string;
  email: string;
  phone: string;
  address: string;
  currency_code: string;
  currency_symbol: string;
  date_format: string;
  invoice_prefix: string;
  default_deposit_pct: number;
  default_payment_terms: string;
  theme: string;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  backup_location?: string | null;
}

export interface AppInfo {
  version: string;
  app_data_dir: string;
  db_path: string;
  is_healthy: boolean;
}

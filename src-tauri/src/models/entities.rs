use serde::{Deserialize, Serialize};

// ==============================================================================
// Clients
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientItem {
    pub id: String,
    pub name: String,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub contact_handle: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub total_billed_cents: i64,
    pub total_paid_cents: i64,
    pub outstanding_cents: i64,
    pub active_projects_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateClientInput {
    pub name: String,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub contact_handle: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateClientInput {
    pub id: String,
    pub name: String,
    pub company_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub contact_handle: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
    pub status: String,
}

// ==============================================================================
// Projects
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectItem {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub price_cents: i64,
    pub total_paid_cents: i64,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectInput {
    pub client_id: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,
    pub price_cents: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectInput {
    pub id: String,
    pub client_id: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub status: String,
    pub price_cents: i64,
    pub notes: Option<String>,
}

// ==============================================================================
// Commissions
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommissionLineItem {
    pub id: String,
    pub description: String,
    pub quantity: i32,
    pub unit_price_cents: i64,
    pub total_price_cents: i64,
    pub is_percentage: bool,
    pub percentage_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommissionItem {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub commission_type: Option<String>,
    pub price_cents: i64,
    pub deposit_percentage: i32,
    pub deposit_amount_cents: i64,
    pub remaining_balance_cents: i64,
    pub total_paid_cents: i64,
    pub date_requested: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub completion_date: Option<String>,
    pub status: String,
    pub payment_status: String,
    pub notes: Option<String>,
    pub items: Vec<CommissionLineItem>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCommissionLineItemInput {
    pub description: String,
    pub quantity: i32,
    pub unit_price_cents: i64,
    pub is_percentage: Option<bool>,
    pub percentage_value: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCommissionInput {
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub commission_type: Option<String>,
    pub price_cents: i64,
    pub deposit_percentage: Option<i32>,
    pub date_requested: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CreateCommissionLineItemInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCommissionInput {
    pub id: String,
    pub client_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub commission_type: Option<String>,
    pub price_cents: i64,
    pub deposit_percentage: i32,
    pub date_requested: Option<String>,
    pub start_date: Option<String>,
    pub deadline: Option<String>,
    pub completion_date: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub items: Vec<CreateCommissionLineItemInput>,
}

// ==============================================================================
// Payments
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentItem {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub commission_id: Option<String>,
    pub commission_title: Option<String>,
    pub invoice_id: Option<String>,
    pub amount_cents: i64,
    pub payment_date: String,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub receipt_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePaymentInput {
    pub client_id: String,
    pub project_id: Option<String>,
    pub commission_id: Option<String>,
    pub invoice_id: Option<String>,
    pub amount_cents: i64,
    pub payment_date: String,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub receipt_number: Option<String>,
    pub notes: Option<String>,
}

// ==============================================================================
// Expenses
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseCategoryItem {
    pub id: String,
    pub name: String,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpenseItem {
    pub id: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub category_id: String,
    pub category_name: String,
    pub amount_cents: i64,
    pub date: String,
    pub description: String,
    pub payment_method: String,
    pub receipt_file_path: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateExpenseInput {
    pub project_id: Option<String>,
    pub category_id: String,
    pub amount_cents: i64,
    pub date: String,
    pub description: String,
    pub payment_method: String,
    pub receipt_file_path: Option<String>,
    pub notes: Option<String>,
}

// ==============================================================================
// Invoices
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceLineItem {
    pub id: String,
    pub commission_id: Option<String>,
    pub description: String,
    pub quantity: i32,
    pub unit_price_cents: i64,
    pub total_price_cents: i64,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceItem {
    pub id: String,
    pub client_id: String,
    pub client_name: String,
    pub client_email: Option<String>,
    pub client_address: Option<String>,
    pub invoice_number: String,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub subtotal_cents: i64,
    pub discount_cents: i64,
    pub tax_rate_bps: i32,
    pub tax_amount_cents: i64,
    pub total_cents: i64,
    pub total_paid_cents: i64,
    pub status: String,
    pub notes: Option<String>,
    pub payment_instructions: Option<String>,
    pub items: Vec<InvoiceLineItem>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceLineItemInput {
    pub commission_id: Option<String>,
    pub description: String,
    pub quantity: i32,
    pub unit_price_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateInvoiceInput {
    pub client_id: String,
    pub issue_date: String,
    pub due_date: Option<String>,
    pub discount_cents: Option<i64>,
    pub tax_rate_bps: Option<i32>,
    pub notes: Option<String>,
    pub payment_instructions: Option<String>,
    pub items: Vec<CreateInvoiceLineItemInput>,
}

// ==============================================================================
// Attachments
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttachmentItem {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub file_name: String,
    pub storage_path: String,
    pub file_size_bytes: i64,
    pub mime_type: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddAttachmentInput {
    pub entity_type: String,
    pub entity_id: String,
    pub file_name: String,
    pub file_base64: String,
    pub mime_type: Option<String>,
}

// ==============================================================================
// Reports
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonthlyFinancialPoint {
    pub month: String, // "2026-09"
    pub income_cents: i64,
    pub expense_cents: i64,
    pub profit_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryExpensePoint {
    pub category_name: String,
    pub total_cents: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientIncomePoint {
    pub client_name: String,
    pub total_cents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FinancialReportData {
    pub total_income_cents: i64,
    pub total_expenses_cents: i64,
    pub net_profit_cents: i64,
    pub monthly_breakdown: Vec<MonthlyFinancialPoint>,
    pub category_breakdown: Vec<CategoryExpensePoint>,
    pub client_breakdown: Vec<ClientIncomePoint>,
}

// ==============================================================================
// Global Search
// ==============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResultEntry {
    pub id: String,
    pub entity_type: String, // "client", "project", "commission", "payment", "invoice", "expense"
    pub title: String,
    pub subtitle: String,
    pub status: Option<String>,
    pub amount_cents: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalSearchResult {
    pub query: String,
    pub results: Vec<SearchResultEntry>,
}

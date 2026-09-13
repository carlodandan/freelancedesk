# Tauri IPC API Reference

This document provides a comprehensive reference for all 34 Tauri Inter-Process Communication (IPC) commands implemented in **FreelanceDesk**.

---

## 1. Overview & Protocol Convention

Commands are defined in Rust (`src-tauri/src/commands/`) using the `#[tauri::command]` attribute and registered in `src-tauri/src/lib.rs`. 

The frontend invokes commands asynchronously via `@tauri-apps/api/core`:

```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<ReturnType>("command_name", { argName: value });
```

### Parameter & Type Conventions
* **IPC Parameter Naming**: Tauri automatically serializes JS camelCase keys to Rust matching argument names (e.g. `{ clientId }` $\rightarrow$ `client_id: Option<String>`).
* **Monetary Units**: All amounts (`amount_cents`, `price_cents`, `total_cents`, `deposit_amount_cents`, `remaining_balance_cents`) are strictly 64-bit integer cents.
* **Percentages & Basis Points**:
  * `deposit_percentage`: Integer 0–100.
  * `tax_rate_bps`: Integer basis points where $1\% = 100\text{ bps}$ (e.g. $12\% = 1200\text{ bps}$).
* **Error Handling**: Command failures reject the JavaScript Promise with a `string` error description.

---

## 2. Settings & System Commands

### `get_settings`
Retrieves user preferences, profile details, currency configurations, and ledger styling.

* **TypeScript Wrapper**: `tauriService.getSettings(): Promise<AppSettings>`
* **Arguments**: None
* **Returns**: `AppSettings`

```json
{
  "business_name": "Creative Studio",
  "freelancer_name": "Carlo Dandan",
  "email": "carlo@example.com",
  "phone": "+63 917 123 4567",
  "address": "Manila, Philippines",
  "currency_code": "PHP",
  "currency_symbol": "₱",
  "date_format": "YYYY-MM-DD",
  "invoice_prefix": "INV-",
  "default_deposit_pct": 50,
  "default_payment_terms": "Payment due within 15 days.",
  "theme": "paper",
  "auto_backup_enabled": false,
  "backup_frequency": "weekly"
}
```

---

### `update_settings`
Updates application settings and persists them into the `settings` key-value table.

* **TypeScript Wrapper**: `tauriService.updateSettings(settings: AppSettings): Promise<AppSettings>`
* **Arguments**:
  * `settings`: `AppSettings` (Full updated settings object)
* **Returns**: `AppSettings`

---

### `get_app_info`
Returns native desktop application metadata and storage path locations.

* **TypeScript Wrapper**: `tauriService.getAppInfo(): Promise<AppInfo>`
* **Arguments**: None
* **Returns**: `AppInfo`

```json
{
  "name": "FreelanceDesk",
  "version": "0.0.1",
  "data_dir": "C:\\Users\\Administrator\\AppData\\Roaming\\com.carlodandan.freelancedesk",
  "database_path": "C:\\Users\\Administrator\\AppData\\Roaming\\com.carlodandan.freelancedesk\\database\\freelance.db"
}
```

---

## 3. Dashboard Commands

### `get_dashboard_summary`
Aggregates high-level metrics for the primary dashboard view.

* **TypeScript Wrapper**: `tauriService.getDashboardSummary(): Promise<DashboardSummary>`
* **Arguments**: None
* **Returns**: `DashboardSummary`

```json
{
  "total_revenue_cents": 1250000,
  "collected_revenue_cents": 850000,
  "pending_revenue_cents": 400000,
  "total_expenses_cents": 150000,
  "net_income_cents": 700000,
  "active_commissions_count": 4,
  "pending_invoices_count": 2,
  "recent_commissions": [ ... ],
  "recent_payments": [ ... ],
  "upcoming_deadlines": [ ... ]
}
```

---

## 4. Clients Commands

### `get_clients`
Fetches all client records ordered by creation date descending.

* **TypeScript Wrapper**: `tauriService.getClients(): Promise<ClientItem[]>`
* **Arguments**: None
* **Returns**: `ClientItem[]`

---

### `create_client`
Registers a new client ledger profile.

* **TypeScript Wrapper**: `tauriService.createClient(input: CreateClientInput): Promise<ClientItem>`
* **Arguments**:
  * `input.name` (`string`, required)
  * `input.company_name` (`string`, optional)
  * `input.email` (`string`, optional)
  * `input.phone` (`string`, optional)
  * `input.contact_handle` (`string`, optional)
  * `input.address` (`string`, optional)
  * `input.notes` (`string`, optional)
* **Returns**: `ClientItem`

---

### `update_client`
Updates an existing client profile.

* **TypeScript Wrapper**: `tauriService.updateClient(input: UpdateClientInput): Promise<boolean>`
* **Arguments**:
  * `input.id` (`string`, required)
  * `input.name` (`string`, required)
  * `input.company_name`, `email`, `phone`, `contact_handle`, `address`, `notes`, `status`
* **Returns**: `boolean` (`true` on success)

---

### `delete_client`
Deletes a client profile. If the client has related projects, commissions, or invoices, foreign key constraints prevent orphan records (`ON DELETE RESTRICT`).

* **TypeScript Wrapper**: `tauriService.deleteClient(id: string): Promise<boolean>`
* **Arguments**:
  * `id`: `string`
* **Returns**: `boolean`

---

## 5. Commissions & Job Orders Commands

### `get_commissions`
Fetches commission records with optional client or project filtering.

* **TypeScript Wrapper**: `tauriService.getCommissions(clientId?: string, projectId?: string): Promise<CommissionItem[]>`
* **Arguments**:
  * `clientId` (`string`, optional)
  * `projectId` (`string`, optional)
* **Returns**: `CommissionItem[]`

---

### `create_commission`
Creates a commission record along with its associated line items in an atomic SQLite transaction.

* **TypeScript Wrapper**: `tauriService.createCommission(input: CreateCommissionInput): Promise<CommissionItem>`
* **Arguments**:
  * `input.client_id` (`string`, required)
  * `input.project_id` (`string`, optional)
  * `input.title` (`string`, required)
  * `input.description` (`string`, optional)
  * `input.commission_type` (`string`, optional)
  * `input.price_cents` (`number`, required)
  * `input.deposit_percentage` (`number`, required)
  * `input.deposit_amount_cents` (`number`, required)
  * `input.remaining_balance_cents` (`number`, required)
  * `input.date_requested`, `start_date`, `deadline`, `notes`
  * `input.items` (`CommissionItemInput[]`, optional)
* **Returns**: `CommissionItem`

---

### `update_commission_status`
Transitions a commission through its workflow stages.

* **TypeScript Wrapper**: `tauriService.updateCommissionStatus(id: string, status: string): Promise<boolean>`
* **Arguments**:
  * `id`: `string`
  * `status`: `string` (`"inquiry"`, `"quoted"`, `"confirmed"`, `"in_progress"`, `"for_review"`, `"revision"`, `"completed"`, `"cancelled"`)
* **Returns**: `boolean`

---

### `delete_commission`
Deletes a commission and cascades deletion to line items (`commission_items`).

* **TypeScript Wrapper**: `tauriService.deleteCommission(id: string): Promise<boolean>`
* **Arguments**:
  * `id`: `string`
* **Returns**: `boolean`

---

## 6. Projects Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `get_projects` | `clientId?: string` | `ProjectItem[]` | Lists projects with client name join |
| `create_project` | `input: CreateProjectInput` | `ProjectItem` | Creates a parent project container |
| `update_project` | `input: UpdateProjectInput` | `boolean` | Updates project details & deadline |
| `delete_project` | `id: string` | `boolean` | Removes project record |

---

## 7. Invoices Commands

### `get_invoices`
Fetches all invoices with line items and computed payment totals.

* **TypeScript Wrapper**: `tauriService.getInvoices(clientId?: string): Promise<InvoiceItem[]>`
* **Returns**: `InvoiceItem[]`

---

### `create_invoice`
Creates an invoice record with unique numbering, tax basis points, discounts, and line items.

* **TypeScript Wrapper**: `tauriService.createInvoice(input: CreateInvoiceInput): Promise<InvoiceItem>`
* **Arguments**:
  * `input.client_id` (`string`, required)
  * `input.invoice_number` (`string`, required, unique)
  * `input.issue_date` (`string`, required)
  * `input.due_date` (`string`, optional)
  * `input.subtotal_cents` (`number`, required)
  * `input.discount_cents` (`number`, required)
  * `input.tax_rate_bps` (`number`, required)
  * `input.tax_amount_cents` (`number`, required)
  * `input.total_cents` (`number`, required)
  * `input.payment_instructions` (`string`, optional)
  * `input.notes` (`string`, optional)
  * `input.items` (`InvoiceItemInput[]`, required)
* **Returns**: `InvoiceItem`

---

### `update_invoice_status`
Updates status (`"draft"`, `"sent"`, `"paid"`, `"overdue"`, `"cancelled"`).

* **TypeScript Wrapper**: `tauriService.updateInvoiceStatus(id: string, status: string): Promise<boolean>`
* **Returns**: `boolean`

---

### `delete_invoice`
Deletes an invoice and cascades to `invoice_items`.

* **TypeScript Wrapper**: `tauriService.deleteInvoice(id: string): Promise<boolean>`
* **Returns**: `boolean`

---

## 8. Payments Commands

### `get_payments`
Fetches payment transactions with client and commission titles.

* **TypeScript Wrapper**: `tauriService.getPayments(clientId?: string, commissionId?: string): Promise<PaymentItem[]>`
* **Returns**: `PaymentItem[]`

---

### `create_payment`
Records a payment disbursement. Automatically creates receipt numbering (`RCP-YYYY-XXX`) and logs activity.

* **TypeScript Wrapper**: `tauriService.createPayment(input: CreatePaymentInput): Promise<PaymentItem>`
* **Arguments**:
  * `input.client_id` (`string`, required)
  * `input.project_id` (`string`, optional)
  * `input.commission_id` (`string`, optional)
  * `input.invoice_id` (`string`, optional)
  * `input.amount_cents` (`number`, required)
  * `input.payment_date` (`string`, required)
  * `input.payment_method` (`string`, required)
  * `input.reference_number` (`string`, optional)
  * `input.receipt_number` (`string`, optional)
  * `input.notes` (`string`, optional)
* **Returns**: `PaymentItem`

---

### `delete_payment`
Deletes a payment record.

* **TypeScript Wrapper**: `tauriService.deletePayment(id: string): Promise<boolean>`
* **Returns**: `boolean`

---

## 9. Expenses Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `get_expenses` | `categoryId?: string, projectId?: string` | `ExpenseItem[]` | Lists business expenses |
| `create_expense` | `input: CreateExpenseInput` | `ExpenseItem` | Records a new expense item |
| `delete_expense` | `id: string` | `boolean` | Deletes an expense |
| `get_expense_categories`| None | `ExpenseCategoryItem[]` | Lists system & custom categories |
| `create_expense_category`| `name: string` | `ExpenseCategoryItem` | Creates a new user category |

---

## 10. Financial Reports Command

### `get_financial_reports`
Generates comprehensive financial aggregation over specified date ranges (`"all"`, `"year"`, `"month"`).

* **TypeScript Wrapper**: `tauriService.getFinancialReports(dateRange?: string): Promise<FinancialReportData>`
* **Returns**: `FinancialReportData`
  * `summary`: Gross revenue, collected revenue, expenses, net profit.
  * `monthly_breakdown`: Array of monthly financial aggregates.
  * `expense_by_category`: Categorical breakdown of business spending.

---

## 11. Global Search Command

### `global_search`
Performs unified querying across clients, commissions, invoices, and payments.

* **TypeScript Wrapper**: `tauriService.globalSearch(query: string): Promise<GlobalSearchResult>`
* **Arguments**:
  * `query`: `string`
* **Returns**: `GlobalSearchResult`
  * `clients`: Matching client records.
  * `commissions`: Matching commission titles and descriptions.
  * `invoices`: Matching invoice numbers and client names.
  * `payments`: Matching receipt numbers and reference codes.

---

## 12. Attachments & Files Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `get_attachments` | `entityType: string, entityId: string` | `AttachmentItem[]` | Fetches attachments for an entity |
| `add_attachment` | `input: AddAttachmentInput` | `AttachmentItem` | Copies file to sandbox & saves metadata |
| `delete_attachment` | `id: string` | `boolean` | Removes sandbox file and DB metadata |

---

## 13. Backup & Recovery Commands

### `create_backup`
Checkpoints SQLite's WAL journal to disk and clones the database file to `backups/FreelanceDesk_Backup_{TIMESTAMP}.db`.

* **TypeScript Wrapper**: `tauriService.createBackup(): Promise<string>`
* **Arguments**: None
* **Returns**: `string` (Absolute path of the created backup file)

---

### `restore_backup`
Restores the database from a backup file with pre-flight integrity verification and safety backup generation.

* **TypeScript Wrapper**: `tauriService.restoreBackup(backupFilePath: string): Promise<string>`
* **Arguments**:
  * `backupFilePath`: `string` (Absolute path to backup `.db` file)
* **Returns**: `string` (Confirmation message including safety backup location)
* **Error Cases**:
  * File does not exist.
  * `PRAGMA integrity_check` fails on the target file.
  * File I/O failure.

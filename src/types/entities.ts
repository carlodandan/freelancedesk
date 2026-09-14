export interface ClientItem {
  id: string;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_handle?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  total_billed_cents: number;
  total_paid_cents: number;
  outstanding_cents: number;
  active_projects_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_handle?: string | null;
  address?: string | null;
  notes?: string | null;
  status?: string | null;
}

export interface UpdateClientInput {
  id: string;
  name: string;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_handle?: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
}

export interface ProjectItem {
  id: string;
  client_id: string;
  client_name: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  status: string;
  price_cents: number;
  total_paid_cents: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectInput {
  client_id: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  status?: string | null;
  price_cents: number;
  notes?: string | null;
}

export interface UpdateProjectInput {
  id: string;
  client_id: string;
  name: string;
  description?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  status: string;
  price_cents: number;
  notes?: string | null;
}

export interface CommissionLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  is_percentage: boolean;
  percentage_value?: number | null;
}

export interface CommissionItem {
  id: string;
  client_id: string;
  client_name: string;
  project_id?: string | null;
  project_name?: string | null;
  title: string;
  description?: string | null;
  commission_type?: string | null;
  price_cents: number;
  deposit_percentage: number;
  deposit_amount_cents: number;
  remaining_balance_cents: number;
  total_paid_cents: number;
  date_requested?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  completion_date?: string | null;
  status: string;
  payment_status: string;
  notes?: string | null;
  items: CommissionLineItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateCommissionLineItemInput {
  description: string;
  quantity: number;
  unit_price_cents: number;
  is_percentage?: boolean;
  percentage_value?: number | null;
}

export interface CreateCommissionInput {
  client_id: string;
  project_id?: string | null;
  title: string;
  description?: string | null;
  commission_type?: string | null;
  price_cents: number;
  deposit_percentage?: number;
  date_requested?: string | null;
  start_date?: string | null;
  deadline?: string | null;
  status?: string | null;
  notes?: string | null;
  items: CreateCommissionLineItemInput[];
}

export interface PaymentItem {
  id: string;
  client_id: string;
  client_name: string;
  project_id?: string | null;
  project_name?: string | null;
  commission_id?: string | null;
  commission_title?: string | null;
  invoice_id?: string | null;
  amount_cents: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreatePaymentInput {
  client_id: string;
  project_id?: string | null;
  commission_id?: string | null;
  invoice_id?: string | null;
  amount_cents: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  receipt_number?: string | null;
  notes?: string | null;
}

export interface ExpenseCategoryItem {
  id: string;
  name: string;
  is_system: boolean;
}

export interface ExpenseItem {
  id: string;
  project_id?: string | null;
  project_name?: string | null;
  category_id: string;
  category_name: string;
  amount_cents: number;
  date: string;
  description: string;
  payment_method: string;
  receipt_file_path?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CreateExpenseInput {
  project_id?: string | null;
  category_id: string;
  amount_cents: number;
  date: string;
  description: string;
  payment_method: string;
  receipt_file_path?: string | null;
  notes?: string | null;
}

export interface InvoiceLineItem {
  id: string;
  commission_id?: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  sort_order: number;
}

export interface InvoiceItem {
  id: string;
  client_id: string;
  client_name: string;
  client_email?: string | null;
  client_address?: string | null;
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_rate_bps: number;
  tax_amount_cents: number;
  total_cents: number;
  total_paid_cents: number;
  status: string;
  notes?: string | null;
  payment_instructions?: string | null;
  items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceLineItemInput {
  commission_id?: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

export interface CreateInvoiceInput {
  client_id: string;
  issue_date: string;
  due_date?: string | null;
  discount_cents?: number;
  tax_rate_bps?: number;
  notes?: string | null;
  payment_instructions?: string | null;
  items: CreateInvoiceLineItemInput[];
}

export interface AttachmentItem {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  storage_path: string;
  file_size_bytes: number;
  mime_type?: string | null;
  created_at: string;
}

export interface AddAttachmentInput {
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_base64: string;
  mime_type?: string | null;
}

export interface MonthlyFinancialPoint {
  month: string;
  income_cents: number;
  expense_cents: number;
  profit_cents: number;
}

export interface CategoryExpensePoint {
  category_name: string;
  total_cents: number;
  percentage: number;
}

export interface ClientIncomePoint {
  client_name: string;
  total_cents: number;
}

export interface FinancialReportData {
  total_income_cents: number;
  total_expenses_cents: number;
  net_profit_cents: number;
  monthly_breakdown: MonthlyFinancialPoint[];
  category_breakdown: CategoryExpensePoint[];
  client_breakdown: ClientIncomePoint[];
}

export interface SearchResultEntry {
  id: string;
  entity_type: string;
  title: string;
  subtitle: string;
  status?: string | null;
  amount_cents?: number | null;
}

export interface GlobalSearchResult {
  query: string;
  results: SearchResultEntry[];
}

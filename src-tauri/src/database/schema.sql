-- ==============================================================================
-- FreelanceDesk Initial Database Schema (Migration 001)
-- ==============================================================================

-- Schema Migrations Tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Settings Key-Value Store
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    contact_handle TEXT,
    address TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'archived'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    start_date TEXT,
    deadline TEXT,
    status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'in_progress', 'waiting', 'completed', 'cancelled', 'archived'
    price_cents INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    commission_type TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    deposit_percentage INTEGER NOT NULL DEFAULT 50,
    deposit_amount_cents INTEGER NOT NULL DEFAULT 0,
    remaining_balance_cents INTEGER NOT NULL DEFAULT 0,
    date_requested TEXT,
    start_date TEXT,
    deadline TEXT,
    completion_date TEXT,
    status TEXT NOT NULL DEFAULT 'inquiry', -- 'inquiry', 'quoted', 'confirmed', 'in_progress', 'for_review', 'revision', 'completed', 'cancelled'
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'deposit_paid', 'partially_paid', 'paid', 'refunded'
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Commission Line Items
CREATE TABLE IF NOT EXISTS commission_items (
    id TEXT PRIMARY KEY,
    commission_id TEXT NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    total_price_cents INTEGER NOT NULL DEFAULT 0,
    is_percentage INTEGER NOT NULL DEFAULT 0,
    percentage_value REAL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date TEXT NOT NULL,
    due_date TEXT,
    subtotal_cents INTEGER NOT NULL DEFAULT 0,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    tax_rate_bps INTEGER NOT NULL DEFAULT 0, -- Basis points (1200 = 12.00%)
    tax_amount_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    notes TEXT,
    payment_instructions TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    commission_id TEXT REFERENCES commissions(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price_cents INTEGER NOT NULL DEFAULT 0,
    total_price_cents INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    commission_id TEXT REFERENCES commissions(id) ON DELETE SET NULL,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    payment_date TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    reference_number TEXT,
    receipt_number TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Expense Categories
CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE RESTRICT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    receipt_file_path TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Reusable Pricing Items
CREATE TABLE IF NOT EXISTS pricing_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    base_price_cents INTEGER NOT NULL DEFAULT 0,
    is_percentage INTEGER NOT NULL DEFAULT 0,
    percentage_value REAL,
    category TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Files & Attachments Metadata
CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'client', 'project', 'commission', 'expense', 'invoice'
    entity_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'payment_received', 'status_changed'
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_commissions_client ON commissions(client_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

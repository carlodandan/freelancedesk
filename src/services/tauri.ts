import { invoke } from "@tauri-apps/api/core";
import { AppSettings, AppInfo } from "../types/settings";
import { DashboardSummary } from "../types/dashboard";
import {
  ClientItem,
  CreateClientInput,
  UpdateClientInput,
  ProjectItem,
  CreateProjectInput,
  UpdateProjectInput,
  CommissionItem,
  CreateCommissionInput,
  PaymentItem,
  CreatePaymentInput,
  ExpenseItem,
  CreateExpenseInput,
  ExpenseCategoryItem,
  InvoiceItem,
  CreateInvoiceInput,
  FinancialReportData,
  GlobalSearchResult,
  AttachmentItem,
  AddAttachmentInput,
} from "../types/entities";

export const tauriService = {
  // Settings & App Info
  async getSettings(): Promise<AppSettings> {
    return await invoke<AppSettings>("get_settings");
  },

  async updateSettings(settings: AppSettings): Promise<AppSettings> {
    return await invoke<AppSettings>("update_settings", { settings });
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    return await invoke<DashboardSummary>("get_dashboard_summary");
  },

  async getAppInfo(): Promise<AppInfo> {
    return await invoke<AppInfo>("get_app_info");
  },

  // Clients
  async getClients(): Promise<ClientItem[]> {
    return await invoke<ClientItem[]>("get_clients");
  },

  async createClient(input: CreateClientInput): Promise<ClientItem> {
    return await invoke<ClientItem>("create_client", { input });
  },

  async updateClient(input: UpdateClientInput): Promise<boolean> {
    return await invoke<boolean>("update_client", { input });
  },

  async deleteClient(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_client", { id });
  },

  // Projects
  async getProjects(clientId?: string): Promise<ProjectItem[]> {
    return await invoke<ProjectItem[]>("get_projects", { clientId });
  },

  async createProject(input: CreateProjectInput): Promise<ProjectItem> {
    return await invoke<ProjectItem>("create_project", { input });
  },

  async updateProject(input: UpdateProjectInput): Promise<boolean> {
    return await invoke<boolean>("update_project", { input });
  },

  async deleteProject(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_project", { id });
  },

  // Commissions
  async getCommissions(
    clientId?: string,
    projectId?: string,
  ): Promise<CommissionItem[]> {
    return await invoke<CommissionItem[]>("get_commissions", {
      clientId,
      projectId,
    });
  },

  async createCommission(
    input: CreateCommissionInput,
  ): Promise<CommissionItem> {
    return await invoke<CommissionItem>("create_commission", { input });
  },

  async updateCommissionStatus(id: string, status: string): Promise<boolean> {
    return await invoke<boolean>("update_commission_status", { id, status });
  },

  async deleteCommission(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_commission", { id });
  },

  // Payments
  async getPayments(
    clientId?: string,
    commissionId?: string,
  ): Promise<PaymentItem[]> {
    return await invoke<PaymentItem[]>("get_payments", {
      clientId,
      commissionId,
    });
  },

  async createPayment(input: CreatePaymentInput): Promise<PaymentItem> {
    return await invoke<PaymentItem>("create_payment", { input });
  },

  async deletePayment(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_payment", { id });
  },

  // Expenses
  async getExpenses(
    categoryId?: string,
    projectId?: string,
  ): Promise<ExpenseItem[]> {
    return await invoke<ExpenseItem[]>("get_expenses", {
      categoryId,
      projectId,
    });
  },

  async createExpense(input: CreateExpenseInput): Promise<ExpenseItem> {
    return await invoke<ExpenseItem>("create_expense", { input });
  },

  async deleteExpense(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_expense", { id });
  },

  async getExpenseCategories(): Promise<ExpenseCategoryItem[]> {
    return await invoke<ExpenseCategoryItem[]>("get_expense_categories");
  },

  async createExpenseCategory(name: string): Promise<ExpenseCategoryItem> {
    return await invoke<ExpenseCategoryItem>("create_expense_category", {
      name,
    });
  },

  // Invoices
  async getInvoices(clientId?: string): Promise<InvoiceItem[]> {
    return await invoke<InvoiceItem[]>("get_invoices", { clientId });
  },

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceItem> {
    return await invoke<InvoiceItem>("create_invoice", { input });
  },

  async updateInvoiceStatus(id: string, status: string): Promise<boolean> {
    return await invoke<boolean>("update_invoice_status", { id, status });
  },

  async deleteInvoice(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_invoice", { id });
  },

  // Reports
  async getFinancialReports(dateRange?: string): Promise<FinancialReportData> {
    return await invoke<FinancialReportData>("get_financial_reports", {
      dateRange,
    });
  },

  // Global Search
  async globalSearch(query: string): Promise<GlobalSearchResult> {
    return await invoke<GlobalSearchResult>("global_search", { query });
  },

  // Attachments
  async getAttachments(
    entityType: string,
    entityId: string,
  ): Promise<AttachmentItem[]> {
    return await invoke<AttachmentItem[]>("get_attachments", {
      entityType,
      entityId,
    });
  },

  async addAttachment(input: AddAttachmentInput): Promise<AttachmentItem> {
    return await invoke<AttachmentItem>("add_attachment", { input });
  },

  async deleteAttachment(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_attachment", { id });
  },

  // Backup & Restore
  async createBackup(passphrase?: string): Promise<string> {
    return await invoke<string>("create_backup", { passphrase });
  },

  async restoreBackup(
    backupFilePath: string,
    passphrase?: string,
  ): Promise<string> {
    return await invoke<string>("restore_backup", {
      backupFilePath,
      passphrase,
    });
  },
};

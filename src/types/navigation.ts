export type NavigationTab =
  | "dashboard"
  | "clients"
  | "projects"
  | "commissions"
  | "payments"
  | "expenses"
  | "invoices"
  | "reports"
  | "calendar"
  | "files"
  | "settings";

export interface NavItem {
  id: NavigationTab;
  label: string;
  iconName: string;
  badge?: number | string;
}

export interface NavSection {
  sectionTitle: string;
  items: NavItem[];
}

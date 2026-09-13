import { invoke } from "@tauri-apps/api/core";
import { AppSettings, AppInfo } from "../types/settings";
import { DashboardSummary } from "../types/dashboard";

export const tauriService = {
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
};

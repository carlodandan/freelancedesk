import { useState, useEffect } from "react";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardView } from "./features/dashboard/DashboardView";
import { SettingsView } from "./features/settings/SettingsView";
import { PlaceholderView } from "./components/ui/PlaceholderView";
import { NavigationTab } from "./types/navigation";
import { AppSettings, AppInfo } from "./types/settings";
import { DashboardSummary } from "./types/dashboard";
import { tauriService } from "./services/tauri";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./components/ui/Button";

export function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>("dashboard");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedSettings, fetchedInfo, fetchedSummary] = await Promise.all([
        tauriService.getSettings(),
        tauriService.getAppInfo(),
        tauriService.getDashboardSummary(),
      ]);
      setSettings(fetchedSettings);
      setAppInfo(fetchedInfo);
      setDashboardSummary(fetchedSummary);
    } catch (err: unknown) {
      console.error("Initialization error:", err);
      setError(
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : "Failed to connect to local SQLite database or Tauri backend."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSaveSettings = async (updated: AppSettings) => {
    const res = await tauriService.updateSettings(updated);
    setSettings(res);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] text-[#1C1917] select-none">
        <div className="w-10 h-10 rounded-lg bg-[#854D0E] flex items-center justify-center text-white font-serif font-bold text-lg mb-4 shadow-xs">
          F
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-[#57534E]">
          <Loader2 size={16} className="animate-spin text-[#854D0E]" />
          <span>Opening local ledger database...</span>
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF8F5] text-[#1C1917] p-6 select-none">
        <div className="p-3 mb-4 rounded-full bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-base font-semibold text-[#1C1917]">
          Unable to Initialize FreelanceDesk
        </h2>
        <p className="mt-1.5 text-xs text-[#78716C] max-w-md text-center leading-relaxed">
          {error || "Could not retrieve application configuration from SQLite."}
        </p>
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={loadInitialData}>
            Retry Initialization
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      freelancerName={settings.freelancer_name}
      businessName={settings.business_name}
      pendingCommissionsCount={dashboardSummary?.pending_commissions_count || 0}
      activeProjectsCount={dashboardSummary?.active_projects_count || 0}
      onQuickAction={() => setActiveTab("commissions")}
    >
      {activeTab === "dashboard" && (
        <DashboardView
          summary={dashboardSummary}
          currencySymbol={settings.currency_symbol || "₱"}
          onNavigate={setActiveTab}
        />
      )}

      {activeTab === "settings" && (
        <SettingsView
          settings={settings}
          appInfo={appInfo}
          onSave={handleSaveSettings}
        />
      )}

      {activeTab !== "dashboard" && activeTab !== "settings" && (
        <PlaceholderView tab={activeTab} onNavigate={setActiveTab} />
      )}
    </MainLayout>
  );
}

export default App;

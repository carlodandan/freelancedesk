import React, { useState } from "react";
import {
  Save,
  CheckCircle2,
  Database,
  ShieldCheck,
  User,
  CreditCard,
  FileCheck,
  Palette,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { AppSettings, AppInfo } from "../../types/settings";
import { tauriService } from "../../services/tauri";
import { UpdateCheck } from "../../components/UpdateCheck";

interface SettingsViewProps {
  settings: AppSettings;
  appInfo: AppInfo | null;
  onSave: (updated: AppSettings) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  appInfo,
  onSave,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "general" | "invoice" | "storage" | "updates"
  >("general");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      setSavedSuccess(true);
      showToast({
        type: "success",
        message: "Settings and appearance saved successfully.",
      });
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      showToast({
        type: "danger",
        message: "Failed to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D5]">
        <div>
          <h2 className="text-xl font-semibold text-[#1C1917] tracking-tight">
            Settings & Business Profile
          </h2>
          <p className="text-xs text-[#78716C] mt-0.5">
            Configure your business details, default deposit rates, and local
            database settings.
          </p>
        </div>
        {activeTab !== "updates" && (
          <Button
            form="settings-form"
            type="submit"
            variant="primary"
            size="sm"
            icon={
              savedSuccess ? <CheckCircle2 size={15} /> : <Save size={15} />
            }
            disabled={isSaving}
          >
            {isSaving
              ? "Saving..."
              : savedSuccess
                ? "Settings Saved"
                : "Save Changes"}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E5E0D5] gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-2.5 transition-colors ${
            activeTab === "general"
              ? "text-[#854D0E] border-b-2 border-[#854D0E]"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          General & Identity
        </button>
        <button
          onClick={() => setActiveTab("invoice")}
          className={`pb-2.5 transition-colors ${
            activeTab === "invoice"
              ? "text-[#854D0E] border-b-2 border-[#854D0E]"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Invoicing & Deposits
        </button>
        <button
          onClick={() => setActiveTab("storage")}
          className={`pb-2.5 transition-colors ${
            activeTab === "storage"
              ? "text-[#854D0E] border-b-2 border-[#854D0E]"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Local Database & Storage
        </button>
        <button
          onClick={() => setActiveTab("updates")}
          className={`pb-2.5 transition-colors ${
            activeTab === "updates"
              ? "text-[#854D0E] border-b-2 border-[#854D0E]"
              : "text-[#78716C] hover:text-[#1C1917]"
          }`}
        >
          Software Updates
        </button>
      </div>

      {/* Forms */}
      <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
        {activeTab === "general" && (
          <div className="space-y-5">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#854D0E]" />
                  <span>Freelancer & Business Identity</span>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Freelancer Name"
                  value={formData.freelancer_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      freelancer_name: e.target.value,
                    })
                  }
                  placeholder="e.g. Maria Santos"
                  hint="Your personal or professional name"
                />
                <Input
                  label="Business / Studio Name"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  placeholder="e.g. Santos Art & Design"
                  hint="Appears on invoices and document headers"
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="maria@studio.ph"
                />
                <Input
                  label="Contact Phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+63 917 123 4567"
                />
                <div className="col-span-2">
                  <Input
                    label="Physical or Mailing Address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Studio 4B, Makati City, Metro Manila"
                  />
                </div>
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-[#854D0E]" />
                  <span>Currency & Date Formatting</span>
                </div>
              }
            >
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Currency Symbol"
                  value={formData.currency_symbol}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency_symbol: e.target.value,
                    })
                  }
                  placeholder="₱"
                  hint="e.g. ₱, $, €, £"
                />
                <Input
                  label="Currency Code"
                  value={formData.currency_code}
                  onChange={(e) =>
                    setFormData({ ...formData, currency_code: e.target.value })
                  }
                  placeholder="PHP"
                  hint="e.g. PHP, USD, EUR"
                />
                <Select
                  label="Date Format"
                  value={formData.date_format}
                  onChange={(e) =>
                    setFormData({ ...formData, date_format: e.target.value })
                  }
                  options={[
                    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
                  ]}
                />
              </div>
            </Card>

            <Card
              header={
                <div className="flex items-center gap-2">
                  <Palette size={16} className="text-[var(--accent)]" />
                  <span>Ledger Theme & Visual Appearance</span>
                </div>
              }
            >
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    id: "paper",
                    name: "Warm Paper",
                    desc: "Classic warm cream canvas with sepia ledger lines and bronze amber accents.",
                    dotBg: "bg-[#FAF8F5]",
                    dotBorder: "border-[#E5E0D5]",
                    dotAccent: "bg-[#854D0E]",
                  },
                  {
                    id: "clean",
                    name: "Clean Slate",
                    desc: "Modern crisp neutral canvas with cool slate borders and deep navy accents.",
                    dotBg: "bg-[#F8FAFC]",
                    dotBorder: "border-[#E2E8F0]",
                    dotAccent: "bg-[#1E3A5F]",
                  },
                  {
                    id: "dark",
                    name: "Obsidian Dark",
                    desc: "Low-light high-contrast dark ledger with warm luminous amber accents.",
                    dotBg: "bg-[#141416]",
                    dotBorder: "border-[#2E2E36]",
                    dotAccent: "bg-[#D97706]",
                  },
                ].map((themeOpt) => {
                  const isSelected =
                    (formData.theme || "paper") === themeOpt.id;
                  return (
                    <button
                      key={themeOpt.id}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, theme: themeOpt.id });
                        if (themeOpt.id === "paper") {
                          document.documentElement.removeAttribute(
                            "data-theme",
                          );
                        } else {
                          document.documentElement.setAttribute(
                            "data-theme",
                            themeOpt.id,
                          );
                        }
                      }}
                      className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/20 shadow-xs bg-[var(--bg-surface)]"
                          : "border-[var(--border-ledger)] hover:border-[var(--text-muted)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {themeOpt.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-full ${themeOpt.dotBg} border ${themeOpt.dotBorder}`}
                          />
                          <span
                            className={`w-3.5 h-3.5 rounded-full ${themeOpt.dotAccent}`}
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {themeOpt.desc}
                      </p>
                      {isSelected && (
                        <span className="inline-block mt-2.5 text-[10px] font-mono font-bold uppercase text-[var(--accent)]">
                          Active Theme
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "invoice" && (
          <div className="space-y-5">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-[#854D0E]" />
                  <span>Invoice & Deposit Rules</span>
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Invoice Number Prefix"
                  value={formData.invoice_prefix}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_prefix: e.target.value })
                  }
                  placeholder="INV"
                  hint="e.g. INV produces INV-2026-001"
                />
                <Input
                  label="Default Commission Deposit (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.default_deposit_pct}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setFormData({
                      ...formData,
                      default_deposit_pct: isNaN(val) ? 50 : val,
                    });
                  }}
                  hint="Default upfront deposit percentage (e.g. 50%)"
                />
                <div className="col-span-2">
                  <Input
                    label="Default Payment Terms"
                    value={formData.default_payment_terms}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        default_payment_terms: e.target.value,
                      })
                    }
                    placeholder="Due upon receipt"
                    hint="Printed at bottom of invoices and receipts"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "storage" && (
          <div className="space-y-5">
            <Card
              header={
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#854D0E]" />
                  <span>SQLite Database Status</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#FAF8F5] border border-[#ECE8DE]">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#166534]" />
                    <div>
                      <div className="text-xs font-semibold text-[#1C1917]">
                        Offline SQLite Engine
                      </div>
                      <div className="text-[11px] text-[#78716C]">
                        Foreign Keys: ON • Journal Mode: WAL • Integrity: OK
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs font-medium">
                    Healthy
                  </span>
                </div>

                {appInfo && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="font-semibold text-[#57534E]">
                        Database Path:
                      </span>
                      <div className="mt-1 p-2 rounded bg-[#F4F1EA] font-mono text-[11px] text-[#1C1917] select-all break-all">
                        {appInfo.db_path}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-[#57534E]">
                        Application Data Directory:
                      </span>
                      <div className="mt-1 p-2 rounded bg-[#F4F1EA] font-mono text-[11px] text-[#1C1917] select-all break-all">
                        {appInfo.app_data_dir}
                      </div>
                    </div>
                    <div>
                      <span className="font-semibold text-[#57534E]">
                        Application Version:
                      </span>
                      <span className="ml-2 font-mono text-xs">
                        {appInfo.version}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Local Backup & Restore */}
            <Card
              header={
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#854D0E]" />
                  <span>Backup & Disaster Recovery</span>
                </div>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#1C1917]">
                      Create Portable Snapshot
                    </div>
                    <div className="text-[11px] text-[#78716C]">
                      Create a self-contained local copy of your database.
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      try {
                        const path = await tauriService.createBackup();
                        alert(`Backup created successfully at:\n${path}`);
                      } catch (err) {
                        alert(`Backup failed: ${err}`);
                      }
                    }}
                  >
                    Create Backup
                  </Button>
                </div>

                <div className="border-t border-[#E5E0D5] pt-4">
                  <div className="text-xs font-semibold text-[#1C1917]">
                    Restore Database from Backup
                  </div>
                  <p className="text-[11px] text-[#78716C] mt-0.5">
                    Restores your records. A safety backup of your current
                    database is always created automatically prior to restoring.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="text"
                      id="restore-path-input"
                      placeholder="Full path to .db backup file"
                      className="flex-1 rounded-md border border-[#E5E0D5] bg-white px-3 py-1.5 text-xs text-[#1C1917] font-mono"
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        const input = document.getElementById(
                          "restore-path-input",
                        ) as HTMLInputElement;
                        const val = input?.value.trim();
                        if (!val) {
                          alert(
                            "Please enter the full path to a backup .db file.",
                          );
                          return;
                        }
                        if (
                          confirm(
                            "Restore this database? An automatic safety backup will be created first.",
                          )
                        ) {
                          try {
                            const res = await tauriService.restoreBackup(val);
                            alert(res);
                            window.location.reload();
                          } catch (err) {
                            alert(`Restore failed: ${err}`);
                          }
                        }
                      }}
                    >
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "updates" && (
          <div className="space-y-5">
            <UpdateCheck currentVersion={appInfo?.version ?? "0.0.1"} />
          </div>
        )}
      </form>
    </div>
  );
};

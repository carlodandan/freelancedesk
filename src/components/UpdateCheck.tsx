import React, { useState } from "react";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpCircle,
} from "lucide-react";
import { useUpdater } from "../hooks/useUpdater";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { ConfirmDialog } from "./ui/ConfirmDialog";

interface UpdateCheckProps {
  currentVersion?: string;
}

export const UpdateCheck: React.FC<UpdateCheckProps> = ({
  currentVersion = "0.0.1",
}) => {
  const { state, check, install } = useUpdater();
  const [confirming, setConfirming] = useState(false);

  const busy = state.stage === "checking" || state.stage === "downloading";
  const percentLabel =
    state.percent === null ? null : `${Math.round(state.percent * 100)}%`;

  return (
    <Card
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-[#854D0E]" />
            <span>Software Updates & Releases</span>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-app)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
            v{currentVersion}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Display */}
        <div className="p-4 rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)]">
          {state.stage === "checking" && (
            <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
              <RefreshCw size={16} className="animate-spin text-[#854D0E]" />
              <span>Checking for updates from GitHub Releases...</span>
            </div>
          )}

          {state.stage === "current" && (
            <div className="flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold">FreelanceDesk is up to date.</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  You are running version v{currentVersion}. No updates
                  available.
                </p>
              </div>
            </div>
          )}

          {state.stage === "available" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#854D0E]">
                <Sparkles size={16} />
                <span>Version v{state.version} is now available!</span>
              </div>
              {state.notes && (
                <div className="max-h-48 overflow-y-auto p-3 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono whitespace-pre-wrap">
                  {state.notes}
                </div>
              )}
            </div>
          )}

          {state.stage === "downloading" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Download
                    size={14}
                    className="animate-bounce text-[#854D0E]"
                  />
                  Downloading update v{state.version}...
                </span>
                <span className="font-mono text-[var(--text-muted)]">
                  {percentLabel ?? "Preparing..."}
                </span>
              </div>
              <div className="w-full bg-[var(--border-subtle)] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#854D0E] h-2 rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${Math.round((state.percent ?? 0) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] italic">
                The application will restart automatically once the installation
                is prepared.
              </p>
            </div>
          )}

          {state.stage === "failed" && (
            <div className="flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Could not check for updates.</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {state.error}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {state.stage === "available" && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              Install & Restart
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            icon={
              <RefreshCw
                size={14}
                className={state.stage === "checking" ? "animate-spin" : ""}
              />
            }
            onClick={() => void check(true)}
            disabled={busy}
          >
            {state.stage === "available" ? "Check Again" : "Check for Updates"}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirming}
        title={`Install FreelanceDesk v${state.version}`}
        message="The application will close and install the update. Any unsaved form data should be saved before proceeding. Do you wish to continue?"
        confirmLabel="Download & Install"
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={() => {
          setConfirming(false);
          void install();
        }}
        onCancel={() => setConfirming(false)}
      />
    </Card>
  );
};

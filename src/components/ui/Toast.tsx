import React, { useState, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export interface ToastItem {
  id: string;
  type?: "success" | "info" | "warning" | "danger" | "error";
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  durationMs?: number;
}

export type ToastInput = string | Omit<ToastItem, "id">;

interface ToastContextType {
  showToast: (toastOrMessage: ToastInput, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (toastOrMessage: ToastInput, type?: ToastItem["type"]) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toastObj: Omit<ToastItem, "id"> =
      typeof toastOrMessage === "string"
        ? { message: toastOrMessage, type: type || "success" }
        : { ...toastOrMessage, type: toastOrMessage.type || type || "success" };

    const newToast: ToastItem = { ...toastObj, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toastObj.durationMs ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case "danger":
      case "error":
        return <AlertCircle size={16} className="text-[#DC2626] shrink-0" />;
      case "warning":
        return <AlertTriangle size={16} className="text-[#D97706] shrink-0" />;
      case "info":
        return <Info size={16} className="text-[#2563EB] shrink-0" />;
      case "success":
      default:
        return <CheckCircle2 size={16} className="text-[#166534] shrink-0" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-ledger)] shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {getIcon(t.type)}
              <span className="text-xs font-medium text-[var(--text-primary)] leading-tight">
                {t.message}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="px-2 py-1 text-xs font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (toastOrMessage: ToastInput, type?: ToastItem["type"]) => {
        const msg = typeof toastOrMessage === "string" ? toastOrMessage : toastOrMessage.message;
        console.log(`Toast [${type || "info"}]:`, msg);
      },
    };
  }
  return context;
};


"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { X } from "lucide-react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "warning" | "error";
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"], action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success", action?: ToastAction) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, action }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, action ? 5000 : 4000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div {...(mounted ? { role: "status", "aria-live": "polite" as const } : {})} className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-sm:left-4 max-sm:right-4 max-sm:bottom-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-in-right flex items-center gap-3 rounded-lg px-5 py-3.5 text-sm font-medium text-white shadow-lg ${
              toast.type === "success"
                ? "bg-primary"
                : toast.type === "warning"
                ? "bg-warning"
                : "bg-accent"
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.onClick();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="shrink-0 font-semibold underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity"
              >
                {toast.action.label}
              </button>
            )}
            <button
              onClick={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

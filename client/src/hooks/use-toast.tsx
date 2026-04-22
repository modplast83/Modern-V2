import React, { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "default" | "destructive";

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
  action?: React.ReactNode;
};

type ToastItem = ToastOptions & { id: string };

type ToastContextShape = {
  toast: (opts: ToastOptions) => void;
  toasts: ToastItem[];
};

const ToastContext = createContext<ToastContextShape | undefined>(undefined);

/**
 * ToastProvider
 * ضع <ToastProvider> في مستوى أعلى تطبيقك (App / _app)
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: ToastOptions) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = opts.duration ?? 4000;
    const item: ToastItem = { id, ...opts };
    setToasts((s) => [...s, item]);
    setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts }}>
      {children}

      {/* عرض التنبيهات (RTL) */}
      <div
        aria-live="polite"
        className="fixed top-4 left-4 z-50 flex flex-col gap-3 max-w-sm"
        dir="rtl"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`w-full rounded-lg shadow-lg p-3 border ${
              t.variant === "destructive"
                ? "bg-red-600 text-white border-red-700"
                : "bg-white text-gray-800 border-gray-200"
            }`}
          >
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && (
              <div className="text-sm mt-1">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider />");
  }
  return ctx;
}

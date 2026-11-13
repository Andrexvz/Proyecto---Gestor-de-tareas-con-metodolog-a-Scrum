import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, variant, message }]);
      setTimeout(() => {
        dismiss(id);
      }, 4200);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const styles = {
            success: 'bg-[#131B2E] border-[#10B981]/40 text-[#DAE2FD]',
            error: 'bg-[#131B2E] border-[#F43F5E]/50 text-[#FFDBD9]',
            warning: 'bg-[#131B2E] border-[#F59E0B]/50 text-[#FDE68A]',
            info: 'bg-[#131B2E] border-[#3B82F6]/40 text-[#DAE2FD]',
          }[toast.variant];

          const Icon = {
            success: CheckCircle2,
            error: XCircle,
            warning: AlertTriangle,
            info: Info,
          }[toast.variant];

          const iconColor = {
            success: 'text-[#10B981]',
            error: 'text-[#F43F5E]',
            warning: 'text-[#F59E0B]',
            info: 'text-[#3B82F6]',
          }[toast.variant];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl transition-all duration-150 ${styles}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <p className="text-[13px] leading-[18px] flex-1">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-[#8D90A0] hover:text-white transition-colors shrink-0"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

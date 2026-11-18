import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  timestamp: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, variant, message, timestamp: Date.now() };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      // Duración dinámica: errores duran un poco más para permitir lectura
      const duration = variant === 'error' ? 5500 : 4200;
      setTimeout(() => {
        dismiss(id);
      }, duration);
    },
    [dismiss]
  );

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const variantConfig = {
              success: {
                border: 'border-pulse-green/40',
                glow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
                icon: CheckCircle2,
                iconColor: 'text-pulse-green',
                accentBar: 'bg-pulse-green',
              },
              error: {
                border: 'border-coral-red/40',
                glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
                icon: XCircle,
                iconColor: 'text-coral-red',
                accentBar: 'bg-coral-red',
              },
              warning: {
                border: 'border-amber-500/40',
                glow: 'shadow-[0_0_20px_rgba(245,158,11,0.12)]',
                icon: AlertTriangle,
                iconColor: 'text-amber-400',
                accentBar: 'bg-amber-400',
              },
              info: {
                border: 'border-iris-violet/40',
                glow: 'shadow-[0_0_20px_rgba(139,92,246,0.12)]',
                icon: Info,
                iconColor: 'text-iris-violet',
                accentBar: 'bg-iris-violet',
              },
            }[toast.variant];

            const Icon = variantConfig.icon;

            return (
              <motion.div
                key={toast.id}
                layout={!shouldReduceMotion}
                initial={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: -16, scale: 0.94 }
                }
                animate={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: 1 }
                }
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, x: 28, scale: 0.95 }
                }
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-cards bg-obsidian/95 backdrop-blur-md border ${variantConfig.border} ${variantConfig.glow} shadow-xl group`}
                role="status"
              >
                {/* Subtle vertical indicator bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${variantConfig.accentBar}`}
                />

                <div className="pl-1 pt-0.5 shrink-0">
                  <Icon className={`w-4 h-4 ${variantConfig.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-[13px] leading-[19px] text-bone font-normal break-words">
                    {toast.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="p-1 -mr-1 -mt-1 rounded-inputs text-fog hover:text-paper hover:bg-graphite/50 transition-colors shrink-0"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

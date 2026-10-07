import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toastOrTitle: Omit<ToastMessage, 'id'> | string, type?: ToastType, description?: string) => void;
  removeToast: (id: string) => void;
  showSuccess: (title: string, description?: string) => void;
  showWarning: (title: string, description?: string) => void;
  showError: (title: string, description?: string) => void;
  showInfo: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toastOrTitle: Omit<ToastMessage, 'id'> | string, type: ToastType = 'info', description?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let newToast: ToastMessage;

    if (typeof toastOrTitle === 'string') {
      newToast = { id, title: toastOrTitle, type, description };
    } else {
      newToast = { ...toastOrTitle, id };
    }

    setToasts(prev => [...prev.slice(-3), newToast]);

    const duration = (typeof toastOrTitle === 'object' && toastOrTitle.duration) ? toastOrTitle.duration : 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const showSuccess = (title: string, description?: string) => addToast(title, 'success', description);
  const showWarning = (title: string, description?: string) => addToast(title, 'warning', description);
  const showError = (title: string, description?: string) => addToast(title, 'error', description);
  const showInfo = (title: string, description?: string) => addToast(title, 'info', description);

  return (
    <ToastContext.Provider value={{
      toasts,
      addToast,
      removeToast,
      showSuccess,
      showWarning,
      showError,
      showInfo
    }}>
      {children}

      {/* Floating Notifications */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4"
      >
        {toasts.map(t => {
          let icon = <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />;
          let borderStyle = 'border-cyan-500/30 bg-[#111A2E]/95';
          let titleColor = 'text-cyan-300';

          if (t.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
            borderStyle = 'border-emerald-500/40 bg-[#111A2E]/95';
            titleColor = 'text-emerald-300';
          } else if (t.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
            borderStyle = 'border-amber-500/40 bg-[#111A2E]/95';
            titleColor = 'text-amber-300';
          } else if (t.type === 'error') {
            icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
            borderStyle = 'border-rose-500/40 bg-[#111A2E]/95';
            titleColor = 'text-rose-300';
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md flex items-start gap-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-3 ${borderStyle}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-semibold ${titleColor}`}>{t.title}</h4>
                {t.description && (
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

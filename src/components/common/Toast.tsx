import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Fixed Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none select-none">
        {toasts.map((t) => {
          let bgClass = 'bg-slate-900 text-white border-slate-800';
          let Icon = CheckCircle2;

          switch (t.type) {
            case 'success':
              bgClass = 'bg-slate-900 text-emerald-400 border-emerald-500/30';
              Icon = CheckCircle2;
              break;
            case 'warning':
              bgClass = 'bg-slate-900 text-amber-400 border-amber-500/30';
              Icon = AlertTriangle;
              break;
            case 'error':
              bgClass = 'bg-slate-900 text-rose-400 border-rose-500/30';
              Icon = XCircle;
              break;
            case 'info':
              bgClass = 'bg-slate-900 text-sky-400 border-sky-500/30';
              Icon = Info;
              break;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-xs transition-all transform translate-y-0 ${bgClass}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{t.title}</h4>
                  {t.message && <p className="text-[11px] text-slate-300 mt-0.5">{t.message}</p>}
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
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

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

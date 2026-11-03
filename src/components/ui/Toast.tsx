import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon, type UiIconName } from './Icon';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
  icon: UiIconName;
}

interface ToastContextValue {
  notify: (message: string, options?: { tone?: Toast['tone']; icon?: UiIconName }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const notify = useCallback<ToastContextValue['notify']>((message, options) => {
    const id = nextId.current++;
    const tone = options?.tone ?? 'success';
    const icon = options?.icon ?? (tone === 'error' ? 'alert' : 'check');
    setToasts((list) => [...list, { id, message, tone, icon }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.icon} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return ctx;
}

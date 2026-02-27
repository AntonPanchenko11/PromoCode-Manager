import { createContext, useContext, useMemo, useState } from 'react';

type ToastType = 'success' | 'error' | 'warning';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type NotificationsContextValue = {
  notify: (type: ToastType, message: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (type: ToastType, message: string): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const value = useMemo<NotificationsContextValue>(() => ({
    notify,
  }), []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export const useNotifications = (): NotificationsContextValue => {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error('useNotifications must be used inside NotificationsProvider');
  }

  return value;
};

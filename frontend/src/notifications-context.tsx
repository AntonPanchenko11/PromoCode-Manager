import { Alert, AlertColor, Snackbar } from '@mui/material';
import { SyntheticEvent, createContext, useContext, useMemo, useState } from 'react';

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

const mapAlertSeverity = (type: ToastType): AlertColor => type;

export function NotificationsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [queue, setQueue] = useState<Toast[]>([]);

  const current = queue[0] ?? null;
  const isOpen = current !== null;

  const notify = (type: ToastType, message: string): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setQueue((prev) => [...prev, { id, type, message }]);
  };

  const handleClose = (_event?: Event | SyntheticEvent, reason?: string): void => {
    if (reason === 'clickaway') {
      return;
    }

    setQueue((prev) => prev.slice(1));
  };

  const value = useMemo<NotificationsContextValue>(() => ({
    notify,
  }), []);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Snackbar
        open={isOpen}
        autoHideDuration={4200}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {current ? (
          <Alert
            onClose={handleClose}
            severity={mapAlertSeverity(current.type)}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {current.message}
          </Alert>
        ) : <span />}
      </Snackbar>
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

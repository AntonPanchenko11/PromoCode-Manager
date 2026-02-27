import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { App } from './app';
import { AuthProvider } from './auth-context';
import { NotificationsProvider } from './notifications-context';
import { appTheme } from './theme';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        <NotificationsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NotificationsProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);

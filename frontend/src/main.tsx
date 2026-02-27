import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { AuthProvider } from './auth-context';
import { NotificationsProvider } from './notifications-context';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificationsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </NotificationsProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

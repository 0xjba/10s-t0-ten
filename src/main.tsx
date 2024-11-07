// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/auth.context';
import { AppProvider } from './context/app.context';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);
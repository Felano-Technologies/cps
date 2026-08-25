import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotificationProvider } from './contexts/NotificationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)

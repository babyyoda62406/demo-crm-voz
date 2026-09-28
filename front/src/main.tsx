import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { ModalZIndexProvider } from './context/ModalZIndexContext';
import i18n from './config/i18n.config';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <HashRouter>
        <AuthProvider>
          <SidebarProvider>
            <ModalZIndexProvider>
              <App />
              {/* Los avisos caen por debajo de la barra superior (64 px): en un
                  móvil, si no, tapan la hamburguesa y el menú deja de abrirse. */}
              <Toaster
                position="top-right"
                containerStyle={{ top: 76, right: 12 }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    color: '#1f2937',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    padding: '16px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    maxWidth: 'min(24rem, calc(100vw - 1.5rem))',
                  },
                  success: {
                    style: {
                      background: 'rgba(16, 185, 129, 0.15)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#065f46',
                    },
                    iconTheme: { primary: '#10b981', secondary: '#fff' },
                  },
                  error: {
                    style: {
                      background: 'rgba(239, 68, 68, 0.15)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#991b1b',
                    },
                    iconTheme: { primary: '#ef4444', secondary: '#fff' },
                  },
                }}
              />
            </ModalZIndexProvider>
          </SidebarProvider>
        </AuthProvider>
      </HashRouter>
    </I18nextProvider>
  </StrictMode>,
);

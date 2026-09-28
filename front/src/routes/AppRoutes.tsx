import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { PrivilegedRoute } from './PrivilegedRoute';
import { LoginView } from '../views/auth/LoginView';
import { DashboardView } from '../views/dashboard/DashboardView';
import { ClientsView } from '../views/clients/ClientsView';
import { PropertiesView } from '../views/properties/PropertiesView';
import { ContractsView } from '../views/contracts/ContractsView';
import { DocumentsView } from '../views/documents/DocumentsView';
import { InvoicesView } from '../views/billing/InvoicesView';
import { AssistantView } from '../views/assistant/AssistantView';
import { PublicSignView } from '../views/contracts/PublicSignView';

/**
 * Mapa de rutas de CRMIA.
 *
 * Es el único sitio donde se declara una ruta. Cada dominio vive en
 * `src/views/<dominio>/` y expone un componente con nombre estable; añadir una
 * pantalla se reduce a crear la vista y registrarla aquí y en `Sidebar.tsx`.
 */

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const privateRoute = (children: ReactNode) => (
  <ProtectedRoute>
    <PrivilegedRoute>
      <MainLayout>{children}</MainLayout>
    </PrivilegedRoute>
  </ProtectedRoute>
);

export const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginView />
          </PublicRoute>
        }
      />

      {/*
        Firma pública de contratos. Va fuera de `PublicRoute` a propósito: el
        enlace lo abre el cliente final (sin sesión), pero también tiene que
        funcionar si quien lo pincha es la persona usuaria del CRM con la sesión
        iniciada, y `PublicRoute` la mandaría al panel.
      */}
      <Route path="/firmar/:token" element={<PublicSignView />} />

      <Route path="/dashboard" element={privateRoute(<DashboardView />)} />
      <Route path="/clientes" element={privateRoute(<ClientsView />)} />
      <Route path="/propiedades" element={privateRoute(<PropertiesView />)} />
      <Route path="/contratos" element={privateRoute(<ContractsView />)} />
      <Route path="/documentos" element={privateRoute(<DocumentsView />)} />
      <Route path="/facturas" element={privateRoute(<InvoicesView />)} />
      <Route path="/asistente" element={privateRoute(<AssistantView />)} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

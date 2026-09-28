import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { supabaseConfigured } from '../lib/supabase.js';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { ToastProvider, Spinner } from './components/ui.jsx';
import { PendientesProvider } from './PendientesContext.jsx';
import Login from './Login.jsx';
import Layout from './Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Ventas from './pages/Ventas.jsx';
import Clientes from './pages/Clientes.jsx';
import Articulos from './pages/Articulos.jsx';
import Stock from './pages/Stock.jsx';
import Promociones from './pages/Promociones.jsx';
import Reportes from './pages/Reportes.jsx';
import '../styles/admin-base.css';
import '../styles/admin.css';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return <div className="login"><Spinner /></div>;
  if (!session) return <Login />;
  return (
    <PendientesProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="articulos" element={<Articulos />} />
          <Route path="stock" element={<Stock />} />
          <Route path="promociones" element={<Promociones />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </PendientesProvider>
  );
}

function NotConfigured() {
  return (
    <div className="login">
      <div className="login-card">
        <h2 className="login-title">Falta configurar Supabase</h2>
        <p className="text-muted">
          Definí <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> en el archivo <code>.env</code> (o en las variables del hosting) y volvé a cargar. Ver el README.
        </p>
      </div>
    </div>
  );
}

export default function AdminApp() {
  useEffect(() => {
    document.documentElement.classList.add('admin-html');
    return () => document.documentElement.classList.remove('admin-html');
  }, []);

  if (!supabaseConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}

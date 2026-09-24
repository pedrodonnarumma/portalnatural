import { Navigate, Route, Routes } from 'react-router-dom';
import { supabaseConfigured } from '../lib/supabase.js';
import { AuthProvider, useAuth } from './AuthProvider.jsx';
import { ToastProvider, Spinner } from './components/ui.jsx';
import Login from './Login.jsx';
import Layout from './Layout.jsx';
import Ventas from './pages/Ventas.jsx';
import Clientes from './pages/Clientes.jsx';
import Articulos from './pages/Articulos.jsx';
import Stock from './pages/Stock.jsx';
import Promociones from './pages/Promociones.jsx';
import Reportes from './pages/Reportes.jsx';
import '../styles/admin.css';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return <div className="login"><Spinner /></div>;
  if (!session) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="ventas" replace />} />
        <Route path="ventas" element={<Ventas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="articulos" element={<Articulos />} />
        <Route path="stock" element={<Stock />} />
        <Route path="promociones" element={<Promociones />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="*" element={<Navigate to="ventas" replace />} />
      </Route>
    </Routes>
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
  if (!supabaseConfigured) return <NotConfigured />;
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}

import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { ShoppingCart, Users, Package, Boxes, Megaphone, BarChart3, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthProvider.jsx';

const links = [
  { to: '/admin/ventas', label: 'Ventas', icon: ShoppingCart },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/articulos', label: 'Artículos', icon: Package },
  { to: '/admin/stock', label: 'Stock', icon: Boxes },
  { to: '/admin/promociones', label: 'Promociones', icon: Megaphone },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
];

export default function Layout() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin">
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-head">
          <Brand size="sm" as={Link} to="/admin" />
          <button type="button" className="btn btn-icon btn-secondary sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <X size={16} />
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Secciones">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`} onClick={() => setOpen(false)}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href="/" className="sidebar-link" target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />
            <span>Ver sitio</span>
          </a>
          <div className="sidebar-user text-muted" title={session?.user?.email}>{session?.user?.email}</div>
          <button type="button" className="sidebar-link sidebar-logout" onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="btn btn-icon btn-secondary" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <Menu size={18} />
          </button>
          <Brand size="sm" />
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

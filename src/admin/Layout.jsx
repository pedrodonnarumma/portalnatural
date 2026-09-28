import { useEffect, useRef } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Users, Package, Boxes, Megaphone, BarChart3, LogOut, ExternalLink, Bell } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthProvider.jsx';
import { usePendientes } from './PendientesContext.jsx';
import BottomNav from './components/BottomNav.jsx';

const NAV_LINKS = [
  { to: '/admin', label: 'Inicio', icon: Home, end: true },
  { to: '/admin/ventas', label: 'Ventas', icon: ShoppingCart, badge: 'pendientes' },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/articulos', label: 'Artículos', icon: Package },
  { to: '/admin/stock', label: 'Stock', icon: Boxes },
  { to: '/admin/promociones', label: 'Promociones', icon: Megaphone },
  { to: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
];

export default function Layout() {
  const { session } = useAuth();
  const { count: pendientesCount } = usePendientes();
  const contentRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="admin">
      <aside className="sidebar">
        <div className="sidebar-head">
          <Brand size="sm" as={Link} to="/admin" />
        </div>
        <nav className="sidebar-nav" aria-label="Secciones">
          {NAV_LINKS.map(({ to, label, icon: Icon, badge, end }) => {
            const count = badge === 'pendientes' ? pendientesCount : 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                {count > 0 && <span className="sidebar-badge">{count}</span>}
              </NavLink>
            );
          })}
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

      <div className="admin-main">
        <header className="admin-topbar">
          <Brand size="sm" as={Link} to="/admin" />
          {pendientesCount > 0 && (
            <Link
              to="/admin/ventas?estado=pendiente"
              className="admin-bell"
              aria-label={`${pendientesCount} pedidos pendientes`}
            >
              <Bell size={20} aria-hidden="true" />
              <span className="admin-bell-dot" aria-hidden="true">{pendientesCount}</span>
            </Link>
          )}
        </header>
        <main className="admin-content" ref={contentRef}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

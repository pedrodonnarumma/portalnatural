import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Home, ShoppingCart, Boxes, Menu, Plus, Users, Package, Megaphone, BarChart3, ExternalLink, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { usePendientes } from '../PendientesContext.jsx';
import { useAuth } from '../AuthProvider.jsx';
import VentaRapidaSheet from './VentaRapidaSheet.jsx';

function tabClass({ isActive }) {
  return `admin-tab${isActive ? ' is-active' : ''}`;
}

export default function BottomNav() {
  const { count } = usePendientes();
  const { session } = useAuth();
  const [showMas, setShowMas] = useState(false);
  const [showVenta, setShowVenta] = useState(false);

  return (
    <>
      <nav className="admin-tabbar" aria-label="Navegación principal">
        <NavLink to="/admin" end className={tabClass} aria-label="Inicio">
          <Home size={22} aria-hidden="true" />
          <span>Inicio</span>
        </NavLink>

        <NavLink to="/admin/ventas" className={tabClass} aria-label={`Ventas${count > 0 ? `, ${count} pendientes` : ''}`}>
          <span className="admin-tab-icon-wrap">
            <ShoppingCart size={22} aria-hidden="true" />
            {count > 0 && <span className="admin-tab-badge" aria-hidden="true">{count}</span>}
          </span>
          <span>Ventas</span>
        </NavLink>

        <div className="admin-fab-wrap">
          <button
            type="button"
            className="admin-fab"
            onClick={() => setShowVenta(true)}
            aria-label="Nueva venta rápida"
          >
            <Plus size={26} aria-hidden="true" />
          </button>
          <span aria-hidden="true">Vender</span>
        </div>

        <NavLink to="/admin/stock" className={tabClass} aria-label="Stock">
          <Boxes size={22} aria-hidden="true" />
          <span>Stock</span>
        </NavLink>

        <button
          type="button"
          className="admin-tab"
          onClick={() => setShowMas(true)}
          aria-label="Más secciones"
        >
          <Menu size={22} aria-hidden="true" />
          <span>Más</span>
        </button>
      </nav>

      {showMas && <MasSheet onClose={() => setShowMas(false)} userEmail={session?.user?.email} />}
      {showVenta && <VentaRapidaSheet onClose={() => setShowVenta(false)} />}
    </>
  );
}

function MasSheet({ onClose, userEmail }) {
  return (
    <div
      className="admin-sheet-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="admin-sheet" role="dialog" aria-modal="true" aria-label="Más secciones">
        <div className="admin-sheet-grab" />
        <div className="mas-tiles">
          <Link to="/admin/clientes" className="mas-tile" onClick={onClose}>
            <Users size={24} aria-hidden="true" />
            <span>Clientes</span>
          </Link>
          <Link to="/admin/articulos" className="mas-tile" onClick={onClose}>
            <Package size={24} aria-hidden="true" />
            <span>Artículos</span>
          </Link>
          <Link to="/admin/promociones" className="mas-tile" onClick={onClose}>
            <Megaphone size={24} aria-hidden="true" />
            <span>Promociones</span>
          </Link>
          <Link to="/admin/reportes" className="mas-tile" onClick={onClose}>
            <BarChart3 size={24} aria-hidden="true" />
            <span>Reportes</span>
          </Link>
          <a href="/" target="_blank" rel="noreferrer" className="mas-tile" onClick={onClose}>
            <ExternalLink size={24} aria-hidden="true" />
            <span>Ver sitio</span>
          </a>
          <button
            type="button"
            className="mas-tile"
            onClick={() => { onClose(); supabase.auth.signOut(); }}
          >
            <LogOut size={24} aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>
        {userEmail && <p className="mas-user">{userEmail}</p>}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Brand from './Brand.jsx';
import { Close, Menu } from './icons.jsx';

const LANDING_LINKS = [
  { href: '#nosotros', label: 'Nosotros', spy: 'nosotros' },
  { href: '#ubicacion', label: 'Ubicación', spy: 'ubicacion' },
  { href: '#contacto', label: 'Contacto', spy: 'contacto' },
];
const CATALOG_LINKS = [
  { to: '/', label: 'Inicio' },
  { to: '/#nosotros', label: 'Nosotros' },
  { to: '/#ubicacion', label: 'Ubicación' },
];

function NavItem({ item, className, onClick }) {
  if (item.to) return <Link className={className} to={item.to} onClick={onClick}>{item.label}</Link>;
  return (
    <a
      className={className}
      href={item.href}
      onClick={onClick}
      {...(item.spy ? { 'data-spy': item.spy } : {})}
    >
      {item.label}
    </a>
  );
}

export default function Nav({ variant = 'landing' }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const links = variant === 'landing' ? LANDING_LINKS : CATALOG_LINKS;
  const cta = variant === 'landing'
    ? { to: '/catalogo', label: 'Ver catálogo' }
    : { to: '/', label: 'Volver al inicio' };
  const close = () => setOpen(false);

  useEffect(close, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`pn-header${open ? ' is-open' : ''}`}>
      <div className="pn-header-bar">
        <Brand
          as={variant === 'landing' ? 'a' : Link}
          {...(variant === 'landing' ? { href: '#inicio' } : { to: '/' })}
          className="pn-header-brand"
        />
        <nav className="pn-nav-desktop" aria-label="Principal">
          {links.map((l) => <NavItem key={l.label} item={l} className="pn-nav-link" />)}
          <Link className="pn-btn pn-btn-primary pn-btn-nav" to={cta.to}>{cta.label}</Link>
        </nav>
        <button
          type="button"
          className="pn-menu-btn"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls="pn-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <Close size={22} strokeWidth={1.8} /> : <Menu size={22} />}
        </button>
      </div>
      {/* Progress bar */}
      <div className="pn-header-progress" aria-hidden="true" />
      <nav id="pn-menu" className="pn-menu" aria-label="Principal" hidden={!open}>
        {links.map((l) => <NavItem key={l.label} item={l} className="pn-menu-link" onClick={close} />)}
        <Link className="pn-btn pn-btn-primary pn-btn-block" to={cta.to} onClick={close}>{cta.label}</Link>
      </nav>
    </header>
  );
}

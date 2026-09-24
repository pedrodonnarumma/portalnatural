import Brand from './Brand.jsx';

export default function Nav() {
  return (
    <nav className="nav site-nav" aria-label="Principal">
      <Brand as="a" href="#inicio" className="nav-home" />
      <div className="nav-links">
        <a href="#nosotros" className="nav-link">Nosotros</a>
        <a href="#catalogo" className="nav-link">Catálogo</a>
        <a href="#ubicacion" className="nav-link">Ubicación</a>
        <a href="#contacto" className="btn btn-primary btn-pill nav-cta">Ver catálogo</a>
      </div>
    </nav>
  );
}

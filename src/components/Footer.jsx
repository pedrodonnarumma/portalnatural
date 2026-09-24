import Brand from './Brand.jsx';
import { site } from '../data/site.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Brand size="sm" />
          <p className="footer-text">Dietética y almacén natural. Productos a granel, sin TACC y asesoramiento.</p>
        </div>
        <div>
          <span className="footer-heading">Secciones</span>
          <div className="footer-list">
            <a href="#nosotros">Nosotros</a>
            <a href="#catalogo">Catálogo completo</a>
            <a href="#ubicacion">Ubicación</a>
          </div>
        </div>
        <div>
          <span className="footer-heading">Contacto</span>
          <div className="footer-list footer-contact">
            <span>{site.direccion}</span>
            <span>{site.telefonoCorto}</span>
            <span>{site.instagram}</span>
          </div>
        </div>
      </div>
      <div className="container footer-legal">© 2026 Portal Natural</div>
    </footer>
  );
}

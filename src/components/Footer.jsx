import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import { site } from '../data/site.js';

export default function Footer() {
  return (
    <footer className="pn-footer">
      <div className="pn-footer-inner">
        <div className="pn-footer-about">
          <Brand size="md" className="pn-d" />
          <Brand size="sm" className="pn-m" />
          <p>
            <span className="pn-d">Dietética y almacén natural. Productos a granel, sin TACC y asesoramiento.</span>
            <span className="pn-m">Dietética y almacén natural. {site.telefonoCorto} · {site.instagram}</span>
          </p>
        </div>
        <div className="pn-footer-col pn-d">
          <span className="pn-footer-heading">Secciones</span>
          <a className="pn-footer-link" href="#nosotros">Nosotros</a>
          <Link className="pn-footer-link" to="/catalogo">Catálogo completo</Link>
          <a className="pn-footer-link" href="#ubicacion">Ubicación</a>
        </div>
        <div className="pn-footer-col pn-d">
          <span className="pn-footer-heading">Contacto</span>
          <span>{site.direccionCorta}</span>
          <span>{site.telefonoCorto}</span>
          <span>{site.instagram}</span>
        </div>
        <span className="pn-footer-legal">© {site.anio} Portal Natural</span>
      </div>
    </footer>
  );
}

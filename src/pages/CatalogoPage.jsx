import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import Catalog from '../components/Catalog.jsx';
import Footer from '../components/Footer.jsx';

export default function CatalogoPage() {
  return (
    <div className="page">
      <Nav />
      <main>
        <div className="container" style={{ paddingTop: 'clamp(24px, 4vw, 48px)', paddingBottom: 0 }}>
          <Link to="/" className="catalogo-back">← Volver al inicio</Link>
        </div>
        <Catalog />
      </main>
      <Footer />
    </div>
  );
}

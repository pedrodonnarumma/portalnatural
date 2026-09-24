import { Link } from 'react-router-dom';
import { ArrowRight, ProductIcon } from './icons.jsx';
import { destacados } from '../data/products.js';
import { showPrices } from '../data/site.js';
import { fmtPrecio } from '../lib/format.js';

const precio = (p) => (showPrices && p.precio != null ? fmtPrecio(p.precio) : 'Consultá el precio');

export default function Favorites() {
  return (
    <section id="catalogo" className="pn-favs">
      <div className="pn-favs-head">
        <div className="pn-favs-heading">
          <span className="pn-kicker">Catálogo</span>
          <h2 className="pn-h2">
            <span className="pn-d">Algunos de <em>nuestros favoritos</em></span>
            <span className="pn-m">Nuestros <em>favoritos</em></span>
          </h2>
        </div>
        <Link className="pn-btn pn-btn-ghost pn-btn-md pn-d" to="/catalogo">
          Ver catálogo completo
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="pn-favs-grid">
        {destacados.map((p, i) => (
          <article key={p.nombre} className={`pn-card pn-fav${i >= 4 ? ' pn-d' : ''}`}>
            <div className={`pn-thumb pn-tone-${p.tono}${p.tonoMovil ? ` pn-tone-m-${p.tonoMovil}` : ''}`}>
              {p.foto ? <img src={p.foto} alt="" /> : <ProductIcon name={p.icono} className="pn-thumb-icon" />}
            </div>
            <div className="pn-fav-body">
              <span className="pn-card-cat pn-d">{p.categoria}</span>
              <h3 className="pn-card-name">
                <span className={p.nombreCorto ? 'pn-d' : undefined}>{p.nombre}</span>
                {p.nombreCorto && <span className="pn-m">{p.nombreCorto}</span>}
              </h3>
              <p className="pn-card-desc pn-d">{p.detalle}</p>
              <span className="pn-price">{precio(p)}</span>
            </div>
          </article>
        ))}
      </div>
      <Link className="pn-btn pn-btn-ghost pn-btn-md pn-btn-block pn-m" to="/catalogo">Ver catálogo completo</Link>
    </section>
  );
}

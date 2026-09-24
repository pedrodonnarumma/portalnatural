import { useState } from 'react';
import { categorias, productos } from '../data/products.js';
import { showPrices } from '../data/site.js';

const plates = [
  { bg: 'var(--color-accent-2-200)', ink: 'var(--color-accent-2-800)' },
  { bg: 'var(--color-accent-200)', ink: 'var(--color-accent-800)' },
  { bg: 'var(--color-neutral-200)', ink: 'var(--color-accent-2-700)' },
];

function ProductCard({ producto, index }) {
  const plate = plates[index % plates.length];
  return (
    <article className="product-card">
      <div className="product-plate" style={{ background: plate.bg, color: plate.ink }}>
        {producto.foto ? (
          <img src={producto.foto} alt={producto.nombre} className="washed" loading="lazy" />
        ) : (
          <span className="product-initial" aria-hidden="true">{producto.nombre.charAt(0)}</span>
        )}
        <span className="product-badge">{producto.grupo}</span>
      </div>
      <div className="product-body">
        <span className="product-cat">{producto.categoria}</span>
        <h3 className="product-name">{producto.nombre}</h3>
        <p className="product-detail">{producto.detalle}</p>
        <span className="product-price">{showPrices ? producto.precio : 'Consultá el precio'}</span>
      </div>
    </article>
  );
}

export default function Catalog() {
  const [cat, setCat] = useState('Todos');
  const items = productos.filter((p) => cat === 'Todos' || p.grupo === cat);
  const resumen =
    `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en ` +
    `${cat === 'Todos' ? 'el catálogo' : cat.toLowerCase()} · el catálogo completo está en el local.`;

  return (
    <section id="catalogo" className="catalog">
      <div className="container catalog-inner">
        <div className="catalog-head">
          <div>
            <span className="kicker">Catálogo</span>
            <h2 className="section-title">
              Algunos de <span className="text-accent-2">nuestros favoritos</span>
            </h2>
          </div>
          <a href="#contacto" className="btn btn-secondary btn-pill btn-md">Ver catálogo completo →</a>
        </div>

        <div className="chips" role="group" aria-label="Filtrar por categoría">
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              className={`chip${c === cat ? ' is-active' : ''}`}
              aria-pressed={c === cat}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* key={cat} remonta el grid para que las cards reentren con pn-rise */}
        <div className="product-grid" key={cat}>
          {items.map((p, i) => (
            <ProductCard key={p.nombre} producto={p} index={i} />
          ))}
        </div>

        <p className="catalog-summary" aria-live="polite">{resumen}</p>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { showPrices } from '../data/site.js';

const LIMITE = 6;

const plates = [
  { bg: 'var(--color-accent-2-200)', ink: 'var(--color-accent-2-800)' },
  { bg: 'var(--color-accent-200)', ink: 'var(--color-accent-800)' },
  { bg: 'var(--color-neutral-200)', ink: 'var(--color-accent-2-700)' },
];

const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function VidreiraCard({ producto, index }) {
  const plate = plates[index % plates.length];
  const precio = showPrices
    ? `${money(Number(producto.precio))} / ${producto.unidad}`
    : 'Consultá el precio';

  return (
    <Link to="/catalogo" className="product-card vidriera-card">
      <div className="product-plate" style={{ background: plate.bg, color: plate.ink }}>
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} className="washed" loading="lazy" />
        ) : (
          <span className="product-initial" aria-hidden="true">{producto.nombre.charAt(0)}</span>
        )}
        {producto.categoria && <span className="product-badge">{producto.categoria.nombre}</span>}
      </div>
      <div className="product-body">
        {producto.categoria && <span className="product-cat">{producto.categoria.nombre}</span>}
        <h3 className="product-name">{producto.nombre}</h3>
        {producto.descripcion && <p className="product-detail">{producto.descripcion}</p>}
        <span className="product-price">{precio}</span>
      </div>
    </Link>
  );
}

export default function Vidriera() {
  const [productos, setProductos] = useState(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase
      .from('productos')
      .select('id, nombre, unidad, precio, imagen_url, descripcion, categoria:categorias(id, nombre)')
      .eq('activo', true)
      .eq('destacado', true)
      .limit(LIMITE)
      .then(({ data }) => setProductos(data ?? []));
  }, []);

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
          <Link to="/catalogo" className="btn btn-secondary btn-pill btn-md">
            Ver catálogo completo →
          </Link>
        </div>

        {productos === null && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-500)' }}>
            Cargando…
          </div>
        )}

        {productos !== null && productos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-500)' }}>
            Próximamente.
          </div>
        )}

        {productos !== null && productos.length > 0 && (
          <>
            <div className="product-grid">
              {productos.map((p, i) => (
                <VidreiraCard key={p.id} producto={p} index={i} />
              ))}
            </div>
            <p className="catalog-summary">
              Mostrando {productos.length} de nuestros productos destacados ·{' '}
              <Link to="/catalogo" className="catalog-summary-link">ver el catálogo completo</Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

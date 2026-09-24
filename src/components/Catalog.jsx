import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase.js';
import { showPrices } from '../data/site.js';

const plates = [
  { bg: 'var(--color-accent-2-200)', ink: 'var(--color-accent-2-800)' },
  { bg: 'var(--color-accent-200)', ink: 'var(--color-accent-800)' },
  { bg: 'var(--color-neutral-200)', ink: 'var(--color-accent-2-700)' },
];

const money = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function ProductCard({ producto, index }) {
  const plate = plates[index % plates.length];
  const precio = showPrices
    ? `${money(Number(producto.precio))} / ${producto.unidad}`
    : 'Consultá el precio';

  return (
    <article className="product-card">
      <div className="product-plate" style={{ background: plate.bg, color: plate.ink }}>
        {producto.imagen_url ? (
          <img src={producto.imagen_url} alt={producto.nombre} className="washed" loading="lazy" />
        ) : (
          <span className="product-initial" aria-hidden="true">{producto.nombre.charAt(0)}</span>
        )}
        <span className="product-badge">{producto.categoria?.nombre ?? 'General'}</span>
      </div>
      <div className="product-body">
        <span className="product-cat">{producto.categoria?.nombre ?? ''}</span>
        <h3 className="product-name">{producto.nombre}</h3>
        {producto.descripcion && <p className="product-detail">{producto.descripcion}</p>}
        <span className="product-price">{precio}</span>
      </div>
    </article>
  );
}

export default function Catalog() {
  const [productos, setProductos] = useState(null);
  const [cat, setCat] = useState('Todos');

  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase
      .from('productos')
      .select('id, nombre, unidad, precio, imagen_url, descripcion, categoria:categorias(id, nombre, orden)')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setProductos(data ?? []));
  }, []);

  const categorias = useMemo(() => {
    if (!productos) return [{ id: 'todos', nombre: 'Todos' }];
    const map = new Map();
    for (const p of productos) {
      if (p.categoria) map.set(p.categoria.id, p.categoria);
    }
    const sorted = [...map.values()].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));
    return [{ id: 'todos', nombre: 'Todos' }, ...sorted];
  }, [productos]);

  const items = useMemo(() => {
    if (!productos) return [];
    return cat === 'todos' ? productos : productos.filter((p) => p.categoria?.id === cat);
  }, [productos, cat]);

  const catNombre = categorias.find((c) => c.id === cat)?.nombre ?? '';
  const resumen =
    productos === null
      ? null
      : `${items.length} ${items.length === 1 ? 'producto' : 'productos'} en ` +
        `${cat === 'todos' ? 'el catálogo' : catNombre.toLowerCase()} · el catálogo completo está en el local.`;

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
              key={c.id}
              type="button"
              className={`chip${c.id === cat ? ' is-active' : ''}`}
              aria-pressed={c.id === cat}
              onClick={() => setCat(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        {productos === null && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-500)' }}>
            Cargando productos…
          </div>
        )}

        {productos !== null && (
          <div className="product-grid" key={cat}>
            {items.map((p, i) => (
              <ProductCard key={p.id} producto={p} index={i} />
            ))}
            {items.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--color-neutral-500)' }}>
                No hay productos en esta categoría todavía.
              </div>
            )}
          </div>
        )}

        {resumen && <p className="catalog-summary" aria-live="polite">{resumen}</p>}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { ArrowLeft, Bag, Close, Minus, Plus, ProductIcon, Search, WhatsApp } from '../components/icons.jsx';
import { catalogo as catalogoStatic } from '../data/products.js';
import { site, showPrices } from '../data/site.js';
import { fmtPrecio, normalizar } from '../lib/format.js';
import { etiquetaCantidad, etiquetaPresentacion, precioPresentacion, precioReferencia } from '../lib/precios.js';
import { linkWhatsApp, mensajeWhatsApp, usePedido } from '../lib/pedido.js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const KEY_POPULAR = 'pn-popular';
const TONOS = ['tint-2', 'tint'];

function leerPopular() {
  try { return JSON.parse(localStorage.getItem(KEY_POPULAR) || '{}'); } catch { return {}; }
}
function registrarPopular(nombre) {
  try {
    const p = leerPopular();
    p[nombre] = (p[nombre] || 0) + 1;
    localStorage.setItem(KEY_POPULAR, JSON.stringify(p));
  } catch {}
}

function ProductCard({ p, i, pasos, onSumar, highlighted, cardRef }) {
  const vp = p.venta_por ?? 1;
  const precioPublico = precioPresentacion(p.precio, vp);
  const etiqUnidad = etiquetaPresentacion(p.unidad, vp);
  const ref = precioReferencia(p.precio, p.unidad, vp);

  return (
    <article
      ref={cardRef}
      className={`pn-card pn-product${highlighted ? ' pn-product-highlight' : ''}`}
    >
      <div className={`pn-thumb pn-tone-${TONOS[i % 2]}`}>
        {(p.foto || p.imagen_url)
          ? <img src={p.foto ?? p.imagen_url} alt="" />
          : <ProductIcon name={p.icono ?? 'hoja'} className="pn-thumb-icon" />}
      </div>
      <div className="pn-product-body">
        <span className="pn-card-cat">{p.categoria}</span>
        <h3 className="pn-card-name">{p.nombre}</h3>
        {p.descripcion && <p className="pn-card-desc">{p.descripcion}</p>}
        <div className="pn-product-price">
          {showPrices ? (
            <>
              <span className="pn-price">{fmtPrecio(precioPublico)}</span>
              <span className="pn-unit">/ {etiqUnidad}</span>
            </>
          ) : (
            <span className="pn-price">Consultá el precio</span>
          )}
        </div>
        {showPrices && ref && <span className="pn-price-ref">{ref}</span>}
        {pasos > 0 ? (
          <div className="pn-stepper">
            <button type="button" className="pn-step" onClick={() => onSumar(p.nombre, -1)} aria-label={`Quitar ${etiqUnidad} de ${p.nombre}`}>
              <Minus size={15} />
            </button>
            <span className="pn-step-qty" aria-live="polite">{etiquetaCantidad(pasos, p.unidad, vp)}</span>
            <button type="button" className="pn-step" onClick={() => onSumar(p.nombre, 1)} aria-label={`Agregar ${etiqUnidad} de ${p.nombre}`}>
              <Plus size={15} />
            </button>
          </div>
        ) : (
          <button type="button" className="pn-add" onClick={() => onSumar(p.nombre, 1)}>Agregar</button>
        )}
      </div>
    </article>
  );
}

function Pedido({ items, total, onQuitar, onClose }) {
  const lleno = items.length > 0;
  const href = lleno ? linkWhatsApp(mensajeWhatsApp(items, total)) : undefined;
  return (
    <>
      <div className="pn-cart-head">
        <h2 className="pn-cart-title">Tu pedido</h2>
        <span className="pn-cart-count" aria-label={`${items.length} productos`}>{items.length}</span>
        {onClose && (
          <button type="button" className="pn-x pn-cart-close" onClick={onClose} aria-label="Cerrar pedido">
            <Close size={20} />
          </button>
        )}
      </div>
      {lleno ? (
        <div className="pn-cart-filled">
          <ul className="pn-cart-items">
            {items.map((it) => {
              const vp = it.venta_por ?? 1;
              const cantLabel = etiquetaCantidad(it.pasos, it.unidad, vp);
              const precLabel = `${fmtPrecio(precioPresentacion(it.precio, vp))} / ${etiquetaPresentacion(it.unidad, vp)}`;
              return (
                <li key={it.nombre} className="pn-cart-row">
                  <div className="pn-cart-row-text">
                    <span className="pn-cart-row-name">{it.nombre}</span>
                    <span className="pn-cart-row-detail">
                      {it.unidad === 'un' ? cantLabel : `${cantLabel} · ${precLabel}`}
                    </span>
                  </div>
                  <span className="pn-cart-row-sub">{fmtPrecio(it.subtotal)}</span>
                  <button type="button" className="pn-x" onClick={() => onQuitar(it.nombre)} aria-label={`Quitar ${it.nombre} del pedido`}>
                    <Close size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
          <span className="pn-cart-rule" />
          <div className="pn-cart-total">
            <span>Total estimado</span>
            <strong>{fmtPrecio(total)}</strong>
          </div>
        </div>
      ) : (
        <div className="pn-cart-empty">
          <Bag size={34} strokeWidth={1.4} />
          <span>Todavía no agregaste productos. Elegí uno del catálogo para empezar.</span>
        </div>
      )}
      {lleno ? (
        <a className="pn-cart-cta" href={href} target="_blank" rel="noopener noreferrer">
          <WhatsApp size={18} strokeWidth={1.8} />
          Hacer pedido
        </a>
      ) : (
        <button type="button" className="pn-cart-cta" disabled>
          <WhatsApp size={18} strokeWidth={1.8} />
          Hacer pedido
        </button>
      )}
      <span className="pn-cart-note">Se abre WhatsApp con la lista lista para enviar. Precios de referencia: se confirman en el local.</span>
    </>
  );
}

export default function Catalogo() {
  const [searchParams] = useSearchParams();
  const productoParam = searchParams.get('producto');

  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState('');
  const [sheet, setSheet] = useState(false);
  const [catalogo, setCatalogo] = useState(catalogoStatic);
  const [cargando, setCargando] = useState(Boolean(SB_URL && SB_KEY));
  const [highlighted, setHighlighted] = useState(null);
  const { qty, sumar: sumarBase, quitar } = usePedido();
  const cardRefs = useRef({});
  const didHighlight = useRef(false);

  const sumar = useCallback((nombre, delta) => {
    sumarBase(nombre, delta);
    if (delta > 0) registrarPopular(nombre);
  }, [sumarBase]);

  useEffect(() => {
    document.title = 'Catálogo — Portal Natural';
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!SB_URL || !SB_KEY) return;
    fetch(
      `${SB_URL}/rest/v1/productos?activo=eq.true&select=id,nombre,categoria,precio,unidad,venta_por,imagen_url,descripcion,destacado&order=nombre`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    )
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCatalogo(data); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  // Highlight del producto llegado desde la landing.
  useEffect(() => {
    if (!productoParam || cargando || didHighlight.current) return;
    const prod = catalogo.find((p) => p.id === productoParam || p.nombre === productoParam);
    if (!prod) return;
    didHighlight.current = true;
    if (prod.categoria && prod.categoria !== 'Todos') setCat(prod.categoria);

    requestAnimationFrame(() => {
      const el = cardRefs.current[prod.nombre];
      if (!el) return;
      const navH = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      setHighlighted(prod.nombre);
      el.focus({ preventScroll: true });
      setTimeout(() => setHighlighted(null), 1500);
    });
  }, [productoParam, cargando, catalogo]);

  useEffect(() => {
    if (!sheet) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSheet(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sheet]);

  const categorias = useMemo(() => {
    const cats = [...new Set(catalogo.map((p) => p.categoria).filter(Boolean))].sort();
    return ['Todos', ...cats];
  }, [catalogo]);

  useEffect(() => {
    if (cat !== 'Todos' && !categorias.includes(cat)) setCat('Todos');
  }, [categorias, cat]);

  const lista = useMemo(() => {
    const nq = normalizar(q).trim();
    let arr = catalogo.filter(
      (p) => (cat === 'Todos' || p.categoria === cat) && (!nq || normalizar(`${p.nombre} ${p.categoria} ${p.descripcion}`).includes(nq)),
    );
    if (orden === 'precio') {
      arr = [...arr].sort((a, b) => precioPresentacion(a.precio, a.venta_por) - precioPresentacion(b.precio, b.venta_por));
    } else if (orden === 'popular') {
      const pop = leerPopular();
      arr = [...arr].sort((a, b) => (pop[b.nombre] || 0) - (pop[a.nombre] || 0));
    } else if (orden === 'destacados') {
      arr = [...arr].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    }
    return arr;
  }, [catalogo, cat, q, orden]);

  // Items del carrito: pasos × venta_por = cantidad real; subtotal = precio × cantidad real.
  const items = catalogo
    .filter((p) => qty[p.nombre] > 0)
    .map((p) => {
      const pasos = qty[p.nombre];
      const vp = p.venta_por ?? 1;
      return { ...p, pasos, subtotal: p.precio * pasos * vp };
    });
  const total = items.reduce((acc, it) => acc + it.subtotal, 0);

  return (
    <div className="pn-page pn-catalog-page">
      <Nav variant="catalog" />
      <main>
        <section className="pn-cat-header">
          <Link className="pn-back" to="/">
            <ArrowLeft size={15} />
            Volver
          </Link>
          <h1 className="pn-cat-title">Catálogo <em>completo</em></h1>
          <p className="pn-cat-lead">
            Armá tu pedido y lo dejamos preparado para que lo retires cuando quieras. Si no encontrás algo, consultanos: conseguimos pedidos especiales.
          </p>
        </section>

        <section className="pn-filters" aria-label="Buscar y filtrar">
          <div className="pn-search">
            <Search size={19} className="pn-search-icon" />
            <label htmlFor="pn-buscar" className="sr-only">Buscar productos</label>
            <input
              id="pn-buscar"
              className="pn-search-input"
              type="search"
              placeholder="Buscar productos, categorías…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
            />
            {q && (
              <button type="button" className="pn-x" onClick={() => setQ('')} aria-label="Borrar búsqueda">
                <Close size={17} />
              </button>
            )}
          </div>
          <div className="pn-chips" role="group" aria-label="Filtrar y ordenar">
            {categorias.map((c) => (
              <button key={c} type="button" className={`pn-chip${c === cat ? ' is-active' : ''}`} aria-pressed={c === cat} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
            <span className="pn-chips-sep" aria-hidden="true" />
            <select
              className="pn-chip pn-chip-sort"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar por"
            >
              <option value="">A – Z</option>
              <option value="precio">Menor precio</option>
              <option value="popular">Más pedidos</option>
              <option value="destacados">Destacados</option>
            </select>
          </div>
        </section>

        <section className="pn-cat-content">
          <div className="pn-cat-results">
            <span className="pn-cat-count" aria-live="polite">
              {cargando ? 'Cargando…' : lista.length === 1 ? '1 producto' : `${lista.length} productos`}
            </span>
            <div className="pn-product-grid">
              {lista.map((p, i) => (
                <ProductCard
                  key={p.nombre}
                  p={p}
                  i={i}
                  pasos={qty[p.nombre] || 0}
                  onSumar={sumar}
                  highlighted={highlighted === p.nombre}
                  cardRef={(el) => { cardRefs.current[p.nombre] = el; }}
                />
              ))}
            </div>
            {!cargando && lista.length === 0 && (
              <div className="pn-empty">
                <span className="pn-empty-title">No encontramos ese producto</span>
                <span>Probá con otra palabra o consultanos por mensaje.</span>
              </div>
            )}
          </div>

          <aside className="pn-cart" aria-label="Tu pedido">
            <Pedido items={items} total={total} onQuitar={quitar} />
          </aside>
        </section>
      </main>

      <footer className="pn-cat-footer">
        <div className="pn-cat-footer-copy">
          <span className="pn-cat-footer-title">¿No encontrás lo que buscabas?</span>
          <p>Escribinos a {site.telefono.replace(/^\[T/, '[t')} y lo conseguimos para tu próxima visita.</p>
        </div>
        <Link className="pn-btn pn-btn-primary pn-btn-lg" to="/#contacto">Ir a contacto</Link>
      </footer>

      {items.length > 0 && !sheet && (
        <button type="button" className="pn-cart-bar" onClick={() => setSheet(true)}>
          <span className="pn-cart-count">{items.length}</span>
          <span>Ver pedido</span>
          <strong>{fmtPrecio(total)}</strong>
        </button>
      )}
      {sheet && (
        <div className="pn-sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div className="pn-sheet pn-cart" role="dialog" aria-modal="true" aria-label="Tu pedido">
            <Pedido items={items} total={total} onQuitar={quitar} onClose={() => setSheet(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

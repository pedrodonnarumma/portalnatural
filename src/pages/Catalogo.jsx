import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { ArrowLeft, Bag, Close, Minus, Plus, ProductIcon, Search, WhatsApp } from '../components/icons.jsx';
import { catalogo, categorias } from '../data/products.js';
import { site, showPrices } from '../data/site.js';
import { fmtPrecio, normalizar } from '../lib/format.js';
import { linkWhatsApp, mensajeWhatsApp, usePedido } from '../lib/pedido.js';

const TONOS = ['tint-2', 'tint'];

function ProductCard({ p, i, cantidad, onSumar }) {
  return (
    <article className="pn-card pn-product">
      <div className={`pn-thumb pn-tone-${TONOS[i % 2]}`}>
        {p.foto ? <img src={p.foto} alt="" /> : <ProductIcon name="hoja" className="pn-thumb-icon" />}
      </div>
      <div className="pn-product-body">
        <span className="pn-card-cat">{p.categoria}</span>
        <h3 className="pn-card-name">{p.nombre}</h3>
        <p className="pn-card-desc">{p.descripcion}</p>
        <div className="pn-product-price">
          <span className="pn-price">{showPrices ? fmtPrecio(p.precio) : 'Consultá el precio'}</span>
          <span className="pn-unit">/ {p.unidad}</span>
        </div>
        {cantidad > 0 ? (
          <div className="pn-stepper">
            <button type="button" className="pn-step" onClick={() => onSumar(p.nombre, -1)} aria-label={`Quitar una unidad de ${p.nombre}`}>
              <Minus size={15} />
            </button>
            <span className="pn-step-qty" aria-live="polite">{cantidad}</span>
            <button type="button" className="pn-step" onClick={() => onSumar(p.nombre, 1)} aria-label={`Agregar una unidad de ${p.nombre}`}>
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
            {items.map((it) => (
              <li key={it.nombre} className="pn-cart-row">
                <div className="pn-cart-row-text">
                  <span className="pn-cart-row-name">{it.nombre}</span>
                  <span className="pn-cart-row-detail">{it.cantidad} × {it.unidad} · {fmtPrecio(it.precio)}</span>
                </div>
                <span className="pn-cart-row-sub">{fmtPrecio(it.subtotal)}</span>
                <button type="button" className="pn-x" onClick={() => onQuitar(it.nombre)} aria-label={`Quitar ${it.nombre} del pedido`}>
                  <Close size={15} />
                </button>
              </li>
            ))}
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
  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(false);
  const { qty, sumar, quitar } = usePedido();

  useEffect(() => {
    document.title = 'Catálogo — Portal Natural';
    window.scrollTo(0, 0);
  }, []);

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

  const lista = useMemo(() => {
    const nq = normalizar(q).trim();
    return catalogo.filter(
      (p) => (cat === 'Todos' || p.categoria === cat) && (!nq || normalizar(`${p.nombre} ${p.categoria} ${p.descripcion}`).includes(nq)),
    );
  }, [cat, q]);

  const items = catalogo
    .filter((p) => qty[p.nombre] > 0)
    .map((p) => ({ ...p, cantidad: qty[p.nombre], subtotal: p.precio * qty[p.nombre] }));
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
          <div className="pn-chips" role="group" aria-label="Filtrar por categoría">
            {categorias.map((c) => (
              <button key={c} type="button" className={`pn-chip${c === cat ? ' is-active' : ''}`} aria-pressed={c === cat} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </section>

        <section className="pn-cat-content">
          <div className="pn-cat-results">
            <span className="pn-cat-count" aria-live="polite">{lista.length === 1 ? '1 producto' : `${lista.length} productos`}</span>
            <div className="pn-product-grid">
              {lista.map((p, i) => (
                <ProductCard key={p.nombre} p={p} i={i} cantidad={qty[p.nombre] || 0} onSumar={sumar} />
              ))}
            </div>
            {lista.length === 0 && (
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

      {/* Móvil y tablet: barra fija con el pedido y hoja desplegable */}
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

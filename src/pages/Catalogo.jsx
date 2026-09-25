import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav.jsx';
import { ArrowLeft, Bag, Close, Minus, Plus, ProductIcon, Search, WhatsApp } from '../components/icons.jsx';
import { catalogo as catalogoStatic } from '../data/products.js';
import { site, showPrices } from '../data/site.js';
import { fmtPrecio, normalizar } from '../lib/format.js';
import { etiquetaCantidad, etiquetaPresentacion, precioPresentacion, precioReferencia } from '../lib/precios.js';
import {
  guardarContacto, leerContacto, linkWhatsApp,
  mensajeWhatsApp, mensajeWhatsAppConfirmado, usePedido,
} from '../lib/pedido.js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IS_DEV = import.meta.env.DEV;
const useSB = Boolean(SB_URL && SB_KEY);
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

function ProductCard({ p, i, pasos, onSumar }) {
  const vp = p.venta_por ?? 1;
  const efectivo = p.precio_promo ?? p.precio;   // precio que paga el cliente
  const precioPublico = precioPresentacion(efectivo, vp);
  const etiqUnidad = etiquetaPresentacion(p.unidad, vp);
  const ref = precioReferencia(efectivo, p.unidad, vp);

  return (
    <article className="pn-card pn-product">
      <div className={`pn-thumb pn-tone-${TONOS[i % 2]}`}>
        {(p.foto || p.imagen_url)
          ? <img src={p.foto ?? p.imagen_url} alt="" />
          : <ProductIcon name={p.icono ?? 'hoja'} className="pn-thumb-icon" />}
      </div>
      <div className="pn-product-body">
        <div className="pn-card-cat-row">
          <span className="pn-card-cat">{p.categoria}</span>
          {p.precio_promo != null && <span className="pn-promo-badge">Promo</span>}
        </div>
        <h3 className="pn-card-name">{p.nombre}</h3>
        {p.descripcion && <p className="pn-card-desc">{p.descripcion}</p>}
        <div className="pn-product-price">
          {showPrices ? (
            <>
              {p.precio_promo != null && (
                <span className="pn-price-lista">{fmtPrecio(precioPresentacion(p.precio, vp))}</span>
              )}
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

/* ─── Modal confirmar pedido ─── */
function ConfirmarPedido({ items, total, catalogo, onClose, onConfirmado }) {
  const contacto = leerContacto();
  const [nombre, setNombre] = useState(contacto.nombre ?? '');
  const [telefono, setTelefono] = useState(contacto.telefono ?? '');
  const [errNombre, setErrNombre] = useState('');
  const [errTel, setErrTel] = useState('');
  const [estado, setEstado] = useState('idle'); // idle | enviando | exito | error
  const [errEnvio, setErrEnvio] = useState('');
  const [pedidoOk, setPedidoOk] = useState(null); // { numero, waHref }
  const firstRef = useRef(null);
  const waRef = useRef(null);

  // Foco inicial y trap
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    if (estado === 'exito') {
      waRef.current?.focus();
    }
  }, [estado]);

  // Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Trap de foco dentro del modal
  const dialogRef = useRef(null);
  function trapFocus(e) {
    if (!dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
  }

  function validate() {
    let ok = true;
    if (nombre.trim().length < 2 || nombre.trim().length > 80) {
      setErrNombre('Ingresá tu nombre (entre 2 y 80 caracteres).');
      ok = false;
    } else setErrNombre('');
    const digits = telefono.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 20) {
      setErrTel('Ingresá un teléfono válido (8–20 dígitos).');
      ok = false;
    } else setErrTel('');
    return ok;
  }

  async function handleConfirmar(e) {
    e.preventDefault();
    if (!validate()) return;

    guardarContacto(nombre.trim(), telefono.trim());
    setEstado('enviando');
    setErrEnvio('');

    try {
      const payload = {
        p_nombre: nombre.trim(),
        p_telefono: telefono.trim(),
        p_items: items.map((it) => ({
          producto_id: catalogo.find((p) => p.nombre === it.nombre)?.id,
          cantidad: it.pasos * (it.venta_por ?? 1),
        })).filter((x) => x.producto_id),
      };

      const res = await fetch(`${SB_URL}/rest/v1/rpc/crear_pedido_web`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.hint || `Error ${res.status}`);
      }

      const [row] = await res.json();
      const waHref = linkWhatsApp(mensajeWhatsAppConfirmado(nombre.trim(), row.numero, items, row.total));

      setPedidoOk({ numero: row.numero, waHref });
      setEstado('exito');
      onConfirmado(); // vacía el carrito

      // Intento de apertura automática (puede ser bloqueado por el navegador)
      try { window.open(waHref, '_blank', 'noopener'); } catch {}
    } catch (err) {
      setEstado('error');
      setErrEnvio(err.message || 'No pudimos enviar el pedido. Revisá tu conexión y volvé a intentar.');
    }
  }

  return (
    <div
      className="pn-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className="pn-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmá tu pedido"
        onKeyDown={trapFocus}
      >
        <div className="pn-modal-head">
          <h2 className="pn-modal-title">
            {estado === 'exito' ? `¡Pedido #${pedidoOk.numero} confirmado!` : 'Confirmá tu pedido'}
          </h2>
          <button type="button" className="pn-x pn-modal-close" onClick={onClose} aria-label="Cerrar">
            <Close size={20} />
          </button>
        </div>

        {estado === 'exito' ? (
          <div className="pn-modal-body pn-modal-exito">
            <p className="pn-modal-exito-text">
              Tu pedido quedó registrado. Envianos el detalle por WhatsApp para coordinar el retiro.
            </p>
            <a
              ref={waRef}
              href={pedidoOk.waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="pn-cart-cta pn-modal-wa"
            >
              <WhatsApp size={18} strokeWidth={1.8} />
              Enviar por WhatsApp
            </a>
            <button type="button" className="pn-btn pn-btn-ghost pn-btn-md pn-modal-cerrar" onClick={onClose}>
              Cerrar
            </button>
          </div>
        ) : (
          <form className="pn-modal-body" onSubmit={handleConfirmar} noValidate>
            {/* Resumen de ítems */}
            <ul className="pn-modal-items">
              {items.map((it) => {
                const vp = it.venta_por ?? 1;
                return (
                  <li key={it.nombre} className="pn-modal-item">
                    <span className="pn-modal-item-nombre">{it.nombre}</span>
                    <span className="pn-modal-item-cant">{etiquetaCantidad(it.pasos, it.unidad, vp)}</span>
                    <span className="pn-modal-item-sub">{fmtPrecio(it.subtotal)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="pn-modal-total">
              <span>Total estimado</span>
              <strong>{fmtPrecio(total)}</strong>
            </div>
            <hr className="pn-modal-rule" />

            {/* Datos de contacto */}
            <div className="pn-modal-fields">
              <div className="pn-modal-field">
                <label htmlFor="pn-modal-nombre">Nombre</label>
                <input
                  ref={firstRef}
                  id="pn-modal-nombre"
                  className={`pn-modal-input${errNombre ? ' is-invalid' : ''}`}
                  type="text"
                  autoComplete="name"
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setErrNombre(''); }}
                  aria-invalid={!!errNombre}
                  aria-describedby={errNombre ? 'pn-modal-nombre-err' : undefined}
                />
                {errNombre && <p id="pn-modal-nombre-err" className="pn-modal-err" role="alert">{errNombre}</p>}
              </div>
              <div className="pn-modal-field">
                <label htmlFor="pn-modal-tel">Teléfono</label>
                <input
                  id="pn-modal-tel"
                  className={`pn-modal-input${errTel ? ' is-invalid' : ''}`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={telefono}
                  onChange={(e) => { setTelefono(e.target.value); setErrTel(''); }}
                  aria-invalid={!!errTel}
                  aria-describedby={errTel ? 'pn-modal-tel-err' : undefined}
                />
                {errTel && <p id="pn-modal-tel-err" className="pn-modal-err" role="alert">{errTel}</p>}
              </div>
            </div>

            <p className="pn-modal-nota">Precios de referencia: se confirman en el local.</p>

            {errEnvio && <p className="pn-modal-err pn-modal-err-envio" role="alert">{errEnvio}</p>}

            <div className="pn-modal-actions">
              <button type="button" className="pn-btn pn-btn-ghost pn-btn-md" onClick={onClose} disabled={estado === 'enviando'}>
                Volver
              </button>
              <button type="submit" className="pn-btn pn-btn-primary pn-btn-md" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Confirmando…' : 'Confirmar pedido'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Pedido({ items, total, catalogo, onQuitar, onClose, onHacerPedido }) {
  const lleno = items.length > 0;
  const usandoSB = Boolean(SB_URL && SB_KEY);

  // Fallback: si no hay Supabase, abrir WhatsApp directo
  const href = (!usandoSB && lleno) ? linkWhatsApp(mensajeWhatsApp(items, total)) : undefined;

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
              const precLabel = `${fmtPrecio(precioPresentacion(it.efectivo, vp))} / ${etiquetaPresentacion(it.unidad, vp)}`;
              return (
                <li key={it.nombre} className="pn-cart-row">
                  <div className="pn-cart-row-text">
                    <span className="pn-cart-row-name">{it.nombre}</span>
                    <span className="pn-cart-row-detail">
                      {it.unidad === 'un' ? cantLabel : `${cantLabel} · ${precLabel}`}
                      {it.precio_promo != null && <span className="pn-promo-badge pn-promo-badge-sm">Promo</span>}
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
      {lleno && usandoSB && (
        <button type="button" className="pn-cart-cta" onClick={onHacerPedido}>
          <WhatsApp size={18} strokeWidth={1.8} />
          Hacer pedido
        </button>
      )}
      {lleno && !usandoSB && (
        <a className="pn-cart-cta" href={href} target="_blank" rel="noopener noreferrer">
          <WhatsApp size={18} strokeWidth={1.8} />
          Hacer pedido
        </a>
      )}
      {!lleno && (
        <button type="button" className="pn-cart-cta" disabled>
          <WhatsApp size={18} strokeWidth={1.8} />
          Hacer pedido
        </button>
      )}
      <span className="pn-cart-note">
        {usandoSB
          ? 'Confirmá el pedido y coordiná el retiro por WhatsApp. Precios de referencia: se confirman en el local.'
          : 'Se abre WhatsApp con la lista lista para enviar. Precios de referencia: se confirman en el local.'}
      </span>
    </>
  );
}

export default function Catalogo() {
  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState('');
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const [catalogo, setCatalogo] = useState(IS_DEV || !useSB ? catalogoStatic : []);
  const [cargando, setCargando] = useState(useSB);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const { qty, sumar: sumarBase, quitar, vaciar } = usePedido();

  const sumar = useCallback((nombre, delta) => {
    sumarBase(nombre, delta);
    if (delta > 0) registrarPopular(nombre);
  }, [sumarBase]);

  useEffect(() => {
    document.title = 'Catálogo — Portal Natural';
    window.scrollTo(0, 0);
    if (!SB_URL || !SB_KEY) {
      console.warn('[Portal Natural] Supabase no configurado: el pedido irá directo a WhatsApp.');
    }
  }, []);

  useEffect(() => {
    if (!useSB) return;
    setCargando(true);
    setError(false);
    fetch(
      `${SB_URL}/rest/v1/catalogo_publico?select=id,nombre,categoria,categoria_orden,precio,precio_promo,unidad,venta_por,imagen_url,descripcion,destacado&order=nombre`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setCatalogo(data);
        else if (!IS_DEV) setError(true);
      })
      .catch((err) => {
        console.error('[Portal Natural] Error cargando catálogo:', err);
        if (!IS_DEV) setError(true);
      })
      .finally(() => setCargando(false));
  }, [retry]);

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
    const ordenMap = {};
    catalogo.forEach((p) => {
      if (p.categoria && !(p.categoria in ordenMap)) {
        ordenMap[p.categoria] = p.categoria_orden ?? 9999;
      }
    });
    const cats = [...new Set(catalogo.map((p) => p.categoria).filter(Boolean))]
      .sort((a, b) => ordenMap[a] - ordenMap[b] || a.localeCompare(b));
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
      arr = [...arr].sort((a, b) => precioPresentacion(a.precio_promo ?? a.precio, a.venta_por) - precioPresentacion(b.precio_promo ?? b.precio, b.venta_por));
    } else if (orden === 'popular') {
      const pop = leerPopular();
      arr = [...arr].sort((a, b) => (pop[b.nombre] || 0) - (pop[a.nombre] || 0));
    } else if (orden === 'destacados') {
      arr = [...arr].sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
    }
    return arr;
  }, [catalogo, cat, q, orden]);

  const items = catalogo
    .filter((p) => qty[p.nombre] > 0)
    .map((p) => {
      const pasos = qty[p.nombre];
      const vp = p.venta_por ?? 1;
      const efectivo = p.precio_promo ?? p.precio;
      return { ...p, pasos, efectivo, subtotal: efectivo * pasos * vp };
    });
  const total = items.reduce((acc, it) => acc + it.subtotal, 0);

  const waFooter = site.whatsapp
    ? `https://wa.me/${site.whatsapp}`
    : `https://wa.me/?text=${encodeURIComponent('¡Hola, Portal Natural!')}`;

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
                />
              ))}
            </div>
            {!cargando && error && (
              <div className="pn-cat-error">
                <p>No pudimos cargar el catálogo. Probá de nuevo en un rato.</p>
                <button type="button" className="pn-btn pn-btn-ghost pn-btn-md" onClick={() => setRetry((n) => n + 1)}>
                  Reintentar
                </button>
              </div>
            )}
            {!cargando && !error && lista.length === 0 && (
              <div className="pn-empty">
                <span className="pn-empty-title">No encontramos ese producto</span>
                <span>Probá con otra palabra o consultanos por mensaje.</span>
              </div>
            )}
          </div>

          <aside className="pn-cart" aria-label="Tu pedido">
            <Pedido
              items={items}
              total={total}
              catalogo={catalogo}
              onQuitar={quitar}
              onHacerPedido={() => setModal(true)}
            />
          </aside>
        </section>
      </main>

      <footer className="pn-cat-footer">
        <div className="pn-cat-footer-copy">
          <span className="pn-cat-footer-title">¿No encontrás lo que buscabas?</span>
          <p>
            Escribinos a{' '}
            <a href={waFooter} target="_blank" rel="noopener noreferrer">
              {site.telefono}
            </a>
            {' '}y lo conseguimos para tu próxima visita.
          </p>
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
            <Pedido
              items={items}
              total={total}
              catalogo={catalogo}
              onQuitar={quitar}
              onClose={() => setSheet(false)}
              onHacerPedido={() => { setSheet(false); setModal(true); }}
            />
          </div>
        </div>
      )}

      {modal && (
        <ConfirmarPedido
          items={items}
          total={total}
          catalogo={catalogo}
          onClose={() => setModal(false)}
          onConfirmado={() => { vaciar(); setModal(false); setSheet(false); }}
        />
      )}
    </div>
  );
}

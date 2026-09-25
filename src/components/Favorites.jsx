import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ProductIcon } from './icons.jsx';
import { destacados } from '../data/products.js';
import { showPrices } from '../data/site.js';
import { fmtPrecio } from '../lib/format.js';
import { etiquetaPresentacion, precioPresentacion, precioReferencia } from '../lib/precios.js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const IS_DEV = import.meta.env.DEV;
const TONOS = ['tint-2', 'tint'];

export default function Favorites() {
  const [items, setItems] = useState(destacados);

  useEffect(() => {
    if (!SB_URL || !SB_KEY) return;
    fetch(
      `${SB_URL}/rest/v1/catalogo_publico?destacado=eq.true&select=id,nombre,categoria,precio,precio_promo,unidad,venta_por,imagen_url,descripcion&order=nombre&limit=8`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { if (Array.isArray(data) && data.length > 0) setItems(data); })
      .catch((err) => {
        console.error('[Portal Natural] Error cargando destacados:', err);
        if (!IS_DEV) setItems([]);
      });
  }, []);

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
        {items.map((p, i) => {
          const vp = p.venta_por ?? 1;
          const unidad = p.unidad ?? 'un';
          const tono = p.tono ?? TONOS[i % 2];
          const tonoMovil = p.tonoMovil ?? null;
          const destino = '/catalogo';
          const efectivo = p.precio_promo ?? p.precio;

          return (
            <Link
              key={p.nombre}
              to={destino}
              className={`pn-card pn-fav${i >= 4 ? ' pn-d' : ''}`}
              aria-label={`Ver ${p.nombre} en el catálogo`}
            >
              <div className={`pn-thumb pn-tone-${tono}${tonoMovil ? ` pn-tone-m-${tonoMovil}` : ''}`}>
                {(p.foto || p.imagen_url)
                  ? <img src={p.foto ?? p.imagen_url} alt="" />
                  : <ProductIcon name={p.icono ?? 'hoja'} className="pn-thumb-icon" />}
              </div>
              <div className="pn-fav-body">
                <div className="pn-card-cat-row pn-d">
                  <span className="pn-card-cat">{p.categoria}</span>
                  {p.precio_promo != null && <span className="pn-promo-badge">Promo</span>}
                </div>
                <h3 className="pn-card-name">
                  {p.nombreCorto
                    ? <><span className="pn-d">{p.nombre}</span><span className="pn-m">{p.nombreCorto}</span></>
                    : p.nombre}
                </h3>
                {(p.detalle || p.descripcion) && (
                  <p className="pn-card-desc pn-d">{p.detalle ?? p.descripcion}</p>
                )}
                {showPrices && efectivo != null ? (
                  <div className="pn-fav-price">
                    {p.precio_promo != null && (
                      <span className="pn-price-lista">{fmtPrecio(precioPresentacion(p.precio, vp))}</span>
                    )}
                    <span className="pn-price">{fmtPrecio(precioPresentacion(efectivo, vp))}</span>
                    <span className="pn-unit">/ {etiquetaPresentacion(unidad, vp)}</span>
                  </div>
                ) : (
                  <span className="pn-price">{showPrices ? 'Consultá el precio' : 'Consultá el precio'}</span>
                )}
                {showPrices && precioReferencia(efectivo, unidad, vp) && (
                  <span className="pn-price-ref">{precioReferencia(efectivo, unidad, vp)}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <Link className="pn-btn pn-btn-ghost pn-btn-md pn-btn-block pn-m" to="/catalogo">Ver catálogo completo</Link>
    </section>
  );
}

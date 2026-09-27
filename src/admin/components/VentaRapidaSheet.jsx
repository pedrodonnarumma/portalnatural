import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtMoney, fmtQty, MEDIOS_PAGO } from '../lib/format.js';
import { useVentaForm } from '../lib/ventaHelpers.js';
import { ErrorBox, SearchBox, Spinner } from './ui.jsx';
import { etiquetaPresentacion, precioPresentacion } from '../../lib/precios.js';
import { toMendozaDateStr, startOfDayMendoza, endOfDayMendoza, subDays } from '../lib/fechaMendoza.js';
import { usePendientes } from '../PendientesContext.jsx';
import { useToast } from './ui.jsx';

export default function VentaRapidaSheet({ onClose }) {
  const toast = useToast();
  const { refresh: refreshPendientes } = usePendientes();
  const sheetRef = useRef(null);
  const form = useVentaForm();
  const { productos, q, setQ, results, items, add, update, remove,
          medio, setMedio, total, valid, busy, error, submit } = form;

  const [topNombres, setTopNombres] = useState([]);

  useEffect(() => {
    const hoy = toMendozaDateStr();
    const d30 = subDays(hoy, 29);
    supabase.rpc('top_productos', {
      desde: startOfDayMendoza(d30),
      hasta: endOfDayMendoza(hoy),
      limite: 8,
    }).then(({ data }) => {
      if (data) setTopNombres(data.map((d) => d.nombre));
    });
  }, []);

  const pills = useMemo(() => {
    if (!productos || !topNombres.length) return [];
    return topNombres
      .map((nombre) => productos.find((p) => p.nombre === nombre))
      .filter(Boolean)
      .slice(0, 6);
  }, [productos, topNombres]);

  // Focus trap + Escape
  useEffect(() => {
    const prev = document.activeElement;
    const el = sheetRef.current;
    if (!el) return;
    const getFocusable = () => [...el.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    )];
    getFocusable()[0]?.focus();

    const trapTab = (e) => {
      if (e.key !== 'Tab') return;
      const els = getFocusable();
      if (!els.length) return;
      if (e.shiftKey && document.activeElement === els[0]) {
        e.preventDefault(); els[els.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === els[els.length - 1]) {
        e.preventDefault(); els[0].focus();
      }
    };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('keydown', trapTab);
      document.removeEventListener('keydown', esc);
      prev?.focus();
    };
  }, [onClose]);

  async function handleCobrar() {
    const result = await submit('pagada');
    if (!result) return;
    toast(`Venta #${result.numero} registrada`);
    refreshPendientes();
    onClose();
  }

  async function handlePendiente() {
    const result = await submit('pendiente');
    if (!result) return;
    toast(`Pedido #${result.numero} guardado como pendiente`);
    refreshPendientes();
    onClose();
  }

  return (
    <div
      className="admin-sheet-bg"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="admin-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Nueva venta"
        ref={sheetRef}
      >
        <div className="admin-sheet-grab" />
        <div className="vr-head">
          <h2 className="vr-title">Nueva venta</h2>
          <button type="button" className="btn btn-icon btn-secondary" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <ErrorBox error={error} />
        <SearchBox value={q} onChange={setQ} placeholder="Buscar producto o código…" />
        {!productos && <Spinner />}

        {/* Pills de productos frecuentes */}
        {pills.length > 0 && (
          <div className="vr-pills">
            {pills.map((p) => (
              <button
                key={p.id}
                type="button"
                className="vr-pill"
                onClick={() => add(p)}
                aria-label={`Agregar ${p.nombre}`}
              >
                + {p.nombre}
              </button>
            ))}
          </div>
        )}

        {/* Resultados de búsqueda */}
        {q.trim() && productos && (
          <div className="vr-results">
            {results.length === 0 && <p className="text-muted vr-none">Sin coincidencias.</p>}
            {results.map((p) => (
              <button key={p.id} type="button" className="vr-result" onClick={() => add(p)}>
                <span className="vr-result-name">{p.nombre}</span>
                <span className="text-muted vr-result-meta">
                  {fmtMoney(precioPresentacion(p.precio, p.venta_por))} / {etiquetaPresentacion(p.unidad, p.venta_por)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Carrito con steppers */}
        {items.length > 0 && (
          <div className="vr-cart">
            {items.map((x, i) => {
              const cant = Number(x.cantidad);
              const step = x.venta_por;
              const over = cant > x.stock;
              return (
                <div key={x.producto_id} className="vr-line">
                  <div className="vr-line-info">
                    <b>{x.nombre}</b>
                    <span className="text-muted">
                      {fmtMoney(precioPresentacion(x.precio_unitario, x.venta_por))} / {etiquetaPresentacion(x.unidad, x.venta_por)}
                    </span>
                    {over && <span className="stock-low">Supera el stock ({fmtQty(x.stock, x.unidad)})</span>}
                  </div>
                  <div className="vr-stepper">
                    <button
                      type="button"
                      aria-label="Menos"
                      onClick={() => {
                        const next = r3(cant - step);
                        if (next <= 0) remove(i);
                        else update(i, 'cantidad', next);
                      }}
                    >−</button>
                    <span className="num">{fmtQty(cant, x.unidad)}</span>
                    <button
                      type="button"
                      aria-label="Más"
                      onClick={() => update(i, 'cantidad', r3(cant + step))}
                    >+</button>
                  </div>
                </div>
              );
            })}
            <div className="vr-line vr-total-row">
              <span>Total</span>
              <b className="num vr-total-val">{fmtMoney(total, true)}</b>
            </div>
          </div>
        )}

        {/* Medio de pago */}
        {items.length > 0 && (
          <div className="vr-medios">
            {MEDIOS_PAGO.filter((m) => m.value !== 'otro').map((m) => (
              <button
                key={m.value}
                type="button"
                className={`vr-pill${medio === m.value ? ' vr-pill-on' : ''}`}
                onClick={() => setMedio(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="vr-cobrar"
          onClick={handleCobrar}
          disabled={!valid || busy}
        >
          {busy ? 'Registrando…' : `Cobrar ${fmtMoney(total)}`}
        </button>
        <button
          type="button"
          className="vr-pendiente"
          onClick={handlePendiente}
          disabled={!valid || busy}
        >
          Guardar como pedido pendiente
        </button>
      </div>
    </div>
  );
}

function r3(n) {
  return Math.round(n * 1000) / 1000;
}

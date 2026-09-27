import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Package, Megaphone, ExternalLink, ShoppingBasket } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtMoney, fmtDate, MEDIOS_PAGO } from '../lib/format.js';
import { toMendozaDateStr, startOfDayMendoza, endOfDayMendoza, subDays, addDays } from '../lib/fechaMendoza.js';
import { estadoLocal } from '../../lib/horario.js';
import { ErrorBox, Modal, Spinner } from '../components/ui.jsx';
import { marcarVentaPagada } from '../lib/ventaHelpers.js';
import { usePendientes } from '../PendientesContext.jsx';
import { useAuth } from '../AuthProvider.jsx';
import { useToast } from '../components/ui.jsx';
import { NuevaVenta } from './Ventas.jsx';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function saludoPeriodo() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Mendoza',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  if (h < 12) return 'Buen día';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function tiempoRelativo(fechaISO) {
  if (!fechaISO) return '';
  const diff = Date.now() - new Date(fechaISO).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) {
    const d = new Date(fechaISO);
    return `ayer ${d.getHours()}.${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return fmtDate(fechaISO);
}

function esPedidoViejo(fechaISO) {
  return Date.now() - new Date(fechaISO).getTime() > 86400000;
}

function nombrePedido(v) {
  return v.cliente?.nombre ?? v.contacto_nombre ?? 'Mostrador';
}

function telPedido(v) {
  return v.contacto_telefono ?? v.cliente?.telefono ?? null;
}

function waUrl(tel, numero, total) {
  if (!tel) return null;
  let d = tel.replace(/\D/g, '');
  if (d.length < 6) return null;
  if (d.startsWith('0')) d = d.slice(1);
  if (!d.startsWith('54')) d = '549' + d;
  else if (!d.startsWith('549')) d = '549' + d.slice(2);
  const msg = encodeURIComponent(`Hola! Te escribimos desde Portal Natural sobre tu pedido #${numero}. Total: ${fmtMoney(total)}.`);
  return `https://wa.me/${d}?text=${msg}`;
}

function cantItems(v) {
  const c = v.venta_items;
  if (!c) return 0;
  return Number(Array.isArray(c) ? (c[0]?.count ?? 0) : (c ?? 0));
}

function pct(n) {
  if (n === null || n === undefined || !isFinite(n)) return null;
  return `${n >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(n))}%`;
}

function formatCompact(n) {
  const v = Number(n) || 0;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return fmtMoney(v);
}

// ── Componentes internos ────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="i-kpi">
      <div className="i-sk" style={{ height: 11, width: '55%', marginBottom: 10 }} />
      <div className="i-sk" style={{ height: 30, width: '80%', marginBottom: 8 }} />
      <div className="i-sk" style={{ height: 11, width: '65%' }} />
    </div>
  );
}

function PanelSkeleton({ rows = 3 }) {
  return (
    <section className="i-panel">
      <div className="i-sk" style={{ height: 20, width: '50%', marginBottom: 14 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="i-sk" style={{ height: 48, marginBottom: 8 }} />
      ))}
    </section>
  );
}

function SemanaChart({ data, hoy }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => Number(d.monto)), 1);
  const W = 360; const H = 140; const pb = 24; const pt = 18; const pl = 4; const pr = 4;
  const innerH = H - pt - pb;
  const step = (W - pl - pr) / data.length;
  const bw = Math.min(38, step * 0.56);

  function labelDia(f) {
    if (f === hoy) return 'Hoy';
    const [y, m, d] = f.split('-').map(Number);
    return DIAS[new Date(y, m - 1, d).getDay()];
  }

  return (
    <div className="i-chart" onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="i-chart-svg"
        role="img"
        aria-label={`Ventas de los últimos 7 días. ${data.map((d) => `${labelDia(d.fecha)}: ${fmtMoney(d.monto)}`).join('. ')}`}
      >
        {data.map((d, i) => {
          const monto = Number(d.monto);
          const h = (monto / max) * innerH;
          const x = pl + i * step + (step - bw) / 2;
          const top = pt + innerH - h;
          const isToday = d.fecha === hoy;
          const r = Math.min(4, h / 2);
          const path = h > 0.5
            ? `M${x},${pt + innerH}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${pt + innerH}Z`
            : null;
          return (
            <g
              key={d.fecha}
              tabIndex={0}
              aria-label={`${labelDia(d.fecha)}: ${fmtMoney(monto)}`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <rect x={pl + i * step} y={pt} width={step} height={innerH} fill="transparent" />
              {path && (
                <path
                  d={path}
                  className={`i-bar${isToday ? ' i-bar-today' : ''}${hover === i && !isToday ? ' i-bar-hover' : ''}`}
                />
              )}
              {!path && (
                <line
                  x1={x} x2={x + bw}
                  y1={pt + innerH} y2={pt + innerH}
                  stroke="var(--pn-line-control)" strokeWidth="2"
                />
              )}
              <text
                x={pl + i * step + step / 2}
                y={H - 6}
                textAnchor="middle"
                className={`i-bar-label${isToday ? ' i-bar-label-today' : ''}`}
              >
                {labelDia(d.fecha)}
              </text>
              {isToday && monto > 0 && (
                <text
                  x={pl + i * step + step / 2}
                  y={Math.max(pt + 12, top - 5)}
                  textAnchor="middle"
                  className="i-bar-value"
                >
                  {formatCompact(monto)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && data[hover] && (
        <div
          className="i-chart-tip"
          style={{ left: `${((pl + hover * step + step / 2) / W) * 100}%` }}
          aria-hidden="true"
        >
          <span>{labelDia(data[hover].fecha)}</span>
          <strong>{fmtMoney(data[hover].monto)}</strong>
        </div>
      )}
    </div>
  );
}

function PagarModal({ venta, onConfirm, onClose, busy }) {
  const [medio, setMedio] = useState('efectivo');
  return (
    <Modal title={`Cobrar pedido #${venta.numero}`} onClose={onClose}>
      <p className="dialog-body">Seleccioná el medio de pago para confirmar el cobro.</p>
      <div className="field" style={{ marginBottom: 4 }}>
        <label>Medio de pago</label>
        <select className="input" value={medio} onChange={(e) => setMedio(e.target.value)}>
          {MEDIOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={() => onConfirm(medio)} disabled={busy}>
          {busy ? '…' : 'Confirmar cobro'}
        </button>
      </div>
    </Modal>
  );
}

// ── Página principal ────────────────────────────────────────────────────────

export default function Inicio() {
  const { session } = useAuth();
  const { refresh: refreshPendientes } = usePendientes();
  const toast = useToast();
  const navigate = useNavigate();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errores, setErrores] = useState({});
  const [cobrandoVenta, setCobrandoVenta] = useState(null);
  const [pagandoBusy, setPagandoBusy] = useState(false);
  const [creatingVenta, setCreatingVenta] = useState(false);

  const nombre = session?.user?.user_metadata?.full_name
    || session?.user?.user_metadata?.nombre
    || session?.user?.email?.split('@')[0]
    || '';
  const localStatus = estadoLocal();

  const cargar = useCallback(async () => {
    setCargando(true);
    const hoy = toMendozaDateStr();
    const hoyStart = startOfDayMendoza(hoy);
    const hoyEnd = endOfDayMendoza(hoy);
    const d14 = subDays(hoy, 13);
    const semLarga = startOfDayMendoza(d14);
    const d7 = subDays(hoy, 6);
    const semActualStart = startOfDayMendoza(d7);
    const dDiaPasado = subDays(hoy, 7);
    const diaPasadoStart = startOfDayMendoza(dDiaPasado);
    const diaPasadoEnd = endOfDayMendoza(dDiaPasado);
    const tresD = addDays(hoy, 3);

    const [resHoy, resDiaPasado, pendientesRes, productosRes, ventasDiaRes, topRes, ultimasRes, promoRes] =
      await Promise.all([
        supabase.rpc('resumen_ventas', { desde: hoyStart, hasta: hoyEnd }),
        supabase.rpc('resumen_ventas', { desde: diaPasadoStart, hasta: diaPasadoEnd }),
        supabase
          .from('ventas')
          .select('id, numero, fecha, total, origen, contacto_nombre, contacto_telefono, cliente:clientes(nombre, telefono), venta_items(count)')
          .eq('estado', 'pendiente')
          .order('fecha', { ascending: true })
          .limit(200),
        supabase
          .from('productos')
          .select('id, nombre, stock, stock_minimo, unidad')
          .eq('activo', true)
          .order('stock'),
        supabase.rpc('ventas_por_dia', { desde: semLarga, hasta: hoyEnd }),
        supabase.rpc('top_productos', { desde: semActualStart, hasta: hoyEnd, limite: 5 }),
        supabase
          .from('ventas')
          .select('id, numero, fecha, medio_pago, total, contacto_nombre, cliente:clientes(nombre)')
          .eq('estado', 'pagada')
          .order('fecha', { ascending: false })
          .limit(5),
        supabase
          .from('promociones')
          .select('id, titulo, fecha_fin')
          .eq('activa', true)
          .not('fecha_fin', 'is', null)
          .gte('fecha_fin', hoy)
          .lte('fecha_fin', tresD)
          .order('fecha_fin', { ascending: true })
          .limit(1),
      ]);

    const errs = {};
    if (resHoy.error) errs.kpis = resHoy.error.message;
    if (pendientesRes.error) errs.pendientes = pendientesRes.error.message;
    if (productosRes.error) errs.stock = productosRes.error.message;
    if (ventasDiaRes.error) errs.semana = ventasDiaRes.error.message;
    if (topRes.error) errs.top = topRes.error.message;
    if (ultimasRes.error) errs.ultimas = ultimasRes.error.message;

    setErrores(errs);
    setDatos({
      resHoy: resHoy.data?.[0] ?? null,
      resDiaPasado: resDiaPasado.data?.[0] ?? null,
      pendientes: pendientesRes.data ?? [],
      productos: productosRes.data ?? [],
      ventasDia: ventasDiaRes.data ?? [],
      top: topRes.data ?? [],
      ultimas: ultimasRes.data ?? [],
      promo: promoRes.data?.[0] ?? null,
      hoyStr: hoy,
    });
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function confirmarCobro(medioPago) {
    if (!cobrandoVenta) return;
    setPagandoBusy(true);
    const { error: err } = await marcarVentaPagada(cobrandoVenta.id, medioPago);
    setPagandoBusy(false);
    if (err) { toast(err.message, 'error'); return; }
    toast(`Pedido #${cobrandoVenta.numero} marcado como pagado`);
    setCobrandoVenta(null);
    refreshPendientes();
    cargar();
  }

  // Datos derivados
  const pendientes = datos?.pendientes ?? [];
  const stockBajo = (datos?.productos ?? []).filter(
    (p) => Number(p.stock) <= Number(p.stock_minimo)
  );
  const sinStock = stockBajo.filter((p) => Number(p.stock) <= 0);
  const paraReponer = stockBajo.slice(0, 5);
  const totalPorCobrar = pendientes.reduce((a, v) => a + Number(v.total), 0);

  const ventasDia = datos?.ventasDia ?? [];
  const semanaActual = ventasDia.slice(7);
  const semanaAnterior = ventasDia.slice(0, 7);
  const totalSemActual = semanaActual.reduce((a, d) => a + Number(d.monto), 0);
  const totalSemAnterior = semanaAnterior.reduce((a, d) => a + Number(d.monto), 0);
  const variacionSemana = totalSemAnterior > 0
    ? ((totalSemActual - totalSemAnterior) / totalSemAnterior) * 100
    : null;

  const resHoy = datos?.resHoy;
  const resDiaPasado = datos?.resDiaPasado;
  const variacionDia = resDiaPasado?.total_vendido > 0
    ? ((Number(resHoy?.total_vendido) - Number(resDiaPasado?.total_vendido)) / Number(resDiaPasado?.total_vendido)) * 100
    : null;

  const top = datos?.top ?? [];
  const maxTopTotal = Math.max(...top.map((t) => Number(t.total)), 1);

  return (
    <div className="inicio-page">

      {/* ── Saludo ── */}
      <div className="i-hello">
        <div>
          <h1 className="i-saludo">
            {saludoPeriodo()}{nombre ? (<>, <em>{nombre}</em></>) : ''}
          </h1>
        </div>
        <span className={`i-status${localStatus.abierto ? '' : ' i-status-closed'}`}>
          <i aria-hidden="true" />
          <span>{localStatus.texto} · {localStatus.detalle}</span>
        </span>
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="i-quick">
        <button
          type="button"
          className="i-qa i-qa-primary"
          onClick={() => setCreatingVenta(true)}
        >
          <Plus size={18} aria-hidden="true" />
          Nueva venta
        </button>
        <Link to="/admin/stock" className="i-qa">
          <ShoppingBasket size={18} aria-hidden="true" />
          Cargar compra
        </Link>
        <Link to="/admin/articulos?nuevo=1" className="i-qa">
          <Package size={18} aria-hidden="true" />
          Nuevo artículo
        </Link>
        <Link to="/admin/promociones?nuevo=1" className="i-qa">
          <Megaphone size={18} aria-hidden="true" />
          Nueva promo
        </Link>
        <a href="/" target="_blank" rel="noreferrer" className="i-qa">
          <ExternalLink size={18} aria-hidden="true" />
          Ver sitio
        </a>
      </div>

      {/* ── KPIs ── */}
      <div className="i-kpis">
        {cargando ? (
          [0, 1, 2, 3].map((i) => <KpiSkeleton key={i} />)
        ) : errores.kpis ? (
          <div style={{ gridColumn: '1/-1' }}><ErrorBox error={errores.kpis} /></div>
        ) : (
          <>
            <div className="i-kpi">
              <span className="i-kpi-l">Vendido hoy</span>
              <span className="i-kpi-v num">{fmtMoney(resHoy?.total_vendido ?? 0)}</span>
              {variacionDia !== null && (
                <span className="i-kpi-s">
                  <span className={variacionDia >= 0 ? 'i-up' : 'i-down'}>{pct(variacionDia)}</span>
                  {' vs. mismo día sem. pasada'}
                </span>
              )}
            </div>

            <div className="i-kpi">
              <span className="i-kpi-l">Ventas hoy</span>
              <span className="i-kpi-v num">{resHoy?.cant_pagadas ?? 0}</span>
              {Number(resHoy?.cant_pagadas) > 0 && (
                <span className="i-kpi-s">Ticket {fmtMoney(resHoy?.ticket_promedio ?? 0)}</span>
              )}
            </div>

            <Link to="/admin/ventas?estado=pendiente" className="i-kpi i-kpi-warn">
              <span className="i-kpi-l">Pedidos pendientes</span>
              <span className="i-kpi-v num">{pendientes.length}</span>
              {pendientes.length > 0 && (
                <span className="i-kpi-s">{fmtMoney(totalPorCobrar)} por cobrar</span>
              )}
            </Link>

            <Link to="/admin/stock" className={`i-kpi${stockBajo.length > 0 ? ' i-kpi-alert' : ''}`}>
              <span className="i-kpi-l">Stock bajo</span>
              <span className="i-kpi-v num">{stockBajo.length}</span>
              {sinStock.length > 0 && (
                <span className="i-kpi-s">
                  {sinStock.length} sin stock
                  {sinStock.length <= 2 ? ': ' + sinStock.map((p) => p.nombre).join(', ') : ''}
                </span>
              )}
            </Link>
          </>
        )}
      </div>

      {/* ── Grid 2: Pedidos + Esta semana ── */}
      <div className="i-grid2">

        {/* Panel: Pedidos pendientes */}
        <section className="i-panel">
          <div className="i-panel-head">
            <h2>
              Pedidos pendientes
              {pendientes.length > 0 && (
                <span className="i-count">{pendientes.length}</span>
              )}
            </h2>
            <Link to="/admin/ventas?estado=pendiente" className="i-panel-link">
              Ver todos
            </Link>
          </div>

          {errores.pendientes ? (
            <ErrorBox error={errores.pendientes} />
          ) : cargando ? (
            <Spinner />
          ) : pendientes.length === 0 ? (
            <p className="i-empty">¡Todo al día! No hay pedidos pendientes.</p>
          ) : (
            pendientes.slice(0, 5).map((v) => {
              const nombre = nombrePedido(v);
              const tel = telPedido(v);
              const wa = waUrl(tel, v.numero, v.total);
              const viejo = esPedidoViejo(v.fecha);
              const nItems = cantItems(v);
              return (
                <div key={v.id} className="i-order">
                  <span className="i-order-num num">#{v.numero}</span>
                  <div className="i-order-body">
                    <div className="i-order-name">
                      <span>{nombre}</span>
                      <span className={`i-tag${v.origen === 'web' ? ' i-tag-web' : ' i-tag-local'}`}>
                        {v.origen === 'web' ? 'Web' : 'Local'}
                      </span>
                    </div>
                    <div className="i-order-meta">
                      {nItems > 0 ? `${nItems} ítem${nItems !== 1 ? 's' : ''}` : ''}
                      {nItems > 0 && ' · '}
                      <span className={viejo ? 'i-old' : ''}>{tiempoRelativo(v.fecha)}</span>
                    </div>
                  </div>
                  <div className="i-order-right">
                    <span className="i-order-total num">{fmtMoney(v.total)}</span>
                    <div className="i-order-acts">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="i-mini i-mini-icon"
                          aria-label={`Escribir a ${nombre} por WhatsApp`}
                        >
                          <WaIcon />
                        </a>
                      )}
                      <button
                        type="button"
                        className="i-mini i-mini-ok"
                        onClick={() => setCobrandoVenta(v)}
                        aria-label={`Marcar cobrado pedido #${v.numero}`}
                      >
                        <CheckIcon /> Cobrado
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Panel: Esta semana */}
        <section className="i-panel">
          <div className="i-panel-head">
            <h2>Esta semana</h2>
            <Link to="/admin/reportes" className="i-panel-link">Reportes</Link>
          </div>
          {errores.semana ? (
            <ErrorBox error={errores.semana} />
          ) : cargando ? (
            <Spinner />
          ) : (
            <>
              <div className="i-week-total">
                <b className="num">{fmtMoney(totalSemActual)}</b>
                {variacionSemana !== null && (
                  <span>
                    <span className={variacionSemana >= 0 ? 'i-up' : 'i-down'}>
                      {pct(variacionSemana)}
                    </span>
                    {' vs. semana pasada'}
                  </span>
                )}
              </div>
              <SemanaChart data={semanaActual} hoy={datos?.hoyStr ?? ''} />
            </>
          )}
        </section>
      </div>

      {/* ── Grid 3: Reponer + Top + Últimas ── */}
      <div className="i-grid3">

        {/* Panel: Para reponer */}
        <section className="i-panel">
          <div className="i-panel-head">
            <h2>Para reponer</h2>
            <Link to="/admin/stock" className="i-panel-link">Stock</Link>
          </div>
          {errores.stock ? (
            <ErrorBox error={errores.stock} />
          ) : cargando ? (
            <Spinner />
          ) : paraReponer.length === 0 ? (
            <p className="i-empty">Stock al día.</p>
          ) : (
            <div className="i-list">
              {paraReponer.map((p) => {
                const pct = Number(p.stock_minimo) > 0
                  ? Math.min(100, Math.round((Number(p.stock) / Number(p.stock_minimo)) * 100))
                  : 0;
                return (
                  <div key={p.id} className="i-li">
                    <div className="i-li-main">
                      <b>{p.nombre}</b>
                      <span>
                        {Number(p.stock) <= 0
                          ? 'Sin stock'
                          : `${p.stock} ${p.unidad} de ${p.stock_minimo} mínimo`}
                      </span>
                      <div className="i-lvl">
                        <i style={{ width: `${pct}%` }} aria-hidden="true" />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="i-mini"
                      onClick={() => navigate(`/admin/stock?q=${encodeURIComponent(p.nombre)}`)}
                      aria-label={`Reponer ${p.nombre}`}
                    >
                      Reponer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel: Más vendidos */}
        <section className="i-panel">
          <div className="i-panel-head">
            <h2>Más vendidos</h2>
            <span className="i-panel-sub">7 días</span>
          </div>
          {errores.top ? (
            <ErrorBox error={errores.top} />
          ) : cargando ? (
            <Spinner />
          ) : top.length === 0 ? (
            <p className="i-empty">Sin ventas en los últimos 7 días.</p>
          ) : (
            <div className="i-list">
              {top.map((t, i) => {
                const barPct = Math.round((Number(t.total) / maxTopTotal) * 100);
                return (
                  <div key={i} className="i-li">
                    <span className="i-rank" aria-hidden="true">{i + 1}</span>
                    <div className="i-li-main">
                      <b>{t.nombre}</b>
                      <div className="i-hbar">
                        <i style={{ width: `${barPct}%` }} aria-hidden="true" />
                      </div>
                    </div>
                    <span className="i-amt num">{fmtMoney(t.total)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Panel: Últimas ventas */}
        <section className="i-panel">
          <div className="i-panel-head">
            <h2>Últimas ventas</h2>
            <Link to="/admin/ventas" className="i-panel-link">Ver todas</Link>
          </div>
          {errores.ultimas ? (
            <ErrorBox error={errores.ultimas} />
          ) : cargando ? (
            <Spinner />
          ) : (
            <div className="i-list">
              {(datos?.ultimas ?? []).map((v) => {
                const quien = v.cliente?.nombre ?? v.contacto_nombre ?? 'Mostrador';
                return (
                  <div key={v.id} className="i-li">
                    <div className="i-li-main">
                      <b>#{v.numero} · {quien}</b>
                      <span>{tiempoRelativo(v.fecha)} · {medioPagoLabel(v.medio_pago)}</span>
                    </div>
                    <span className="i-amt num">{fmtMoney(v.total)}</span>
                  </div>
                );
              })}
              {/* Promo que termina pronto */}
              {datos?.promo && (
                <div className="i-li">
                  <div className="i-li-main">
                    <b className="i-promo-nombre">{datos.promo.titulo}</b>
                    <span className="i-promo-end">
                      Termina el {fmtDate(datos.promo.fecha_fin)}
                    </span>
                  </div>
                  <Link to="/admin/promociones" className="i-mini">Ver</Link>
                </div>
              )}
              {!cargando && (datos?.ultimas ?? []).length === 0 && !datos?.promo && (
                <p className="i-empty">Sin ventas registradas.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Modales */}
      {cobrandoVenta && (
        <PagarModal
          venta={cobrandoVenta}
          onConfirm={confirmarCobro}
          onClose={() => setCobrandoVenta(null)}
          busy={pagandoBusy}
        />
      )}
      {creatingVenta && (
        <NuevaVenta
          onClose={() => setCreatingVenta(false)}
          onSaved={(numero) => {
            toast(`Venta #${numero} registrada`);
            setCreatingVenta(false);
            refreshPendientes();
            cargar();
          }}
        />
      )}
    </div>
  );
}

function medioPagoLabel(v) {
  const MEDIOS = { efectivo: 'Efectivo', transferencia: 'Transferencia', debito: 'Débito', credito: 'Crédito', otro: 'Otro' };
  return MEDIOS[v] ?? v ?? '';
}

function WaIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-8.9A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

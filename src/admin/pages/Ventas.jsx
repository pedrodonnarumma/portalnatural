import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Ban, Eye, Check, X, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { endOfDayISO, fmtDate, fmtMoney, fmtQty, MEDIOS_PAGO, medioPagoLabel, startOfDayISO, toDateInput } from '../lib/format.js';
import { etiquetaPresentacion, precioPresentacion } from '../../lib/precios.js';
import { Confirm, EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useToast } from '../components/ui.jsx';
import { useAuth } from '../AuthProvider.jsx';
import ExcelModal from '../components/ExcelModal.jsx';

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'todo', label: 'Todas' },
];

const PAGE_SIZE = 50;

function rangeStart(key) {
  const d = new Date();
  if (key === 'hoy') return startOfDayISO(toDateInput(d));
  if (key === '7') { d.setDate(d.getDate() - 6); return startOfDayISO(toDateInput(d)); }
  if (key === '30') { d.setDate(d.getDate() - 29); return startOfDayISO(toDateInput(d)); }
  return null;
}

function rangeTimestamps(key) {
  const hoy = toDateInput(new Date());
  if (key === 'hoy') return [startOfDayISO(hoy), endOfDayISO(hoy)];
  if (key === '7')  { const d = new Date(); d.setDate(d.getDate() - 6); return [startOfDayISO(toDateInput(d)), endOfDayISO(hoy)]; }
  if (key === '30') { const d = new Date(); d.setDate(d.getDate() - 29); return [startOfDayISO(toDateInput(d)), endOfDayISO(hoy)]; }
  return [startOfDayISO('2000-01-01'), endOfDayISO(hoy)];
}

const SELECT_VENTAS = 'id, numero, fecha, medio_pago, total, notas, anulada, estado, origen, contacto_nombre, contacto_telefono, direccion_envio, pagada_at, cancelada_at, cliente:clientes(id, nombre)';

function estadoTag(estado) {
  if (estado === 'pendiente') return <span className="tag tag-warn">Pendiente</span>;
  if (estado === 'cancelada') return <span className="tag tag-danger">Cancelada</span>;
  return <span className="tag tag-ok">Pagada</span>;
}

function origenTag(origen) {
  if (origen === 'web') return <span className="tag tag-accent">Web</span>;
  return <span className="tag tag-neutral">Local</span>;
}

/* Devuelve [desdeStr, hastaStr] correspondiente al rango activo. */
function rangeStrings(rango) {
  const hoy = toDateInput(new Date());
  if (rango === 'hoy') return [hoy, hoy];
  if (rango === '7')   { const d = new Date(); d.setDate(d.getDate() - 6); return [toDateInput(d), hoy]; }
  if (rango === '30')  { const d = new Date(); d.setDate(d.getDate() - 29); return [toDateInput(d), hoy]; }
  return [toDateInput(new Date(new Date().getFullYear(), 0, 1)), hoy]; // este año
}

export default function Ventas() {
  const { session } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [pendientes, setPendientes] = useState(null);
  const [masPendientes, setMasPendientes] = useState(false);
  const [error, setError] = useState(null);
  const [rango, setRango] = useState('7');
  const [page, setPage] = useState(0);
  const [serverCount, setServerCount] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const [exportando, setExportando] = useState(false);

  // Resetear página al cambiar rango
  useEffect(() => { setPage(0); }, [rango]);

  const loadPendientes = useCallback(async () => {
    const { data, error: err, count } = await supabase
      .from('ventas')
      .select(SELECT_VENTAS, { count: 'exact' })
      .eq('estado', 'pendiente')
      .order('fecha', { ascending: true })
      .limit(200);
    if (!err) {
      setPendientes(data ?? []);
      setMasPendientes((count ?? 0) > 200);
    }
  }, []);

  const load = useCallback(async () => {
    const from = rangeStart(rango);
    const [desdeISO, hastaISO] = rangeTimestamps(rango);
    const from_ = page * PAGE_SIZE;
    const to_   = from_ + PAGE_SIZE - 1;

    let q = supabase
      .from('ventas')
      .select(SELECT_VENTAS, { count: 'exact' })
      .neq('estado', 'pendiente')
      .order('fecha', { ascending: false })
      .order('id', { ascending: false })
      .range(from_, to_);
    if (from) q = q.gte('fecha', from);

    const [pageRes, resumenRes] = await Promise.all([
      q,
      supabase.rpc('resumen_ventas', { desde: desdeISO, hasta: hastaISO }),
    ]);

    if (pageRes.error) setError(pageRes.error);
    else {
      setRows(pageRes.data ?? []);
      setServerCount(pageRes.count ?? 0);
    }
    if (!resumenRes.error && resumenRes.data?.[0]) {
      setResumen(resumenRes.data[0]);
    }
  }, [rango, page]);

  useEffect(() => {
    loadPendientes();
  }, [loadPendientes]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const recargar = useCallback(() => { loadPendientes(); load(); }, [loadPendientes, load]);

  async function cancelarVenta(v) {
    setBusy(true);
    const { error: err } = await supabase.rpc('cancelar_venta', { p_venta_id: v.id });
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(`Venta #${v.numero} cancelada. El stock volvió a sumarse.`);
    setCancelling(null);
    setViewing(null);
    recargar();
  }

  return (
    <>
      <PageHead
        title="Ventas"
        subtitle={resumen ? `${resumen.cant_pagadas} pagadas · ${fmtMoney(resumen.total_vendido)}` : null}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nueva venta
          </button>
        }
      />

      {/* Bloque de pendientes — siempre visible, sin filtro de fecha */}
      <PendientesBloque
        pendientes={pendientes}
        masPendientes={masPendientes}
        onVer={(v) => setViewing(v)}
        onMarcarPagado={(v) => setViewing({ ...v, _accion: 'pagar' })}
        onCancelar={(v) => setCancelling(v)}
      />

      <div className="toolbar">
        <div className="chips chips-inline">
          {RANGOS.map((r) => (
            <button key={r.key} type="button" className={`chip chip-sm ${rango === r.key ? 'is-active' : ''}`} onClick={() => setRango(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setExportando(true)}>
          <FileDown size={14} /> Exportar Excel
        </button>
      </div>

      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <EmptyState>No hay ventas en este período.</EmptyState>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Origen</th>
                <th>Pago</th>
                <th className="num">Total</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className={v.estado === 'cancelada' ? 'is-inactive' : ''}>
                  <td className="text-muted">{v.numero}</td>
                  <td className="nowrap">{fmtDate(v.fecha, true)}</td>
                  <td>{v.cliente?.nombre ?? v.contacto_nombre ?? <span className="text-muted">Consumidor final</span>}</td>
                  <td>{origenTag(v.origen)}</td>
                  <td>{medioPagoLabel(v.medio_pago)}</td>
                  <td className="num">
                    <strong>{fmtMoney(v.total)}</strong>
                    <span className="cell-tag">{estadoTag(v.estado)}</span>
                  </td>
                  <td className="col-actions">
                    <button type="button" className="btn btn-icon btn-secondary" onClick={() => setViewing(v)} aria-label={`Ver venta ${v.numero}`} title="Ver detalle">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {serverCount > PAGE_SIZE && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn-icon btn-secondary"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            {page + 1} / {Math.ceil(serverCount / PAGE_SIZE)}
          </span>
          <button
            type="button"
            className="btn btn-icon btn-secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= serverCount}
            aria-label="Página siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {creating && (
        <NuevaVenta
          onClose={() => setCreating(false)}
          onSaved={(numero) => {
            toast(`Venta #${numero} registrada`);
            setCreating(false);
            recargar();
          }}
        />
      )}
      {viewing && (
        <DetalleVenta
          venta={viewing}
          onClose={() => setViewing(null)}
          onCancel={() => setCancelling(viewing)}
          onPagada={() => recargar()}
          initialAccion={viewing._accion}
        />
      )}
      {cancelling && (
        <Confirm
          title={`Cancelar venta #${cancelling.numero}`}
          text="La venta queda cancelada y los productos vuelven al stock. No se puede deshacer."
          confirmLabel="Cancelar venta"
          danger
          busy={busy}
          onConfirm={() => cancelarVenta(cancelling)}
          onClose={() => setCancelling(null)}
        />
      )}
      {exportando && (() => {
        const [desdeStr, hastaStr] = rangeStrings(rango);
        return (
          <ExcelModal
            contexto="ventas"
            desdeInicial={desdeStr}
            hastaInicial={hastaStr}
            userEmail={session?.user?.email}
            onClose={() => setExportando(false)}
          />
        );
      })()}
    </>
  );
}

/* ── Bloque pendientes ── */
function PendientesBloque({ pendientes, masPendientes, onVer, onMarcarPagado, onCancelar }) {
  if (!pendientes || pendientes.length === 0) return null;

  return (
    <div className="pendientes-bloque">
      <div className="pendientes-head">
        <span className="pendientes-title">Pedidos pendientes</span>
        <span className="chip chip-sm is-active">{pendientes.length}{masPendientes ? '+' : ''}</span>
        {masPendientes && <span className="text-muted" style={{ fontSize: 13 }}>Se muestran solo los primeros 200</span>}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha y hora</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Origen</th>
              <th className="num">Total</th>
              <th className="col-actions" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {pendientes.map((v) => {
              const nombre = v.cliente?.nombre ?? v.contacto_nombre ?? 'Sin nombre';
              const tel = v.contacto_telefono;
              const telDigits = tel ? tel.replace(/\D/g, '') : null;
              return (
                <tr key={v.id}>
                  <td className="text-muted">{v.numero}</td>
                  <td className="nowrap">{fmtDate(v.fecha, true)}</td>
                  <td>{nombre}</td>
                  <td className="nowrap">
                    {tel
                      ? <a href={`https://wa.me/${telDigits}`} target="_blank" rel="noopener noreferrer" className="text-muted">{tel}</a>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>{origenTag(v.origen)}</td>
                  <td className="num"><strong>{fmtMoney(v.total)}</strong></td>
                  <td className="col-actions">
                    <button type="button" className="btn btn-icon btn-secondary" onClick={() => onVer(v)} title="Ver detalle" aria-label={`Ver pedido ${v.numero}`}>
                      <Eye size={15} />
                    </button>
                    <button type="button" className="btn btn-icon btn-primary" onClick={() => onMarcarPagado(v)} title="Marcar como pagado" aria-label={`Marcar pagado #${v.numero}`}>
                      <Check size={15} />
                    </button>
                    <button type="button" className="btn btn-icon btn-danger" onClick={() => onCancelar(v)} title="Cancelar pedido" aria-label={`Cancelar #${v.numero}`}>
                      <X size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Nueva venta ── */
function NuevaVenta({ onClose, onSaved }) {
  const toast = useToast();
  const [productos, setProductos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [estadoVenta, setEstadoVenta] = useState('pagada');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id, nombre, categoria, unidad, venta_por, precio, stock').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('precios_promo_vigentes').select('producto_id, precio_promo'),
    ]).then(([p, c, pr]) => {
      if (p.error) setError(p.error);
      const promos = new Map((pr.data ?? []).map((x) => [x.producto_id, Number(x.precio_promo)]));
      setProductos((p.data ?? []).map((x) => ({
        ...x,
        venta_por: Number(x.venta_por) || 1,
        precio_lista: Number(x.precio),
        precio: promos.has(x.id) ? promos.get(x.id) : Number(x.precio),
        promo: promos.has(x.id),
      })));
      setClientes(c.data ?? []);
    });
  }, []);

  const results = useMemo(() => {
    if (!productos) return [];
    const s = q.trim().toLowerCase();
    const list = s ? productos.filter((p) => [p.nombre, p.categoria].some((v) => v?.toLowerCase().includes(s))) : productos;
    return list.slice(0, 12);
  }, [productos, q]);

  function add(p) {
    setItems((list) => {
      const i = list.findIndex((x) => x.producto_id === p.id);
      const step = p.venta_por ?? 1;
      if (i >= 0) return list.map((x, j) => (j === i ? { ...x, cantidad: round3(Number(x.cantidad) + step) } : x));
      return [...list, { producto_id: p.id, nombre: p.nombre, unidad: p.unidad, venta_por: step, stock: Number(p.stock), cantidad: step, precio_unitario: Number(p.precio), promo: p.promo }];
    });
    setQ('');
  }

  const update = (i, k, v) => setItems((list) => list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const remove = (i) => setItems((list) => list.filter((_, j) => j !== i));

  const total = items.reduce((a, x) => a + (Number(x.cantidad) || 0) * (Number(x.precio_unitario) || 0), 0);
  const valid = items.length > 0 && items.every((x) => Number(x.cantidad) > 0 && Number(x.precio_unitario) >= 0);

  async function submit(e) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const { data, error: err } = await supabase.rpc('registrar_venta', {
      p_items: items.map((x) => ({ producto_id: x.producto_id, cantidad: Number(x.cantidad), precio_unitario: Number(x.precio_unitario) })),
      p_cliente_id: clienteId || null,
      p_medio_pago: estadoVenta === 'pendiente' ? 'efectivo' : medio,
      p_notas: notas.trim() || null,
      p_estado: estadoVenta,
      p_direccion_envio: direccion.trim() || null,
    });
    if (err) {
      setBusy(false);
      return toast(err.message, 'error');
    }
    const { data: v } = await supabase.from('ventas').select('numero').eq('id', data).single();
    onSaved(v?.numero ?? '');
  }

  return (
    <Modal title="Nueva venta" onClose={onClose} wide>
      <form onSubmit={submit} className="sale">
        <ErrorBox error={error} />
        <div className="sale-search">
          <SearchBox value={q} onChange={setQ} placeholder="Buscar producto para agregar…" />
          {!productos && <Spinner />}
          {productos && productos.length === 0 && <EmptyState>No hay artículos activos. Cargalos en Artículos.</EmptyState>}
          {productos && productos.length > 0 && (
            <div className="sale-results">
              {results.map((p) => (
                <button key={p.id} type="button" className="sale-result" onClick={() => add(p)}>
                  <span className="sale-result-name">{p.nombre}{p.promo && <span className="tag tag-accent-2 cell-tag">Promo</span>}</span>
                  <span className="text-muted sale-result-meta">
                    {fmtMoney(precioPresentacion(p.precio, p.venta_por))} / {etiquetaPresentacion(p.unidad, p.venta_por)} · stock {fmtQty(p.stock, p.unidad)}
                  </span>
                </button>
              ))}
              {results.length === 0 && <div className="text-muted sale-none">Sin coincidencias.</div>}
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className="table-wrap">
            <table className="table sale-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Cantidad</th>
                  <th className="num">Precio</th>
                  <th className="num">Subtotal</th>
                  <th aria-label="Quitar" />
                </tr>
              </thead>
              <tbody>
                {items.map((x, i) => {
                  const cant = Number(x.cantidad) || 0;
                  const over = cant > x.stock;
                  return (
                    <tr key={x.producto_id}>
                      <td>
                        <strong>{x.nombre}</strong>{x.promo && <span className="tag tag-accent-2 cell-tag">Promo</span>}
                        {over && <div className="cell-sub stock-low">Supera el stock ({fmtQty(x.stock, x.unidad)})</div>}
                      </td>
                      <td className="num">
                        <div className="qty-cell">
                          <input className="input input-sm" type="number" min="0" step="0.001" inputMode="decimal" value={x.cantidad} onChange={(e) => update(i, 'cantidad', e.target.value)} aria-label="Cantidad" />
                          <span className="text-muted">{x.unidad}</span>
                        </div>
                      </td>
                      <td className="num">
                        <input className="input input-sm" type="number" min="0" step="0.01" inputMode="decimal" value={x.precio_unitario} onChange={(e) => update(i, 'precio_unitario', e.target.value)} aria-label="Precio unitario" />
                      </td>
                      <td className="num nowrap">{fmtMoney(cant * (Number(x.precio_unitario) || 0))}</td>
                      <td className="col-actions">
                        <button type="button" className="btn btn-icon btn-secondary" onClick={() => remove(i)} aria-label={`Quitar ${x.nombre}`}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Buscá un producto arriba y tocalo para agregarlo.</EmptyState>
        )}

        <div className="form-grid sale-meta">
          <Field label="Cliente">
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Consumidor final</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Estado">
            <div className="seg">
              <button type="button" className={`btn seg-opt${estadoVenta === 'pagada' ? ' btn-primary' : ' btn-secondary'}`} onClick={() => setEstadoVenta('pagada')}>
                Pagada
              </button>
              <button type="button" className={`btn seg-opt${estadoVenta === 'pendiente' ? ' btn-primary' : ' btn-secondary'}`} onClick={() => setEstadoVenta('pendiente')}>
                Pendiente
              </button>
            </div>
          </Field>
          {estadoVenta === 'pagada' && (
            <Field label="Medio de pago">
              <select className="input" value={medio} onChange={(e) => setMedio(e.target.value)}>
                {MEDIOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Dirección de envío" span={estadoVenta === 'pagada'}>
            <input className="input" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Opcional" />
          </Field>
          <Field label="Notas" span>
            <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional" />
          </Field>
        </div>

        <div className="sale-foot">
          <div className="sale-total">
            <span className="text-muted">Total</span>
            <strong>{fmtMoney(total, true)}</strong>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-md" disabled={!valid || busy}>
              {busy ? 'Registrando…' : estadoVenta === 'pendiente' ? 'Guardar pedido' : 'Registrar venta'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ── Detalle de venta ── */
function DetalleVenta({ venta: ventaInit, onClose, onCancel, onPagada, initialAccion }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [venta, setVenta] = useState(ventaInit);
  const [accion, setAccion] = useState(initialAccion ?? null); // 'pagar' | 'cancelar' | null
  const [medioPago, setMedioPago] = useState('efectivo');
  const [direccion, setDireccion] = useState(ventaInit.direccion_envio ?? '');
  const [guardandoDir, setGuardandoDir] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('venta_items')
      .select('id, nombre, cantidad, precio_unitario, subtotal, producto:productos(unidad)')
      .eq('venta_id', venta.id)
      .then(({ data, error: err }) => (err ? setError(err) : setItems(data)));
  }, [venta.id]);

  async function marcarPagado() {
    setBusy(true);
    const { error: err } = await supabase.rpc('marcar_venta_pagada', {
      p_venta_id: venta.id,
      p_medio_pago: medioPago,
    });
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(`Venta #${venta.numero} marcada como pagada.`);
    setVenta((v) => ({ ...v, estado: 'pagada', medio_pago: medioPago }));
    setAccion(null);
    onPagada();
  }

  async function guardarDireccion() {
    setGuardandoDir(true);
    const { error: err } = await supabase
      .from('ventas')
      .update({ direccion_envio: direccion.trim() || null })
      .eq('id', venta.id);
    setGuardandoDir(false);
    if (err) return toast(err.message, 'error');
    toast('Dirección guardada.');
    setVenta((v) => ({ ...v, direccion_envio: direccion.trim() || null }));
  }

  const telDigits = venta.contacto_telefono?.replace(/\D/g, '');

  return (
    <Modal title={`Venta #${venta.numero}`} onClose={onClose} wide>
      <div className="detail-grid">
        <div><span className="text-muted">Fecha</span><br />{fmtDate(venta.fecha, true)}</div>
        <div>
          <span className="text-muted">Estado</span><br />
          {estadoTag(venta.estado)}
        </div>
        <div><span className="text-muted">Origen</span><br />{origenTag(venta.origen)}</div>
        <div><span className="text-muted">Pago</span><br />{medioPagoLabel(venta.medio_pago)}</div>
        {(venta.cliente?.nombre || venta.contacto_nombre) && (
          <div>
            <span className="text-muted">Cliente</span><br />
            {venta.cliente?.nombre ?? venta.contacto_nombre}
          </div>
        )}
        {venta.contacto_telefono && (
          <div>
            <span className="text-muted">Teléfono</span><br />
            <a href={`https://wa.me/${telDigits}`} target="_blank" rel="noopener noreferrer">
              {venta.contacto_telefono}
            </a>
          </div>
        )}
        {venta.notas && <div className="span-2"><span className="text-muted">Notas</span><br />{venta.notas}</div>}
      </div>

      {/* Dirección de envío */}
      {venta.estado !== 'cancelada' && (
        <div className="detail-dir">
          <label className="text-muted" style={{ fontSize: 13 }}>Dirección de envío</label>
          <div className="detail-dir-row">
            <input
              className="input"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Opcional"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={guardarDireccion}
              disabled={guardandoDir || direccion === (venta.direccion_envio ?? '')}
            >
              {guardandoDir ? '…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
      {venta.estado === 'cancelada' && venta.direccion_envio && (
        <div className="detail-dir"><span className="text-muted" style={{ fontSize: 13 }}>Dirección de envío</span><br />{venta.direccion_envio}</div>
      )}

      <ErrorBox error={error} />
      {!items && !error && <Spinner />}
      {items && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="num">Cantidad</th>
                <th className="num">Precio</th>
                <th className="num">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>{x.nombre}</td>
                  <td className="num">{fmtQty(x.cantidad, x.producto?.unidad)}</td>
                  <td className="num">{fmtMoney(x.precio_unitario)}</td>
                  <td className="num">{fmtMoney(x.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="num"><strong>Total</strong></td>
                <td className="num"><strong>{fmtMoney(venta.total, true)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Panel de acción inline para marcar pagado */}
      {accion === 'pagar' && (
        <div className="detail-pagar">
          <label className="text-muted" style={{ fontSize: 13 }}>Medio de pago</label>
          <div className="detail-dir-row">
            <select className="input" value={medioPago} onChange={(e) => setMedioPago(e.target.value)}>
              {MEDIOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <button type="button" className="btn btn-primary btn-sm" onClick={marcarPagado} disabled={busy}>
              {busy ? '…' : 'Confirmar'}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAccion(null)} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="dialog-actions">
        {venta.estado === 'pendiente' && accion !== 'pagar' && (
          <button type="button" className="btn btn-primary" onClick={() => setAccion('pagar')}>
            <Check size={15} /> Marcar como pagado
          </button>
        )}
        {venta.estado !== 'cancelada' && (
          <button type="button" className="btn btn-danger" onClick={onCancel}>
            <Ban size={15} /> {venta.estado === 'pendiente' ? 'Cancelar pedido' : 'Cancelar venta'}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Ban, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtMoney, fmtQty, MEDIOS_PAGO, medioPagoLabel, startOfDayISO, toDateInput } from '../lib/format.js';
import { Confirm, EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useToast } from '../components/ui.jsx';

const RANGOS = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7', label: '7 días' },
  { key: '30', label: '30 días' },
  { key: 'todo', label: 'Todas' },
];

function rangeStart(key) {
  const d = new Date();
  if (key === 'hoy') return startOfDayISO(toDateInput(d));
  if (key === '7') { d.setDate(d.getDate() - 6); return startOfDayISO(toDateInput(d)); }
  if (key === '30') { d.setDate(d.getDate() - 29); return startOfDayISO(toDateInput(d)); }
  return null;
}

export default function Ventas() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [rango, setRango] = useState('7');
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    let query = supabase
      .from('ventas')
      .select('id, numero, fecha, medio_pago, total, notas, anulada, cliente:clientes(id, nombre)')
      .order('fecha', { ascending: false })
      .limit(300);
    const from = rangeStart(rango);
    if (from) query = query.gte('fecha', from);
    const { data, error: err } = await query;
    if (err) setError(err);
    else setRows(data);
  }, [rango]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const total = useMemo(() => (rows ?? []).filter((v) => !v.anulada).reduce((a, v) => a + Number(v.total), 0), [rows]);

  async function cancel() {
    setBusy(true);
    const { error: err } = await supabase.rpc('anular_venta', { p_venta_id: cancelling.id });
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(`Venta #${cancelling.numero} anulada. El stock volvió a sumarse.`);
    setCancelling(null);
    setViewing(null);
    load();
  }

  return (
    <>
      <PageHead
        title="Ventas"
        subtitle={rows ? `${rows.filter((v) => !v.anulada).length} ventas · ${fmtMoney(total)}` : null}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nueva venta
          </button>
        }
      />
      <div className="toolbar">
        <div className="chips chips-inline">
          {RANGOS.map((r) => (
            <button key={r.key} type="button" className={`chip chip-sm ${rango === r.key ? 'is-active' : ''}`} onClick={() => setRango(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
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
                <th>Pago</th>
                <th className="num">Total</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className={v.anulada ? 'is-inactive' : ''}>
                  <td className="text-muted">{v.numero}</td>
                  <td className="nowrap">{fmtDate(v.fecha, true)}</td>
                  <td>{v.cliente?.nombre ?? <span className="text-muted">Consumidor final</span>}</td>
                  <td>{medioPagoLabel(v.medio_pago)}</td>
                  <td className="num">
                    <strong>{fmtMoney(v.total)}</strong>
                    {v.anulada && <span className="tag tag-neutral cell-tag">Anulada</span>}
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

      {creating && (
        <NuevaVenta
          onClose={() => setCreating(false)}
          onSaved={(numero) => {
            toast(`Venta #${numero} registrada`);
            setCreating(false);
            load();
          }}
        />
      )}
      {viewing && <DetalleVenta venta={viewing} onClose={() => setViewing(null)} onCancel={() => setCancelling(viewing)} />}
      {cancelling && (
        <Confirm
          title={`Anular venta #${cancelling.numero}`}
          text="La venta queda marcada como anulada y los productos vuelven al stock. No se puede deshacer."
          confirmLabel="Anular venta"
          danger
          busy={busy}
          onConfirm={cancel}
          onClose={() => setCancelling(null)}
        />
      )}
    </>
  );
}

/* ───────── Nueva venta ───────── */
function NuevaVenta({ onClose, onSaved }) {
  const toast = useToast();
  const [productos, setProductos] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id, nombre, categoria, unidad, precio, stock').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('precios_promo_vigentes').select('producto_id, precio_promo'),
    ]).then(([p, c, pr]) => {
      if (p.error) setError(p.error);
      const promos = new Map((pr.data ?? []).map((x) => [x.producto_id, Number(x.precio_promo)]));
      setProductos((p.data ?? []).map((x) => ({ ...x, precio_lista: Number(x.precio), precio: promos.has(x.id) ? promos.get(x.id) : Number(x.precio), promo: promos.has(x.id) })));
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
      if (i >= 0) return list.map((x, j) => (j === i ? { ...x, cantidad: round3(Number(x.cantidad) + 1) } : x));
      return [...list, { producto_id: p.id, nombre: p.nombre, unidad: p.unidad, stock: Number(p.stock), cantidad: 1, precio_unitario: Number(p.precio), promo: p.promo }];
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
      p_medio_pago: medio,
      p_notas: notas.trim() || null,
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
                    {fmtMoney(p.precio)} / {p.unidad} · stock {fmtQty(p.stock)}
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
          <Field label="Medio de pago">
            <select className="input" value={medio} onChange={(e) => setMedio(e.target.value)}>
              {MEDIOS_PAGO.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
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
            <button type="submit" className="btn btn-primary btn-md" disabled={!valid || busy}>{busy ? 'Registrando…' : 'Registrar venta'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ───────── Detalle ───────── */
function DetalleVenta({ venta, onClose, onCancel }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('venta_items')
      .select('id, nombre, cantidad, precio_unitario, subtotal, producto:productos(unidad)')
      .eq('venta_id', venta.id)
      .then(({ data, error: err }) => (err ? setError(err) : setItems(data)));
  }, [venta.id]);

  return (
    <Modal title={`Venta #${venta.numero}`} onClose={onClose} wide>
      <div className="detail-grid">
        <div><span className="text-muted">Fecha</span><br />{fmtDate(venta.fecha, true)}</div>
        <div><span className="text-muted">Cliente</span><br />{venta.cliente?.nombre ?? 'Consumidor final'}</div>
        <div><span className="text-muted">Pago</span><br />{medioPagoLabel(venta.medio_pago)}</div>
        <div><span className="text-muted">Estado</span><br />{venta.anulada ? 'Anulada' : 'Registrada'}</div>
        {venta.notas && <div className="span-2"><span className="text-muted">Notas</span><br />{venta.notas}</div>}
      </div>
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
      <div className="dialog-actions">
        {!venta.anulada && (
          <button type="button" className="btn btn-danger" onClick={onCancel}>
            <Ban size={15} /> Anular venta
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


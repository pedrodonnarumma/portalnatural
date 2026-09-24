import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackagePlus, History, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtMoney, fmtQty } from '../lib/format.js';
import { EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useAutoFocus, useToast } from '../components/ui.jsx';

const TIPO_LABEL = { ingreso: 'Ingreso', ajuste: 'Ajuste', venta: 'Venta', anulacion: 'Anulación' };

export default function Stock() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('existencias'); // existencias | movimientos
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjusting, setAdjusting] = useState(null);
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('productos').select('*').eq('activo', true).order('nombre');
    if (err) setError(err);
    else setRows(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (onlyLow && !isLow(p)) return false;
      if (!s) return true;
      return [p.nombre, p.categoria].some((v) => v?.toLowerCase().includes(s));
    });
  }, [rows, q, onlyLow]);

  const resumen = useMemo(() => {
    if (!rows) return null;
    const low = rows.filter(isLow).length;
    const sinStock = rows.filter((p) => Number(p.stock) <= 0).length;
    const valorCosto = rows.reduce((a, p) => a + (p.costo != null ? Number(p.stock) * Number(p.costo) : 0), 0);
    const valorVenta = rows.reduce((a, p) => a + Number(p.stock) * Number(p.precio), 0);
    return { low, sinStock, valorCosto, valorVenta, total: rows.length };
  }, [rows]);

  async function adjust({ tipo, cantidad, motivo }) {
    setBusy(true);
    const signed = tipo === 'ingreso' ? Math.abs(cantidad) : cantidad;
    const { error: err } = await supabase.rpc('ajustar_stock', {
      p_producto_id: adjusting.id,
      p_cantidad: signed,
      p_tipo: tipo,
      p_motivo: motivo.trim() || null,
    });
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast('Stock actualizado');
    setAdjusting(null);
    load();
  }

  return (
    <>
      <PageHead title="Stock" subtitle={resumen ? `${resumen.total} artículos activos` : null} />
      <ErrorBox error={error} />
      {resumen && (
        <div className="kpis">
          <div className="kpi"><span className="kpi-label">Valor a costo</span><span className="kpi-value">{resumen.valorCosto > 0 ? fmtMoney(resumen.valorCosto) : '—'}</span></div>
          <div className="kpi"><span className="kpi-label">Valor a venta</span><span className="kpi-value">{fmtMoney(resumen.valorVenta)}</span></div>
          <div className={`kpi ${resumen.low ? 'kpi-warn' : ''}`}><span className="kpi-label">Stock bajo</span><span className="kpi-value">{resumen.low}</span></div>
          <div className={`kpi ${resumen.sinStock ? 'kpi-warn' : ''}`}><span className="kpi-label">Sin stock</span><span className="kpi-value">{resumen.sinStock}</span></div>
        </div>
      )}

      <div className="toolbar">
        <div className="seg">
          <label className="seg-opt"><input type="radio" name="tab" checked={tab === 'existencias'} onChange={() => setTab('existencias')} /> Existencias</label>
          <label className="seg-opt"><input type="radio" name="tab" checked={tab === 'movimientos'} onChange={() => setTab('movimientos')} /> Movimientos</label>
        </div>
        {tab === 'existencias' && (
          <>
            <SearchBox value={q} onChange={setQ} placeholder="Buscar artículo" />
            <label className={`chip chip-sm ${onlyLow ? 'is-active' : ''}`}>
              <input type="checkbox" className="sr-only" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
              <AlertTriangle size={14} /> Solo stock bajo
            </label>
          </>
        )}
      </div>

      {tab === 'movimientos' ? (
        <MovimientosGlobal />
      ) : (
        <>
          {!rows && !error && <Spinner />}
          {rows && rows.length === 0 && (
            <EmptyState>
              No hay artículos activos. <Link to="/admin/articulos">Cargalos en Artículos</Link>.
            </EmptyState>
          )}
          {rows && rows.length > 0 && filtered.length === 0 && <EmptyState>{onlyLow ? 'Ningún artículo con stock bajo.' : 'No hay artículos que coincidan.'}</EmptyState>}
          {filtered.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th className="num">Stock</th>
                    <th className="num">Mínimo</th>
                    <th className="num">Valor a venta</th>
                    <th className="col-actions" aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.nombre}</strong>
                        {p.categoria && <div className="text-muted cell-sub">{p.categoria}</div>}
                      </td>
                      <td className="num">
                        <span className={isLow(p) ? 'stock-low' : ''}>{fmtQty(p.stock, p.unidad)}</span>
                        {isLow(p) && <div className="cell-sub stock-low">{Number(p.stock) <= 0 ? 'Sin stock' : 'Reponer'}</div>}
                      </td>
                      <td className="num text-muted">{fmtQty(p.stock_minimo, p.unidad)}</td>
                      <td className="num text-muted">{fmtMoney(Number(p.stock) * Number(p.precio))}</td>
                      <td className="col-actions">
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdjusting(p)} title="Ingreso / ajuste de stock">
                          <PackagePlus size={15} /> Ingresar
                        </button>
                        <button type="button" className="btn btn-icon btn-secondary" onClick={() => setHistory(p)} aria-label={`Movimientos de ${p.nombre}`} title="Movimientos">
                          <History size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {adjusting && <AjusteForm producto={adjusting} busy={busy} onSave={adjust} onClose={() => setAdjusting(null)} />}
      {history && <MovimientosProducto producto={history} onClose={() => setHistory(null)} />}
    </>
  );
}

function isLow(p) {
  return Number(p.stock) <= Number(p.stock_minimo);
}

function AjusteForm({ producto, busy, onSave, onClose }) {
  const [tipo, setTipo] = useState('ingreso');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const ref = useAutoFocus();
  const n = Number(cantidad);
  const resultado = Number(producto.stock) + (tipo === 'ingreso' ? Math.abs(n) : n);

  return (
    <Modal title={`Stock de ${producto.nombre}`} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!n) return;
          onSave({ tipo, cantidad: n, motivo });
        }}
      >
        <div className="seg span-2">
          <label className="seg-opt">
            <input type="radio" name="tipo" checked={tipo === 'ingreso'} onChange={() => setTipo('ingreso')} /> Ingreso de mercadería
          </label>
          <label className="seg-opt">
            <input type="radio" name="tipo" checked={tipo === 'ajuste'} onChange={() => setTipo('ajuste')} /> Ajuste (+/−)
          </label>
        </div>
        <Field label={`Cantidad (${producto.unidad})`} hint={tipo === 'ajuste' ? 'Usá negativo para descontar (merma, rotura, conteo).' : null}>
          <input ref={ref} className="input" type="number" step="0.001" inputMode="decimal" min={tipo === 'ingreso' ? 0 : undefined} value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
        </Field>
        <Field label="Stock resultante">
          <input className="input" value={fmtQty(Number.isFinite(resultado) ? resultado : producto.stock, producto.unidad)} disabled />
        </Field>
        <Field label="Motivo (opcional)" span>
          <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Proveedor, conteo, merma…" />
        </Field>
        <div className="dialog-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy || !n}>{busy ? 'Guardando…' : 'Confirmar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MovimientosTable({ rows, showProducto }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Fecha</th>
            {showProducto && <th>Artículo</th>}
            <th>Tipo</th>
            <th>Detalle</th>
            <th className="num">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const unidad = m.producto?.unidad;
            return (
              <tr key={m.id}>
                <td className="nowrap">{fmtDate(m.created_at, true)}</td>
                {showProducto && <td>{m.producto?.nombre ?? <span className="text-muted">—</span>}</td>}
                <td>{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                <td className="text-muted">{m.venta?.numero ? `Venta #${m.venta.numero}` : m.motivo || '—'}</td>
                <td className={`num ${Number(m.cantidad) < 0 ? 'stock-low' : 'stock-up'}`}>
                  {Number(m.cantidad) > 0 ? '+' : ''}{fmtQty(m.cantidad, unidad)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const MOV_SELECT = 'id, tipo, cantidad, motivo, created_at, producto:productos(nombre, unidad), venta:ventas(numero)';

function MovimientosGlobal() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('movimientos_stock')
      .select(MOV_SELECT)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error: err }) => (err ? setError(err) : setRows(data)));
  }, []);

  return (
    <>
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <EmptyState>Sin movimientos todavía.</EmptyState>}
      {rows && rows.length > 0 && <MovimientosTable rows={rows} showProducto />}
      {rows && rows.length === 200 && <p className="text-muted cell-sub">Se muestran los últimos 200 movimientos.</p>}
    </>
  );
}

function MovimientosProducto({ producto, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('movimientos_stock')
      .select(MOV_SELECT)
      .eq('producto_id', producto.id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error: err }) => (err ? setError(err) : setRows(data)));
  }, [producto.id]);

  return (
    <Modal title={`Movimientos · ${producto.nombre}`} onClose={onClose} wide>
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <EmptyState>Sin movimientos todavía.</EmptyState>}
      {rows && rows.length > 0 && <MovimientosTable rows={rows} />}
    </Modal>
  );
}

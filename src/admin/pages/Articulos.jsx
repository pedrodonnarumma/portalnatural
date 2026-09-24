import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtMoney, fmtQty, UNIDADES } from '../lib/format.js';
import { EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useAutoFocus, useToast } from '../components/ui.jsx';

const empty = { nombre: '', categoria: '', unidad: 'un', precio: '', costo: '', stock: '', stock_minimo: '', activo: true };

export default function Articulos() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('productos').select('*').order('nombre');
    if (err) setError(err);
    else setRows(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categorias = useMemo(() => [...new Set((rows ?? []).map((p) => p.categoria).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (!showInactive && !p.activo) return false;
      if (cat && p.categoria !== cat) return false;
      if (!s) return true;
      return [p.nombre, p.categoria].some((v) => v?.toLowerCase().includes(s));
    });
  }, [rows, q, cat, showInactive]);

  async function save(values) {
    setBusy(true);
    const payload = {
      nombre: values.nombre.trim(),
      categoria: values.categoria.trim() || null,
      unidad: values.unidad,
      precio: Number(values.precio) || 0,
      costo: values.costo === '' ? null : Number(values.costo),
      stock_minimo: Number(values.stock_minimo) || 0,
      activo: values.activo,
    };
    let err;
    if (editing?.id) {
      ({ error: err } = await supabase.from('productos').update(payload).eq('id', editing.id));
    } else {
      const stockInicial = Number(values.stock) || 0;
      const res = await supabase.from('productos').insert({ ...payload, stock: 0 }).select('id').single();
      err = res.error;
      if (!err && stockInicial > 0) {
        ({ error: err } = await supabase.rpc('ajustar_stock', { p_producto_id: res.data.id, p_cantidad: stockInicial, p_tipo: 'ingreso', p_motivo: 'Stock inicial' }));
      }
    }
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(editing?.id ? 'Artículo actualizado' : 'Artículo creado');
    setEditing(null);
    load();
  }

  return (
    <>
      <PageHead
        title="Artículos"
        subtitle={rows ? `${rows.filter((p) => p.activo).length} artículos activos · ${categorias.length} categorías` : null}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nuevo artículo
          </button>
        }
      />
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar artículo" />
        {categorias.length > 0 && (
          <select className="input input-sm input-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <label className={`chip chip-sm ${showInactive ? 'is-active' : ''}`}>
          <input type="checkbox" className="sr-only" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver inactivos
        </label>
      </div>
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && filtered.length === 0 && <EmptyState>{q || cat ? 'No hay artículos que coincidan.' : 'Todavía no cargaste artículos.'}</EmptyState>}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th className="num">Costo</th>
                <th className="num">Precio</th>
                <th className="num">Margen</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const margen = p.costo != null && Number(p.costo) > 0 ? Math.round(((Number(p.precio) - Number(p.costo)) / Number(p.costo)) * 100) : null;
                return (
                  <tr key={p.id} className={!p.activo ? 'is-inactive' : ''}>
                    <td>
                      <strong>{p.nombre}</strong>
                      {!p.activo && <span className="tag tag-neutral cell-tag">Inactivo</span>}
                    </td>
                    <td>{p.categoria || <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{UNIDADES.find((u) => u.value === p.unidad)?.label ?? p.unidad}</td>
                    <td className="num text-muted">{p.costo != null ? fmtMoney(p.costo) : '—'}</td>
                    <td className="num"><strong>{fmtMoney(p.precio)}</strong></td>
                    <td className="num text-muted">{margen != null ? `${margen}%` : '—'}</td>
                    <td className="col-actions">
                      <button type="button" className="btn btn-icon btn-secondary" onClick={() => setEditing(p)} aria-label={`Editar ${p.nombre}`} title="Editar">
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ArticuloForm initial={editing.id ? editing : empty} isNew={!editing.id} categorias={categorias} busy={busy} onSave={save} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function ArticuloForm({ initial, isNew, categorias, busy, onSave, onClose }) {
  const [v, setV] = useState({
    ...empty,
    ...Object.fromEntries(Object.entries(initial).map(([k, val]) => [k, val ?? ''])),
    activo: initial.activo ?? true,
  });
  const ref = useAutoFocus();
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <Modal title={isNew ? 'Nuevo artículo' : 'Editar artículo'} onClose={onClose}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.nombre.trim()) return;
          onSave(v);
        }}
      >
        <Field label="Nombre *" span>
          <input ref={ref} className="input" value={v.nombre} onChange={set('nombre')} required />
        </Field>
        <Field label="Categoría">
          <input className="input" value={v.categoria} onChange={set('categoria')} list="categorias-list" placeholder="Granel, Sin TACC…" />
          <datalist id="categorias-list">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Se vende por">
          <select className="input" value={v.unidad} onChange={set('unidad')}>
            {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label} ({u.value})</option>)}
          </select>
        </Field>
        <Field label={`Precio de venta por ${v.unidad} *`}>
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={v.precio} onChange={set('precio')} required />
        </Field>
        <Field label="Costo (opcional)" hint="Para calcular margen y valor del stock.">
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={v.costo} onChange={set('costo')} />
        </Field>
        {isNew ? (
          <Field label={`Stock inicial (${v.unidad})`} hint="Queda registrado como ingreso.">
            <input className="input" type="number" min="0" step="0.001" inputMode="decimal" value={v.stock} onChange={set('stock')} />
          </Field>
        ) : (
          <Field label="Stock actual" hint="Se modifica desde la sección Stock.">
            <input className="input" value={fmtQty(initial.stock, v.unidad)} disabled />
          </Field>
        )}
        <Field label={`Stock mínimo (${v.unidad})`} hint="Avisa cuando el stock llega a este valor.">
          <input className="input" type="number" min="0" step="0.001" inputMode="decimal" value={v.stock_minimo} onChange={set('stock_minimo')} />
        </Field>
        {!isNew && (
          <label className="check span-2">
            <input type="checkbox" checked={v.activo} onChange={set('activo')} /> Artículo activo (aparece al vender)
          </label>
        )}
        <div className="dialog-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

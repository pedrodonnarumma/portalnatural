import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Settings2, Trash2, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtMoney, fmtQty, UNIDADES } from '../lib/format.js';
import { Confirm, EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useAutoFocus, useToast } from '../components/ui.jsx';
import { etiquetaPresentacion, precioPresentacion } from '../../lib/precios.js';

// Opciones de venta_por según la unidad base.
const VENTA_POR_OPTS = {
  kg: [
    { value: 0.1,  label: '100 g'  },
    { value: 0.25, label: '250 g'  },
    { value: 0.5,  label: '500 g'  },
    { value: 1,    label: '1 kg'   },
  ],
  l: [
    { value: 0.25, label: '250 ml' },
    { value: 0.5,  label: '500 ml' },
    { value: 1,    label: '1 l'    },
  ],
  un: [
    { value: 1, label: 'unidad' },
  ],
  g: [
    { value: 1, label: 'gramo' },
  ],
};

const empty = {
  nombre: '', categoria_id: '', unidad: 'un', venta_por: '1',
  precio: '', costo: '', stock: '', stock_minimo: '',
  activo: true, imagen_url: '', descripcion: '',
};

export default function Articulos() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null);
  const [managingCats, setManagingCats] = useState(false);
  const [busy, setBusy] = useState(false);

  const destacadoCount = useMemo(() => (rows ?? []).filter((p) => p.destacado && p.activo).length, [rows]);

  async function toggleDestacado(p) {
    const next = !p.destacado;
    if (next && destacadoCount >= 6) return toast('Límite de 6 productos en vidriera. Quitá uno primero.', 'error');
    setRows((list) => list.map((x) => x.id === p.id ? { ...x, destacado: next } : x));
    const { error } = await supabase.from('productos').update({ destacado: next }).eq('id', p.id);
    if (error) {
      setRows((list) => list.map((x) => x.id === p.id ? { ...x, destacado: p.destacado } : x));
      toast(error.message, 'error');
    }
  }

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('categorias').select('*').order('orden').order('nombre'),
    ]);
    if (p.error) setError(p.error);
    else setRows(p.data);
    if (!c.error) setCategorias(c.data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (!showInactive && !p.activo) return false;
      if (catFilter && p.categoria_id !== catFilter) return false;
      if (!s) return true;
      return [p.nombre, p.categoria].some((v) => v?.toLowerCase().includes(s));
    });
  }, [rows, q, catFilter, showInactive]);

  async function save(values) {
    setBusy(true);
    const catNombre = categorias.find((c) => c.id === values.categoria_id)?.nombre ?? null;
    const vp = Number(values.venta_por) || 1;
    // El admin ingresa el precio de la presentación; se guarda precio base (por unidad completa).
    const precioBase = vp > 0 ? Math.round(Number(values.precio) / vp) : Number(values.precio);
    const payload = {
      nombre: values.nombre.trim(),
      categoria_id: values.categoria_id || null,
      categoria: catNombre,
      unidad: values.unidad,
      venta_por: vp,
      precio: precioBase,
      costo: values.costo === '' ? null : Number(values.costo),
      stock_minimo: Number(values.stock_minimo) || 0,
      activo: values.activo,
      imagen_url: values.imagen_url?.trim() || null,
      descripcion: values.descripcion?.trim() || null,
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
        subtitle={rows ? `${rows.filter((p) => p.activo).length} artículos activos · ${categorias.length} categorías · ${destacadoCount}/6 en vidriera` : null}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setManagingCats(true)}>
              <Settings2 size={16} /> Categorías
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Nuevo artículo
            </button>
          </div>
        }
      />
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar artículo" />
        {categorias.length > 0 && (
          <select className="input input-sm input-auto" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
        <label className={`chip chip-sm ${showInactive ? 'is-active' : ''}`}>
          <input type="checkbox" className="sr-only" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver inactivos
        </label>
      </div>
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && filtered.length === 0 && <EmptyState>{q || catFilter ? 'No hay artículos que coincidan.' : 'Todavía no cargaste artículos.'}</EmptyState>}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Artículo</th>
                <th>Categoría</th>
                <th>Presentación</th>
                <th className="num">Precio público</th>
                <th className="num">Margen</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const vp = Number(p.venta_por) || 1;
                const precioPublico = precioPresentacion(p.precio, vp);
                const etiqUnidad = etiquetaPresentacion(p.unidad, vp);
                const margen = p.costo != null && Number(p.costo) > 0
                  ? Math.round(((Number(p.precio) - Number(p.costo)) / Number(p.costo)) * 100)
                  : null;
                const catNombre = categorias.find((c) => c.id === p.categoria_id)?.nombre ?? p.categoria;
                return (
                  <tr key={p.id} className={!p.activo ? 'is-inactive' : ''}>
                    <td>
                      <div className="product-row">
                        {p.imagen_url
                          ? <img src={p.imagen_url} alt="" className="product-thumb" />
                          : <div className="product-thumb product-thumb-empty" aria-hidden="true" />}
                        <div>
                          <strong>{p.nombre}</strong>
                          {!p.activo && <span className="tag tag-neutral cell-tag">Inactivo</span>}
                        </div>
                      </div>
                    </td>
                    <td>{catNombre || <span className="text-muted">—</span>}</td>
                    <td className="text-muted">{etiqUnidad}</td>
                    <td className="num"><strong>{fmtMoney(precioPublico)}</strong></td>
                    <td className="num text-muted">{margen != null ? `${margen}%` : '—'}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className={`btn btn-icon ${p.destacado ? 'btn-featured' : 'btn-secondary'}`}
                        onClick={() => toggleDestacado(p)}
                        disabled={!p.destacado && destacadoCount >= 6}
                        aria-label={p.destacado ? `Quitar ${p.nombre} de vidriera` : `Destacar ${p.nombre} en vidriera`}
                        title={p.destacado ? 'En vidriera — click para quitar' : destacadoCount >= 6 ? 'Límite alcanzado (6/6)' : 'Agregar a vidriera'}
                      >
                        <Star size={15} fill={p.destacado ? 'currentColor' : 'none'} />
                      </button>
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
        <ArticuloForm
          initial={editing.id ? editing : empty}
          isNew={!editing.id}
          categorias={categorias}
          busy={busy}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {managingCats && (
        <CategoriasModal
          categorias={categorias}
          onClose={() => { setManagingCats(false); load(); }}
        />
      )}
    </>
  );
}

/* ─── Gestión de categorías ─── */

function CategoriasModal({ categorias: initial, onClose }) {
  const toast = useToast();
  const [cats, setCats] = useState(initial.map((c) => ({ ...c, _dirty: false })));
  const [nueva, setNueva] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const ref = useAutoFocus();

  async function addCat(e) {
    e.preventDefault();
    const nombre = nueva.trim();
    if (!nombre) return;
    setBusy(true);
    const { data, error } = await supabase.from('categorias').insert({ nombre }).select().single();
    setBusy(false);
    if (error) return toast(error.message, 'error');
    setCats((list) => [...list, { ...data, _dirty: false }]);
    setNueva('');
    toast('Categoría creada');
  }

  async function saveCat(cat) {
    const nombre = cat.nombre.trim();
    if (!nombre) return;
    const { error } = await supabase.from('categorias').update({ nombre, orden: cat.orden }).eq('id', cat.id);
    if (error) return toast(error.message, 'error');
    setCats((list) => list.map((c) => c.id === cat.id ? { ...cat, _dirty: false } : c));
    toast('Guardado');
  }

  async function deleteCat() {
    setBusy(true);
    const { error } = await supabase.from('categorias').delete().eq('id', deleting.id);
    setBusy(false);
    if (error) return toast(error.message, 'error');
    setCats((list) => list.filter((c) => c.id !== deleting.id));
    setDeleting(null);
    toast('Categoría eliminada');
  }

  const update = (id, k, val) =>
    setCats((list) => list.map((c) => c.id === id ? { ...c, [k]: val, _dirty: true } : c));

  return (
    <>
      <Modal title="Gestionar categorías" onClose={onClose}>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Editá el nombre o el orden directamente en la tabla. Los cambios se guardan al salir del campo.
        </p>
        {cats.length === 0 && <EmptyState>No hay categorías. Creá la primera abajo.</EmptyState>}
        {cats.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="num" style={{ width: 90 }}>Orden</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        className="input input-sm"
                        style={{ width: '100%' }}
                        value={c.nombre}
                        onChange={(e) => update(c.id, 'nombre', e.target.value)}
                        onBlur={() => c._dirty && saveCat(c)}
                      />
                    </td>
                    <td>
                      <input
                        className="input input-sm num"
                        type="number"
                        style={{ width: 70 }}
                        value={c.orden}
                        onChange={(e) => update(c.id, 'orden', Number(e.target.value))}
                        onBlur={() => c._dirty && saveCat(c)}
                        title="Número de orden en el catálogo (menor = primero)"
                      />
                    </td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn-icon btn-secondary"
                        onClick={() => setDeleting(c)}
                        aria-label={`Eliminar ${c.nombre}`}
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addCat} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <input
            ref={ref}
            className="input"
            style={{ flex: 1 }}
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Nueva categoría…"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !nueva.trim()}>
            <Plus size={15} /> Agregar
          </button>
        </form>

        <div className="dialog-actions" style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </Modal>

      {deleting && (
        <Confirm
          title={`Eliminar "${deleting.nombre}"`}
          text="Los artículos de esta categoría quedan sin categoría asignada. No se puede deshacer."
          confirmLabel="Eliminar"
          danger
          busy={busy}
          onConfirm={deleteCat}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

/* ─── Upload de imagen ─── */

function ImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('productos').upload(path, file, { upsert: true });
    if (error) { setUploading(false); return toast(error.message, 'error'); }
    const { data } = supabase.storage.from('productos').getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="image-upload">
      {value && <img src={value} alt="Vista previa" className="image-preview-sm" />}
      <div className="image-upload-controls">
        <input
          className="input"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {uploading ? 'Subiendo…' : 'Subir foto'}
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

/* ─── Formulario artículo ─── */

function ArticuloForm({ initial, isNew, categorias, busy, onSave, onClose }) {
  const vp = Number(initial.venta_por) || 1;
  // Al editar, mostrar el precio en la presentación elegida.
  const precioInicial = initial.precio !== '' && !isNew
    ? String(precioPresentacion(initial.precio, vp))
    : (initial.precio ?? '');

  const [v, setV] = useState({
    ...empty,
    ...Object.fromEntries(Object.entries(initial).map(([k, val]) => [k, val ?? ''])),
    activo: initial.activo ?? true,
    categoria_id: initial.categoria_id ?? '',
    venta_por: String(vp),
    precio: precioInicial,
  });
  const ref = useAutoFocus();
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  // Cuando cambia la unidad, resetear venta_por al primer valor disponible.
  function handleUnidad(e) {
    const u = e.target.value;
    const opts = VENTA_POR_OPTS[u] ?? [{ value: 1, label: 'unidad' }];
    setV((s) => ({ ...s, unidad: u, venta_por: String(opts[0].value) }));
  }

  const ventaPorOpts = VENTA_POR_OPTS[v.unidad] ?? [{ value: 1, label: 'unidad' }];
  const etiqPrecio = etiquetaPresentacion(v.unidad, Number(v.venta_por) || 1);

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
        <Field label="Descripción" span hint="Se muestra en la tarjeta del catálogo público.">
          <textarea className="input" rows={2} value={v.descripcion} onChange={set('descripcion')} placeholder="Ej: Almendras tostadas sin sal, ideales para snack o repostería." />
        </Field>
        <Field label="Categoría">
          <select className="input" value={v.categoria_id} onChange={set('categoria_id')}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </Field>
        <Field label="Unidad base">
          <select className="input" value={v.unidad} onChange={handleUnidad}>
            {UNIDADES.map((u) => <option key={u.value} value={u.value}>{u.label} ({u.value})</option>)}
          </select>
        </Field>
        <Field label="Se vende por">
          <select className="input" value={v.venta_por} onChange={set('venta_por')}>
            {ventaPorOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label={`Precio por ${etiqPrecio} *`} hint="Se guarda el precio por unidad base automáticamente.">
          <input className="input" type="number" min="0" step="1" inputMode="decimal" value={v.precio} onChange={set('precio')} required />
        </Field>
        <Field label="Costo por unidad base (opcional)" hint="Para calcular margen y valor del stock.">
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={v.costo} onChange={set('costo')} />
        </Field>
        {isNew ? (
          <Field label={`Stock inicial (${v.unidad})`} hint="En unidad base. Queda registrado como ingreso.">
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
        <Field label="Imagen" span hint="Subí una foto o pegá una URL.">
          <ImageUpload value={v.imagen_url} onChange={(url) => setV((s) => ({ ...s, imagen_url: url }))} />
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

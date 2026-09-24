import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { Confirm, EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useAutoFocus, useToast } from '../components/ui.jsx';

const empty = { nombre: '', telefono: '', email: '', direccion: '', notas: '', acepta_promos: true };

export default function Clientes() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (nuevo) | cliente
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('clientes').select('*').order('nombre');
    if (err) setError(err);
    else setRows(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) => [c.nombre, c.telefono, c.email, c.direccion].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);

  async function save(values) {
    setBusy(true);
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
    if (payload.email) payload.email = payload.email.toLowerCase();
    const query = editing?.id
      ? supabase.from('clientes').update(payload).eq('id', editing.id)
      : supabase.from('clientes').insert(payload);
    const { error: err } = await query;
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(editing?.id ? 'Cliente actualizado' : 'Cliente creado');
    setEditing(null);
    load();
  }

  async function remove() {
    setBusy(true);
    const { error: err } = await supabase.from('clientes').delete().eq('id', deleting.id);
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast('Cliente eliminado');
    setDeleting(null);
    load();
  }

  return (
    <>
      <PageHead
        title="Clientes"
        subtitle={rows ? `${rows.length} cliente${rows.length === 1 ? '' : 's'}` : null}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nuevo cliente
          </button>
        }
      />
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nombre, teléfono o correo" />
      </div>
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && filtered.length === 0 && <EmptyState>{q ? 'No hay clientes que coincidan.' : 'Todavía no cargaste clientes.'}</EmptyState>}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nombre}</strong>
                    {c.notas && <div className="text-muted cell-sub">{c.notas}</div>}
                  </td>
                  <td>{c.telefono || <span className="text-muted">—</span>}</td>
                  <td>
                    {c.email || <span className="text-muted">—</span>}
                    {c.email && !c.acepta_promos && <div className="text-muted cell-sub">Sin promos</div>}
                  </td>
                  <td>{c.direccion || <span className="text-muted">—</span>}</td>
                  <td className="col-actions">
                    <button type="button" className="btn btn-icon btn-secondary" onClick={() => setEditing(c)} aria-label={`Editar ${c.nombre}`}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="btn btn-icon btn-secondary" onClick={() => setDeleting(c)} aria-label={`Eliminar ${c.nombre}`}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ClienteForm initial={editing.id ? editing : empty} isNew={!editing.id} busy={busy} onSave={save} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Confirm
          title="Eliminar cliente"
          text={`¿Eliminar a ${deleting.nombre}? Las ventas asociadas se conservan sin cliente.`}
          confirmLabel="Eliminar"
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}

function ClienteForm({ initial, isNew, busy, onSave, onClose }) {
  const [v, setV] = useState({ ...empty, ...stripNulls(initial) });
  const ref = useAutoFocus();
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <Modal title={isNew ? 'Nuevo cliente' : 'Editar cliente'} onClose={onClose}>
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
        <Field label="Teléfono">
          <input className="input" value={v.telefono} onChange={set('telefono')} inputMode="tel" />
        </Field>
        <Field label="Correo">
          <input className="input" value={v.email} onChange={set('email')} type="email" />
        </Field>
        <Field label="Dirección" span>
          <input className="input" value={v.direccion} onChange={set('direccion')} />
        </Field>
        <Field label="Notas" span>
          <textarea className="input" value={v.notas} onChange={set('notas')} rows={2} />
        </Field>
        <label className="check span-2">
          <input type="checkbox" checked={v.acepta_promos} onChange={set('acepta_promos')} /> Recibe promociones por correo
        </label>
        <div className="dialog-actions span-2">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function stripNulls(o) {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v ?? (k === 'acepta_promos' ? true : '')]));
}

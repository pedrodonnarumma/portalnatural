import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Send, Mail, X } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { fmtDate, fmtMoney, startOfDayISO, toDateInput } from '../lib/format.js';
import { Confirm, EmptyState, ErrorBox, Field, Modal, PageHead, SearchBox, Spinner, useAutoFocus, useToast } from '../components/ui.jsx';

const SELECT = 'id, titulo, descripcion, fecha_inicio, fecha_fin, activa, enviar_auto, enviada_at, created_at, items:promocion_items(id, producto_id, precio_promo, producto:productos(id, nombre, precio, unidad, activo)), envios:envios_promocion(estado)';

function estado(p) {
  const hoy = toDateInput();
  if (!p.activa) return { label: 'Inactiva', cls: 'tag-neutral' };
  if (p.fecha_inicio > hoy) return { label: 'Programada', cls: 'tag-outline' };
  if (p.fecha_fin && p.fecha_fin < hoy) return { label: 'Vencida', cls: 'tag-neutral' };
  return { label: 'Vigente', cls: 'tag-accent-2' };
}

export default function Promociones() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [sending, setSending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [clientesConMail, setClientesConMail] = useState(null);

  const load = useCallback(async () => {
    const [{ data, error: err }, { count }] = await Promise.all([
      supabase.from('promociones').select(SELECT).order('fecha_inicio', { ascending: false }),
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('acepta_promos', true).not('email', 'is', null).neq('email', ''),
    ]);
    if (err) setError(err);
    else setRows(data);
    setClientesConMail(count ?? 0);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values, items) {
    setBusy(true);
    const payload = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim() || null,
      fecha_inicio: values.fecha_inicio,
      fecha_fin: values.fecha_fin || null,
      activa: values.activa,
      enviar_auto: values.enviar_auto,
    };
    let id = editing?.id;
    let err;
    if (id) {
      ({ error: err } = await supabase.from('promociones').update(payload).eq('id', id));
    } else {
      const res = await supabase.from('promociones').insert(payload).select('id').single();
      err = res.error;
      id = res.data?.id;
    }
    if (!err) {
      // Reemplaza los ítems completos: simple y suficiente para listas cortas.
      ({ error: err } = await supabase.from('promocion_items').delete().eq('promocion_id', id));
      if (!err && items.length) {
        ({ error: err } = await supabase
          .from('promocion_items')
          .insert(items.map((it) => ({ promocion_id: id, producto_id: it.producto_id, precio_promo: Number(it.precio_promo) }))));
      }
    }
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast(editing?.id ? 'Promoción actualizada' : 'Promoción creada');
    setEditing(null);
    load();
  }

  async function remove() {
    setBusy(true);
    const { error: err } = await supabase.from('promociones').delete().eq('id', deleting.id);
    setBusy(false);
    if (err) return toast(err.message, 'error');
    toast('Promoción eliminada');
    setDeleting(null);
    load();
  }

  async function send(promo, testEmail) {
    setBusy(true);
    const { data, error: err } = await supabase.functions.invoke('enviar-promocion', {
      body: { promocion_id: promo.id, ...(testEmail ? { test_email: testEmail } : {}) },
    });
    setBusy(false);
    const msg = err ? await readFnError(err) : data?.error;
    if (msg) return toast(msg, 'error');
    if (testEmail) return toast(`Prueba enviada a ${testEmail}`);
    toast(`Enviado a ${data.enviados} cliente${data.enviados === 1 ? '' : 's'}${data.errores ? ` · ${data.errores} con error` : ''}`, data.errores ? 'error' : 'ok');
    setSending(null);
    load();
  }

  return (
    <>
      <PageHead
        title="Promociones"
        subtitle={clientesConMail !== null ? `${clientesConMail} cliente${clientesConMail === 1 ? '' : 's'} con correo reciben promociones` : null}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
            <Plus size={16} /> Nueva promoción
          </button>
        }
      />
      <ErrorBox error={error} />
      {!rows && !error && <Spinner />}
      {rows && rows.length === 0 && <EmptyState>Todavía no armaste ninguna promoción.</EmptyState>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Promoción</th>
                <th>Vigencia</th>
                <th className="num">Productos</th>
                <th>Estado</th>
                <th>Mail</th>
                <th className="col-actions" aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st = estado(p);
                const enviados = p.envios.filter((e) => e.estado === 'enviado').length;
                return (
                  <tr key={p.id} className={!p.activa ? 'is-inactive' : ''}>
                    <td>
                      <strong>{p.titulo}</strong>
                      {p.descripcion && <div className="text-muted cell-sub">{p.descripcion}</div>}
                    </td>
                    <td className="nowrap">
                      {fmtDate(startOfDayISO(p.fecha_inicio))}{p.fecha_fin ? ` – ${fmtDate(startOfDayISO(p.fecha_fin))}` : ' en adelante'}
                    </td>
                    <td className="num">{p.items.length}</td>
                    <td><span className={`tag ${st.cls}`}>{st.label}</span></td>
                    <td className="text-muted">
                      {p.enviada_at ? `Enviado ${fmtDate(p.enviada_at)} (${enviados})` : p.enviar_auto ? 'Automático al iniciar' : 'Sin enviar'}
                    </td>
                    <td className="col-actions">
                      <button type="button" className="btn btn-icon btn-secondary" onClick={() => setSending(p)} aria-label={`Enviar ${p.titulo}`} title="Enviar por mail" disabled={p.items.length === 0}>
                        <Send size={15} />
                      </button>
                      <button type="button" className="btn btn-icon btn-secondary" onClick={() => setEditing(p)} aria-label={`Editar ${p.titulo}`} title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="btn btn-icon btn-secondary" onClick={() => setDeleting(p)} aria-label={`Eliminar ${p.titulo}`} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PromoForm initial={editing.id ? editing : null} busy={busy} onSave={save} onClose={() => setEditing(null)} />}
      {deleting && (
        <Confirm
          title="Eliminar promoción"
          text={`¿Eliminar “${deleting.titulo}”? Se borra también el historial de envíos.`}
          confirmLabel="Eliminar"
          danger
          busy={busy}
          onConfirm={remove}
          onClose={() => setDeleting(null)}
        />
      )}
      {sending && <EnviarDialog promo={sending} destinatarios={clientesConMail ?? 0} busy={busy} onSend={send} onClose={() => setSending(null)} />}
    </>
  );
}

async function readFnError(err) {
  // supabase-js envuelve el error HTTP; el body trae { error } de la función.
  try {
    const body = await err.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    /* sin body */
  }
  return err.message || 'No se pudo enviar';
}

/* ───────── Formulario ───────── */
function PromoForm({ initial, busy, onSave, onClose }) {
  const [v, setV] = useState({
    titulo: initial?.titulo ?? '',
    descripcion: initial?.descripcion ?? '',
    fecha_inicio: initial?.fecha_inicio ?? toDateInput(),
    fecha_fin: initial?.fecha_fin ?? '',
    activa: initial?.activa ?? true,
    enviar_auto: initial?.enviar_auto ?? false,
  });
  const [items, setItems] = useState(
    (initial?.items ?? []).filter((it) => it.producto).map((it) => ({ producto_id: it.producto_id, nombre: it.producto.nombre, precio: Number(it.producto.precio), unidad: it.producto.unidad, precio_promo: it.precio_promo }))
  );
  const [productos, setProductos] = useState(null);
  const [q, setQ] = useState('');
  const ref = useAutoFocus();
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  useEffect(() => {
    supabase.from('productos').select('id, nombre, categoria, precio, unidad').eq('activo', true).order('nombre').then(({ data }) => setProductos(data ?? []));
  }, []);

  const results = useMemo(() => {
    if (!productos) return [];
    const s = q.trim().toLowerCase();
    const chosen = new Set(items.map((it) => it.producto_id));
    return productos.filter((p) => !chosen.has(p.id) && (!s || [p.nombre, p.categoria].some((x) => x?.toLowerCase().includes(s)))).slice(0, 10);
  }, [productos, q, items]);

  function add(p) {
    setItems((list) => [...list, { producto_id: p.id, nombre: p.nombre, precio: Number(p.precio), unidad: p.unidad, precio_promo: Math.round(Number(p.precio) * 0.9) }]);
    setQ('');
  }
  const update = (i, val) => setItems((list) => list.map((x, j) => (j === i ? { ...x, precio_promo: val } : x)));
  const remove = (i) => setItems((list) => list.filter((_, j) => j !== i));
  const valid = v.titulo.trim() && v.fecha_inicio && items.length > 0 && items.every((it) => it.precio_promo !== '' && Number(it.precio_promo) >= 0);

  return (
    <Modal title={initial ? 'Editar promoción' : 'Nueva promoción'} onClose={onClose} wide>
      <form
        className="sale"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(v, items);
        }}
      >
        <div className="form-grid">
          <Field label="Título *" span>
            <input ref={ref} className="input" value={v.titulo} onChange={set('titulo')} placeholder="Semana de las semillas" required />
          </Field>
          <Field label="Texto del mail" span>
            <textarea className="input" rows={2} value={v.descripcion} onChange={set('descripcion')} placeholder="Contale a tus clientes de qué se trata." />
          </Field>
          <Field label="Desde *">
            <input className="input" type="date" value={v.fecha_inicio} onChange={set('fecha_inicio')} required />
          </Field>
          <Field label="Hasta" hint="Vacío = sin fecha de fin.">
            <input className="input" type="date" value={v.fecha_fin} min={v.fecha_inicio} onChange={set('fecha_fin')} />
          </Field>
          <label className="check">
            <input type="checkbox" checked={v.activa} onChange={set('activa')} /> Activa (aplica el precio promo en ventas)
          </label>
          <label className="check">
            <input type="checkbox" checked={v.enviar_auto} onChange={set('enviar_auto')} /> Enviar el mail automáticamente al iniciar
          </label>
        </div>

        <div>
          <div className="field admin-field"><label>Productos en promoción *</label></div>
          <SearchBox value={q} onChange={setQ} placeholder="Buscar producto para agregar…" />
          {!productos && <Spinner />}
          {productos && (
            <div className="sale-results">
              {results.map((p) => (
                <button key={p.id} type="button" className="sale-result" onClick={() => add(p)}>
                  <span className="sale-result-name">{p.nombre}</span>
                  <span className="text-muted sale-result-meta">{fmtMoney(p.precio)} / {p.unidad}</span>
                </button>
              ))}
              {results.length === 0 && <div className="text-muted sale-none">{productos.length === 0 ? 'No hay artículos activos. Cargalos en Artículos.' : 'Sin coincidencias.'}</div>}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="table-wrap">
            <table className="table sale-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="num">Precio normal</th>
                  <th className="num">Precio promo</th>
                  <th className="num">Dto.</th>
                  <th aria-label="Quitar" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const off = it.precio > 0 ? Math.round((1 - Number(it.precio_promo) / it.precio) * 100) : 0;
                  return (
                    <tr key={it.producto_id}>
                      <td><strong>{it.nombre}</strong> <span className="text-muted">/ {it.unidad}</span></td>
                      <td className="num text-muted">{fmtMoney(it.precio)}</td>
                      <td className="num">
                        <input className="input input-sm" type="number" min="0" step="0.01" inputMode="decimal" value={it.precio_promo} onChange={(e) => update(i, e.target.value)} aria-label="Precio promocional" />
                      </td>
                      <td className={`num ${off > 0 ? 'stock-up' : 'text-muted'}`}>{off > 0 ? `-${off}%` : '—'}</td>
                      <td className="col-actions">
                        <button type="button" className="btn btn-icon btn-secondary" onClick={() => remove(i)} aria-label={`Quitar ${it.nombre}`}>
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={!valid || busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────── Envío ───────── */
function EnviarDialog({ promo, destinatarios, busy, onSend, onClose }) {
  const [test, setTest] = useState('');
  return (
    <Modal title={`Enviar “${promo.titulo}”`} onClose={onClose}>
      <p className="dialog-body">
        Se manda un mail con los {promo.items.length} producto{promo.items.length === 1 ? '' : 's'} y sus precios promocionales a <strong>{destinatarios}</strong> cliente{destinatarios === 1 ? '' : 's'} con correo que aceptan promociones.
        {promo.enviada_at && <> Ya se envió el {fmtDate(promo.enviada_at)}; volver a enviar manda el mail de nuevo.</>}
      </p>
      <div className="send-test">
        <input className="input" type="email" placeholder="Mandar una prueba a este correo" value={test} onChange={(e) => setTest(e.target.value)} />
        <button type="button" className="btn btn-secondary" disabled={!test.includes('@') || busy} onClick={() => onSend(promo, test.trim())}>
          <Mail size={15} /> Prueba
        </button>
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={busy || destinatarios === 0} onClick={() => onSend(promo)}>
          <Send size={15} /> {busy ? 'Enviando…' : `Enviar a ${destinatarios}`}
        </button>
      </div>
    </Modal>
  );
}

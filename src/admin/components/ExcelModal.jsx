import { useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { endOfDayISO, MEDIOS_PAGO, startOfDayISO, toDateInput } from '../lib/format.js';
import { ErrorBox, Modal } from './ui.jsx';
import { exportarVentas, exportarReportes } from '../lib/excel.js';

/* ── Presets de período ── */
const PRESETS = [
  { key: 'hoy',    label: 'Hoy'            },
  { key: 'semana', label: 'Esta semana'     },
  { key: 'mes',    label: 'Este mes'        },
  { key: 'mesant', label: 'Mes anterior'    },
  { key: '30',     label: 'Últimos 30 días' },
  { key: 'año',    label: 'Este año'        },
  { key: 'custom', label: 'Personalizado'   },
];

const HOJAS_REPORTES = [
  { key: 'dia',       label: 'Ventas por día'        },
  { key: 'productos', label: 'Productos más vendidos' },
  { key: 'medios',    label: 'Medios de pago'         },
  { key: 'clientes',  label: 'Mejores clientes'       },
  { key: 'stock',     label: 'Stock bajo (al exportar)' },
];

function presetRange(key) {
  const hoy = new Date();
  const fmt = toDateInput;
  if (key === 'hoy')    return [fmt(hoy), fmt(hoy)];
  if (key === 'semana') {
    const dow = (hoy.getDay() + 6) % 7;
    const lun = new Date(hoy); lun.setDate(hoy.getDate() - dow);
    return [fmt(lun), fmt(hoy)];
  }
  if (key === 'mes')    return [fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), fmt(hoy)];
  if (key === 'mesant') {
    const ini = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
    return [fmt(ini), fmt(fin)];
  }
  if (key === '30')     { const d = new Date(hoy); d.setDate(hoy.getDate() - 29); return [fmt(d), fmt(hoy)]; }
  if (key === 'año')    return [fmt(new Date(hoy.getFullYear(), 0, 1)), fmt(hoy)];
  return [fmt(hoy), fmt(hoy)];
}

function detectPreset(desde, hasta) {
  if (!desde || !hasta) return 'mes';
  for (const { key } of PRESETS) {
    if (key === 'custom') continue;
    const [d, h] = presetRange(key);
    if (d === desde && h === hasta) return key;
  }
  return 'custom';
}

/* ── Checkboxes helper ── */
function toggle(list, val) {
  return list.includes(val) ? list.filter((x) => x !== val) : [...list, val];
}

/* ── Componente principal ── */
export default function ExcelModal({ contexto, desdeInicial, hastaInicial, userEmail, onClose }) {
  const initPreset = useMemo(() => detectPreset(desdeInicial, hastaInicial), []);
  const [preset, setPreset] = useState(initPreset);
  const [custom, setCustom] = useState([
    desdeInicial ?? toDateInput(new Date()),
    hastaInicial ?? toDateInput(new Date()),
  ]);
  const [desde, hasta] = preset === 'custom' ? custom : presetRange(preset);

  // Filtros compartidos
  const [estados,  setEstados]  = useState(['pagada']);
  const [medios,   setMedios]   = useState([]);       // vacío = todos
  const [origen,   setOrigen]   = useState('');        // vacío = todos

  // Filtros solo Ventas
  const [clienteId,  setClienteId]  = useState('');
  const [clienteQ,   setClienteQ]   = useState('');
  const [selCats,    setSelCats]     = useState([]);   // vacío = todas
  const [selProds,   setSelProds]    = useState([]);   // vacío = todos
  const [conDetalle, setConDetalle]  = useState(true);

  // Filtros solo Reportes
  const [hojas, setHojas] = useState(['dia', 'productos', 'medios', 'clientes', 'stock']);

  // Listas para los filtros
  const [categorias,   setCategorias]   = useState([]);
  const [prodList,     setProdList]      = useState([]);
  const [clienteList,  setClienteList]   = useState([]);

  // Preview
  const [preview,     setPreview]      = useState(null);
  const [pvBusy,      setPvBusy]       = useState(false);

  // Generación
  const [generando, setGenerando] = useState(false);
  const [error,     setError]     = useState(null);

  // Carga listas de filtros
  useEffect(() => {
    Promise.all([
      supabase.from('productos').select('id, nombre, categoria').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre').order('nombre'),
    ]).then(([p, c]) => {
      const ps = p.data ?? [];
      setProdList(ps);
      setClienteList(c.data ?? []);
      const cats = [...new Set(ps.map((x) => x.categoria).filter(Boolean))].sort();
      setCategorias(cats);
    });
  }, []);

  // Preview (debounced 400 ms)
  useEffect(() => {
    if (!desde || !hasta || desde > hasta || estados.length === 0) {
      setPreview({ n: 0, total: 0 });
      return;
    }
    setPvBusy(true);
    const needItems = selCats.length > 0 || selProds.length > 0;
    const timer = setTimeout(async () => {
      const sel = needItems
        ? 'id, total, items:venta_items(producto_id, producto:productos(categoria))'
        : 'id, total';
      let q = supabase
        .from('ventas')
        .select(sel)
        .gte('fecha', startOfDayISO(desde))
        .lte('fecha', endOfDayISO(hasta))
        .in('estado', estados);
      if (medios.length > 0)  q = q.in('medio_pago', medios);
      if (origen)             q = q.eq('origen', origen);
      if (clienteId)          q = q.eq('cliente_id', clienteId);
      const { data } = await q;
      let rows = data ?? [];
      if (needItems) {
        rows = rows.filter((v) => (v.items ?? []).some((it) => {
          const cat = it.producto?.categoria ?? null;
          const ok_cat  = selCats.length  === 0 || (cat  !== null && selCats.includes(cat));
          const ok_prod = selProds.length === 0 || selProds.includes(it.producto_id);
          return ok_cat && ok_prod;
        }));
      }
      setPreview({
        n:     rows.length,
        total: rows.reduce((a, v) => a + Number(v.total), 0),
      });
      setPvBusy(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [desde, hasta, estados, medios, origen, clienteId, selCats, selProds]);

  // Productos filtrados por categorías seleccionadas
  const prodsDisp = useMemo(
    () => selCats.length === 0 ? prodList : prodList.filter((p) => selCats.includes(p.categoria)),
    [prodList, selCats],
  );

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(
    () => clienteQ.trim()
      ? clienteList.filter((c) => c.nombre.toLowerCase().includes(clienteQ.trim().toLowerCase())).slice(0, 8)
      : [],
    [clienteList, clienteQ],
  );

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      // Fetch completo con todos los campos
      let q = supabase
        .from('ventas')
        .select('id, numero, fecha, estado, origen, medio_pago, total, notas, contacto_nombre, contacto_telefono, direccion_envio, cliente:clientes(id, nombre), items:venta_items(nombre, cantidad, precio_unitario, subtotal, producto_id, producto:productos(unidad, categoria))')
        .gte('fecha', startOfDayISO(desde))
        .lte('fecha', endOfDayISO(hasta))
        .in('estado', estados)
        .order('fecha');
      if (medios.length > 0)  q = q.in('medio_pago', medios);
      if (origen)             q = q.eq('origen', origen);
      if (clienteId)          q = q.eq('cliente_id', clienteId);
      const { data: ventas, error: errV } = await q;
      if (errV) throw errV;

      // Filtro client-side por categoría/producto
      let filtradas = ventas ?? [];
      if (selCats.length > 0 || selProds.length > 0) {
        filtradas = filtradas.filter((v) => (v.items ?? []).some((it) => {
          const cat = it.producto?.categoria ?? null;
          const ok_cat  = selCats.length  === 0 || (cat  !== null && selCats.includes(cat));
          const ok_prod = selProds.length === 0 || selProds.includes(it.producto_id);
          return ok_cat && ok_prod;
        }));
      }

      const filtros = buildFiltros({ desde, hasta, estados, medios, origen, clienteId, clienteList, selCats, selProds, prodList });

      if (contexto === 'ventas') {
        await exportarVentas({
          ventas: filtradas,
          filtros,
          opciones: {
            desde, hasta, conDetalle, userEmail,
            filtrosCatProd: { cats: selCats, prods: selProds },
          },
        });
      } else {
        // Para Reportes: fetch stock bajo al momento de exportar
        const { data: ps } = await supabase
          .from('productos')
          .select('id, nombre, unidad, stock, stock_minimo')
          .eq('activo', true);
        const lowStock = (ps ?? [])
          .filter((x) => Number(x.stock) <= Number(x.stock_minimo))
          .sort((a, b) => (a.stock - a.stock_minimo) - (b.stock - b.stock_minimo));

        await exportarReportes({ ventas: filtradas, lowStock, filtros, opciones: { desde, hasta, userEmail, hojas } });
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setGenerando(false);
    }
  }

  const canGenerate = estados.length > 0 && (preview?.n ?? 0) > 0 && !generando;

  return (
    <Modal title="Exportar a Excel" onClose={onClose} wide>
      <div className="xm-body">

        {/* Período */}
        <section className="xm-section">
          <div className="xm-label">Período</div>
          <div className="chips chips-inline xm-chips">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`chip chip-sm ${preset === p.key ? 'is-active' : ''}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="date-range" style={{ marginTop: 8 }}>
              <input className="input input-sm" type="date" value={custom[0]} max={custom[1]}
                onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="Desde" />
              <span className="text-muted">a</span>
              <input className="input input-sm" type="date" value={custom[1]} min={custom[0]}
                onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="Hasta" />
            </div>
          )}
        </section>

        <div className="xm-grid">
          {/* Estados */}
          <section className="xm-section">
            <div className="xm-label">Estados</div>
            <div className="xm-checks">
              {['pagada', 'pendiente', 'cancelada'].map((e) => (
                <label key={e} className="check">
                  <input type="checkbox" checked={estados.includes(e)} onChange={() => setEstados((s) => toggle(s, e))} />
                  <span className={`tag tag-${e === 'pagada' ? 'ok' : e === 'pendiente' ? 'warn' : 'danger'}`} style={{ fontSize: 13 }}>
                    {e === 'pagada' ? 'Pagada' : e === 'pendiente' ? 'Pendiente' : 'Cancelada'}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Medios de pago */}
          <section className="xm-section">
            <div className="xm-label">
              Medios de pago
              {medios.length > 0 && <button type="button" className="xm-clear" onClick={() => setMedios([])}>Todos</button>}
            </div>
            <div className="xm-checks">
              {MEDIOS_PAGO.map((m) => (
                <label key={m.value} className="check">
                  <input type="checkbox" checked={medios.length === 0 || medios.includes(m.value)} onChange={() => setMedios((s) => toggle(s.length === 0 ? MEDIOS_PAGO.map((x) => x.value) : s, m.value))} />
                  {m.label}
                </label>
              ))}
            </div>
          </section>

          {/* Origen */}
          <section className="xm-section">
            <div className="xm-label">Origen</div>
            <select className="input input-sm input-auto" value={origen} onChange={(e) => setOrigen(e.target.value)} style={{ appearance: 'auto' }}>
              <option value="">Todos</option>
              <option value="local">Local</option>
              <option value="web">Web</option>
            </select>
          </section>

          {/* Cliente (solo Ventas) */}
          {contexto === 'ventas' && (
            <section className="xm-section">
              <div className="xm-label">
                Cliente
                {clienteId && <button type="button" className="xm-clear" onClick={() => { setClienteId(''); setClienteQ(''); }}>Todos</button>}
              </div>
              {clienteId ? (
                <div className="xm-cliente-sel">
                  <span>{clienteList.find((c) => c.id === clienteId)?.nombre}</span>
                  <button type="button" className="btn btn-icon btn-secondary btn-sm" onClick={() => { setClienteId(''); setClienteQ(''); }} aria-label="Quitar cliente">×</button>
                </div>
              ) : (
                <div className="xm-cliente-search">
                  <input className="input input-sm" placeholder="Buscar cliente…" value={clienteQ} onChange={(e) => setClienteQ(e.target.value)} />
                  {clientesFiltrados.length > 0 && (
                    <div className="xm-cliente-drop">
                      {clientesFiltrados.map((c) => (
                        <button key={c.id} type="button" className="xm-cliente-opt" onClick={() => { setClienteId(c.id); setClienteQ(''); }}>
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Categorías */}
          {categorias.length > 0 && (
            <section className="xm-section">
              <div className="xm-label">
                Categorías
                {selCats.length > 0 && <button type="button" className="xm-clear" onClick={() => { setSelCats([]); setSelProds([]); }}>Todas</button>}
              </div>
              <div className="xm-checks xm-checks-wrap">
                {categorias.map((cat) => (
                  <label key={cat} className="check">
                    <input type="checkbox" checked={selCats.includes(cat)} onChange={() => { setSelCats((s) => toggle(s, cat)); setSelProds([]); }} />
                    {cat}
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Productos (solo Ventas) */}
          {contexto === 'ventas' && prodsDisp.length > 0 && (
            <section className="xm-section xm-section-tall">
              <div className="xm-label">
                Productos
                {selProds.length > 0 && <button type="button" className="xm-clear" onClick={() => setSelProds([])}>Todos</button>}
              </div>
              <div className="xm-checks xm-checks-scroll">
                {prodsDisp.map((p) => (
                  <label key={p.id} className="check">
                    <input type="checkbox" checked={selProds.includes(p.id)} onChange={() => setSelProds((s) => toggle(s, p.id))} />
                    {p.nombre}
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Hojas (solo Reportes) */}
          {contexto === 'reportes' && (
            <section className="xm-section">
              <div className="xm-label">Hojas a incluir</div>
              <div className="xm-checks">
                {HOJAS_REPORTES.map((h) => (
                  <label key={h.key} className="check">
                    <input type="checkbox" checked={hojas.includes(h.key)} onChange={() => setHojas((s) => toggle(s, h.key))} />
                    {h.label}
                  </label>
                ))}
              </div>
            </section>
          )}

          {/* Incluir detalle (solo Ventas) */}
          {contexto === 'ventas' && (
            <section className="xm-section">
              <div className="xm-label">Contenido</div>
              <label className="check">
                <input type="checkbox" checked={conDetalle} onChange={(e) => setConDetalle(e.target.checked)} />
                Incluir hoja de detalle de ítems
              </label>
            </section>
          )}
        </div>

        {/* Preview */}
        <div className="xm-preview">
          {pvBusy && <span className="text-muted">Calculando…</span>}
          {!pvBusy && preview && estados.length > 0 && (
            preview.n === 0
              ? <span className="xm-preview-zero">Sin ventas con estos filtros.</span>
              : <span>
                  Se exportarán{' '}
                  <strong>{preview.n} {preview.n === 1 ? 'venta' : 'ventas'}</strong>
                  {estados.includes('pagada') && (
                    <> · <strong>${preview.total.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong></>
                  )}
                  {(selCats.length > 0 || selProds.length > 0) && ' (filtrado por productos)'}
                </span>
          )}
          {estados.length === 0 && <span className="xm-preview-zero">Seleccioná al menos un estado.</span>}
        </div>

        <ErrorBox error={error} />
      </div>

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={generando}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={generar} disabled={!canGenerate}>
          {generando ? 'Generando…' : <><FileDown size={15} /> Generar Excel</>}
        </button>
      </div>
    </Modal>
  );
}

/* ── Objeto de filtros para la hoja Resumen ── */
const MEDIOS_MAP = Object.fromEntries(MEDIOS_PAGO.map((m) => [m.value, m.label]));
function buildFiltros({ desde, hasta, estados, medios, origen, clienteId, clienteList, selCats, selProds, prodList }) {
  const fmtD = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const estadosLbl = { pagada: 'Pagada', pendiente: 'Pendiente', cancelada: 'Cancelada' };
  return {
    'Período':       `${fmtD(desde)} – ${fmtD(hasta)}`,
    'Estados':       estados.length === 0 ? 'Todos' : estados.map((e) => estadosLbl[e] ?? e).join(', '),
    'Medios de pago': medios.length === 0 ? 'Todos' : medios.map((m) => MEDIOS_MAP[m] ?? m).join(', '),
    'Origen':        origen ? (origen === 'web' ? 'Web' : 'Local') : 'Todos',
    'Cliente':       clienteId ? (clienteList.find((c) => c.id === clienteId)?.nombre ?? clienteId) : 'Todos',
    'Categorías':    selCats.length  === 0 ? 'Todas' : selCats.join(', '),
    'Productos':     selProds.length === 0 ? 'Todos' : `${selProds.length} seleccionado${selProds.length === 1 ? '' : 's'}`,
  };
}

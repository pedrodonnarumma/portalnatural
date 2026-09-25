import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileDown } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { endOfDayISO, fmtDate, fmtMoney, fmtQty, medioPagoLabel, startOfDayISO, toDateInput } from '../lib/format.js';
import { EmptyState, ErrorBox, PageHead, Spinner } from '../components/ui.jsx';
import { BarChart } from '../components/charts.jsx';
import { useAuth } from '../AuthProvider.jsx';
import ExcelModal from '../components/ExcelModal.jsx';

const PRESETS = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: '30', label: 'Últimos 30 días' },
  { key: 'custom', label: 'Personalizado' },
];

function presetRange(key) {
  const hoy = new Date();
  const d = new Date(hoy);
  if (key === 'hoy') return [toDateInput(hoy), toDateInput(hoy)];
  if (key === 'semana') {
    const dow = (hoy.getDay() + 6) % 7; // lunes = 0
    d.setDate(hoy.getDate() - dow);
    return [toDateInput(d), toDateInput(hoy)];
  }
  if (key === 'mes') return [toDateInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), toDateInput(hoy)];
  d.setDate(hoy.getDate() - 29);
  return [toDateInput(d), toDateInput(hoy)];
}

export default function Reportes() {
  const { session } = useAuth();
  const [preset, setPreset] = useState('mes');
  const [custom, setCustom] = useState(presetRange('30'));
  const [desde, hasta] = preset === 'custom' ? custom : presetRange(preset);
  const [exportando, setExportando] = useState(false);

  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!desde || !hasta || desde > hasta) return;
    setStats(null);
    setError(null);
    const desdeISO = startOfDayISO(desde);
    const hastaISO = endOfDayISO(hasta);

    Promise.all([
      supabase.rpc('resumen_ventas',   { desde: desdeISO, hasta: hastaISO }),
      supabase.rpc('ventas_por_dia',   { desde: desdeISO, hasta: hastaISO }),
      supabase.rpc('top_productos',    { desde: desdeISO, hasta: hastaISO }),
      supabase.rpc('ventas_por_medio', { desde: desdeISO, hasta: hastaISO }),
      supabase.rpc('top_clientes',     { desde: desdeISO, hasta: hastaISO }),
      supabase.from('productos').select('id, nombre, unidad, stock, stock_minimo').eq('activo', true),
    ]).then(([res, dias, prods, medios, clientes, ps]) => {
      if (res.error) { setError(res.error); return; }
      const r = res.data?.[0] ?? {};
      const total = Number(r.total_vendido ?? 0);
      const n     = Number(r.cant_pagadas ?? 0);
      setStats({
        total,
        n,
        ticket: Number(r.ticket_promedio ?? 0),
        porDia: (dias.data ?? []).map((d) => ({ fecha: String(d.fecha).slice(0, 10), monto: Number(d.monto) })),
        topProductos: (prods.data ?? []).map((p) => ({ ...p, cantidad: Number(p.cantidad), total: Number(p.total) })),
        medios: (medios.data ?? []).map((m) => ({ ...m, monto: Number(m.monto) })),
        topClientes: (clientes.data ?? []).map((c) => ({ ...c, n: Number(c.compras), total: Number(c.total) })),
      });
      setLowStock((ps.data ?? []).filter((x) => Number(x.stock) <= Number(x.stock_minimo)).sort((a, b) => (a.stock - a.stock_minimo) - (b.stock - b.stock_minimo)));
    }).catch((e) => setError(e));
  }, [desde, hasta]);

  return (
    <>
      <PageHead
        title="Reportes"
        subtitle={`${fmtDate(startOfDayISO(desde))} – ${fmtDate(startOfDayISO(hasta))}`}
        actions={
          <button type="button" className="btn btn-secondary" onClick={() => setExportando(true)}>
            <FileDown size={15} /> Exportar Excel
          </button>
        }
      />
      <div className="toolbar">
        <div className="chips chips-inline">
          {PRESETS.map((p) => (
            <button key={p.key} type="button" className={`chip chip-sm ${preset === p.key ? 'is-active' : ''}`} onClick={() => setPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="date-range">
            <input className="input input-sm" type="date" value={custom[0]} max={custom[1]} onChange={(e) => setCustom([e.target.value, custom[1]])} aria-label="Desde" />
            <span className="text-muted">a</span>
            <input className="input input-sm" type="date" value={custom[1]} min={custom[0]} onChange={(e) => setCustom([custom[0], e.target.value])} aria-label="Hasta" />
          </div>
        )}
      </div>
      <ErrorBox error={error} />
      {!stats && !error && <Spinner />}
      {stats && (
        <>
          <div className="kpis">
            <Kpi label="Vendido" value={fmtMoney(stats.total)} />
            <Kpi label="Ventas" value={stats.n} />
            <Kpi label="Ticket promedio" value={fmtMoney(stats.ticket)} />
            <Kpi label="Stock bajo" value={lowStock.length} tone={lowStock.length ? 'warn' : ''} />
          </div>

          <section className="panel">
            <h3 className="panel-title">Ventas por día</h3>
            {stats.n === 0 ? <EmptyState>Sin ventas en el período.</EmptyState> : <BarChart data={stats.porDia} />}
          </section>

          <div className="panel-grid">
            <section className="panel">
              <h3 className="panel-title">Productos más vendidos</h3>
              {stats.topProductos.length === 0 ? (
                <EmptyState>Sin datos.</EmptyState>
              ) : (
                <table className="table table-compact">
                  <thead>
                    <tr><th>Producto</th><th className="num">Cantidad</th><th className="num">Importe</th></tr>
                  </thead>
                  <tbody>
                    {stats.topProductos.map((p) => (
                      <tr key={p.nombre}>
                        <td>{p.nombre}</td>
                        <td className="num">{fmtQty(p.cantidad, p.unidad)}</td>
                        <td className="num">{fmtMoney(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h3 className="panel-title">Medios de pago</h3>
              {stats.medios.length === 0 ? (
                <EmptyState>Sin datos.</EmptyState>
              ) : (
                <table className="table table-compact">
                  <thead>
                    <tr><th>Medio</th><th className="num">Importe</th><th className="num">%</th></tr>
                  </thead>
                  <tbody>
                    {stats.medios.map((m) => (
                      <tr key={m.medio}>
                        <td>{medioPagoLabel(m.medio)}</td>
                        <td className="num">{fmtMoney(m.monto)}</td>
                        <td className="num text-muted">{Math.round((m.monto / stats.total) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h3 className="panel-title">Mejores clientes</h3>
              {stats.topClientes.length === 0 ? (
                <EmptyState>Ninguna venta con cliente asignado.</EmptyState>
              ) : (
                <table className="table table-compact">
                  <thead>
                    <tr><th>Cliente</th><th className="num">Compras</th><th className="num">Importe</th></tr>
                  </thead>
                  <tbody>
                    {stats.topClientes.map((c) => (
                      <tr key={c.nombre}>
                        <td>{c.nombre}</td>
                        <td className="num">{c.n}</td>
                        <td className="num">{fmtMoney(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="panel">
              <h3 className="panel-title">
                <AlertTriangle size={16} className="panel-icon" aria-hidden="true" /> Stock bajo
              </h3>
              {lowStock.length === 0 ? (
                <EmptyState>Todo el stock está por encima del mínimo.</EmptyState>
              ) : (
                <>
                  <table className="table table-compact">
                    <thead>
                      <tr><th>Producto</th><th className="num">Stock</th><th className="num">Mínimo</th></tr>
                    </thead>
                    <tbody>
                      {lowStock.slice(0, 10).map((p) => (
                        <tr key={p.id}>
                          <td>{p.nombre}</td>
                          <td className="num stock-low">{fmtQty(p.stock, p.unidad)}</td>
                          <td className="num text-muted">{fmtQty(p.stock_minimo, p.unidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Link to="/admin/stock" className="panel-link">Ir a Stock</Link>
                </>
              )}
            </section>
          </div>
        </>
      )}
      {exportando && (
        <ExcelModal
          contexto="reportes"
          desdeInicial={desde}
          hastaInicial={hasta}
          userEmail={session?.user?.email}
          onClose={() => setExportando(false)}
        />
      )}
    </>
  );
}

function Kpi({ label, value, tone = '' }) {
  return (
    <div className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
    </div>
  );
}


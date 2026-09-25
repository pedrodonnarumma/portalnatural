import { useState } from 'react';
import { fmtDate, fmtMoney, startOfDayISO } from '../lib/format.js';

/* Gráfico de barras (una sola serie): SVG puro, con hover y vista de tabla. */
export function BarChart({ data }) {
  const [hover, setHover] = useState(null);
  const [asTable, setAsTable] = useState(false);
  const W = 720;
  const H = 220;
  const pad = { top: 16, right: 8, bottom: 28, left: 56 };
  const max = Math.max(...data.map((d) => d.monto), 1);
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const step = innerW / data.length;
  const barW = Math.max(2, Math.min(28, step - 2));
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / 8);
  const short = (f) => {
    const [, m, d] = f.split('-');
    return `${d}/${m}`;
  };

  if (asTable) {
    return (
      <>
        <table className="table table-compact">
          <thead><tr><th>Día</th><th className="num">Vendido</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.fecha}><td>{fmtDate(startOfDayISO(d.fecha))}</td><td className="num">{fmtMoney(d.monto)}</td></tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-ghost chart-toggle" onClick={() => setAsTable(false)}>Ver gráfico</button>
      </>
    );
  }

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="img" aria-label="Ventas por día">
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} className="chart-grid" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="chart-tick">{fmtMoney(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.monto / max) * innerH;
          const x = pad.left + i * step + (step - barW) / 2;
          const y = pad.top + innerH - h;
          const active = hover === i;
          return (
            <g key={d.fecha} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              <rect x={pad.left + i * step} y={pad.top} width={step} height={innerH} fill="transparent" />
              {d.monto > 0 && (
                <path
                  d={`M${x},${y + 4} a4,4 0 0 1 4,-4 h${barW - 8} a4,4 0 0 1 4,4 v${Math.max(0, h - 4)} h${-barW} z`}
                  className={`chart-bar ${active ? 'is-active' : ''}`}
                />
              )}
              {i % labelEvery === 0 && (
                <text x={pad.left + i * step + step / 2} y={H - 8} textAnchor="middle" className="chart-tick">{short(d.fecha)}</text>
              )}
            </g>
          );
        })}
        {hover !== null && (
          <line x1={pad.left + hover * step + step / 2} x2={pad.left + hover * step + step / 2} y1={pad.top} y2={pad.top + innerH} className="chart-crosshair" />
        )}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.left + hover * step + step / 2) / W) * 100}%` }}>
          <span className="text-muted">{fmtDate(startOfDayISO(data[hover].fecha))}</span>
          <strong>{fmtMoney(data[hover].monto)}</strong>
        </div>
      )}
      <button type="button" className="btn btn-ghost chart-toggle" onClick={() => setAsTable(true)}>Ver tabla</button>
    </div>
  );
}

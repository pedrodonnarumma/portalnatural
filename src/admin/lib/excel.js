/* Portal Natural — exportación Excel.
   exceljs se carga con dynamic import() → chunk separado, sin impacto en la carga inicial. */

const HEADER_BG   = 'FFEEF4EA';
const HEADER_FG   = 'FF1E3A2B';
const HEADER_BORD = 'FFD7E2D4';
const TOTAL_BG    = 'FFF6F9F4';
const TOTAL_BORD  = 'FF1E3A2B';
const MUTED_FG    = 'FF666666';

const MONEY_FMT = '#,##0';
const QTY_FMT   = '#,##0.###';
const DATE_FMT  = 'dd/mm/yyyy';
const DTIME_FMT = 'dd/mm/yyyy hh:mm';
const PCT_FMT   = '0%';

const ESTADO_FG = {
  pagada:    'FF155724',
  pendiente: 'FF8A6D1F',
  cancelada: 'FF721C24',
};

const MEDIOS_LABEL = {
  efectivo: 'Efectivo', transferencia: 'Transferencia',
  debito: 'Débito', credito: 'Crédito', otro: 'Otro',
};

/* ── helpers de estilo ── */
function fnt(opts = {}) {
  return { name: 'Calibri', size: 11, ...opts };
}
function fill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
function applyHeader(cell) {
  cell.fill  = fill(HEADER_BG);
  cell.font  = fnt({ bold: true, color: { argb: HEADER_FG } });
  cell.border = { bottom: { style: 'thin', color: { argb: HEADER_BORD } } };
  cell.alignment = { vertical: 'middle' };
}
function applyTotal(cell) {
  cell.fill  = fill(TOTAL_BG);
  cell.font  = fnt({ bold: true });
  cell.border = { top: { style: 'thin', color: { argb: TOTAL_BORD } } };
}

/* Configura la hoja: col A vacía, fila 1 vacía, fila 2 = encabezados, freeze + autofilter.
   Devuelve el índice de la primera fila de datos (3). */
function setupSheet(ws, headers) {
  ws.views = [{ state: 'frozen', ySplit: 2, showGridLines: false }];
  ws.getColumn(1).width = 2;
  const hr = ws.getRow(2);
  hr.values = [null, ...headers];
  for (let c = 2; c <= headers.length + 1; c++) applyHeader(hr.getCell(c));
  ws.autoFilter = { from: { row: 2, column: 2 }, to: { row: 2, column: headers.length + 1 } };
  return 3;
}

/* Ajusta anchos automáticamente (máx 60 chars). */
function autoWidth(ws) {
  ws.columns.forEach((col) => {
    let w = Number(col.width) || 8;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const len = v instanceof Date ? 18 : v != null ? String(v).length + 2 : 0;
      if (len > w) w = len;
    });
    col.width = Math.min(60, w);
  });
}

/* Convierte string ISO a Date local (para que Excel muestre la hora correcta). */
function localDate(isoStr) {
  return isoStr ? new Date(isoStr) : null;
}

/* Fecha local "YYYY-MM-DD" → Date en medianoche local (para por-día). */
function dayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/* ── Hoja Resumen ── */
function addResumen(wb, { titulo, desde, hasta, filtros, kpis, userEmail }) {
  const ws = wb.addWorksheet('Resumen');
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 32;
  ws.getColumn(3).width = 28;

  function set(row, col, value, opts = {}) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = fnt(opts.font ?? {});
    if (opts.numFmt) cell.numFmt = opts.numFmt;
  }

  const fmtD = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  const now = new Date();
  const nowStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let r = 1;
  set(r, 2, `Portal Natural — ${titulo}`, { font: { bold: true, size: 16, color: { argb: 'FF1E3A2B' } } }); r++;
  set(r, 2, 'Portal Natural · Azcuénaga 22, Luján de Cuyo', { font: { color: { argb: MUTED_FG } } }); r++;
  set(r, 2, `Generado el ${nowStr} por ${userEmail ?? ''}`, { font: { color: { argb: MUTED_FG } } }); r++;
  r++;

  // Tabla de filtros
  applyHeader(ws.getCell(r, 2)); ws.getCell(r, 2).value = 'Filtro';
  applyHeader(ws.getCell(r, 3)); ws.getCell(r, 3).value = 'Valor';
  r++;
  for (const [k, v] of Object.entries(filtros)) {
    ws.getCell(r, 2).value = k;   ws.getCell(r, 2).font = fnt();
    ws.getCell(r, 3).value = v;   ws.getCell(r, 3).font = fnt();
    r++;
  }
  r++;

  // KPIs (recibidos como objeto)
  applyHeader(ws.getCell(r, 2)); ws.getCell(r, 2).value = 'Indicador';
  applyHeader(ws.getCell(r, 3)); ws.getCell(r, 3).value = 'Valor';
  r++;

  const rows = [
    ['Período',                    `${fmtD(desde)} – ${fmtD(hasta)}`,  null      ],
    ['Facturación total (pagadas)', kpis.totVendido,                     MONEY_FMT ],
    ['Ventas pagadas',              kpis.cantPagadas,                    null      ],
    ['Ticket promedio',             kpis.ticketPromedio,                 MONEY_FMT ],
    ['Pendientes (cantidad)',        kpis.cantPendientes,                 null      ],
    ['Canceladas (cantidad)',        kpis.cantCanceladas,                 null      ],
  ];
  for (const [label, val, fmt] of rows) {
    ws.getCell(r, 2).value = label; ws.getCell(r, 2).font = fnt();
    ws.getCell(r, 3).value = val;   ws.getCell(r, 3).font = fnt();
    if (fmt) ws.getCell(r, 3).numFmt = fmt;
    r++;
  }
}

/* ── Hoja Ventas ── */
const HDR_VENTAS = [
  'N°', 'Fecha y hora', 'Estado', 'Origen',
  'Cliente / Contacto', 'Teléfono', 'Medio de pago',
  'Dirección de envío', 'Cant. ítems', 'Total', 'Notas',
];

function addHojaVentas(wb, ventas) {
  const ws = wb.addWorksheet('Ventas');
  let r = setupSheet(ws, HDR_VENTAS);

  for (const v of ventas) {
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [
      null,
      v.numero,
      localDate(v.fecha),
      estadoLbl(v.estado),
      v.origen === 'web' ? 'Web' : 'Local',
      v.cliente?.nombre ?? v.contacto_nombre ?? 'Consumidor final',
      v.contacto_telefono ?? '',
      MEDIOS_LABEL[v.medio_pago] ?? v.medio_pago ?? '',
      v.direccion_envio ?? '',
      (v.items ?? []).length,
      Number(v.total),
      v.notas ?? '',
    ];
    row.getCell(3).numFmt  = DTIME_FMT;
    row.getCell(11).numFmt = MONEY_FMT;
    const color = ESTADO_FG[v.estado];
    if (color) row.getCell(4).font = fnt({ color: { argb: color } });
  }

  // Fila de totales (solo pagadas)
  const pagadas = ventas.filter((v) => v.estado === 'pagada');
  const tot = pagadas.reduce((a, v) => a + Number(v.total), 0);
  const totRow = ws.getRow(r);
  totRow.values = [null, null, null, null, null, null, null, null, 'Total pagadas', pagadas.length, tot, null];
  for (let c = 2; c <= 12; c++) applyTotal(totRow.getCell(c));
  totRow.getCell(11).numFmt = MONEY_FMT;

  autoWidth(ws);
}

/* ── Hoja Detalle ── */
const HDR_DETALLE = [
  'N° Venta', 'Fecha', 'Producto', 'Categoría',
  'Cantidad', 'Unidad', 'Precio unitario', 'Subtotal', 'Estado',
];

function addHojaDetalle(wb, ventas, filtrosCatProd = { cats: [], prods: [] }) {
  const ws = wb.addWorksheet('Detalle');
  let r = setupSheet(ws, HDR_DETALLE);
  const { cats, prods } = filtrosCatProd;

  for (const v of ventas) {
    for (const it of v.items ?? []) {
      const cat = it.producto?.categoria ?? '';
      if (cats.length > 0 && !cats.includes(cat)) continue;
      if (prods.length > 0 && !prods.includes(it.producto_id)) continue;

      const row = ws.getRow(r++);
      row.font = fnt();
      row.values = [
        null,
        v.numero,
        localDate(v.fecha),
        it.nombre,
        cat,
        Number(it.cantidad),
        it.producto?.unidad ?? '',
        Number(it.precio_unitario),
        Number(it.subtotal),
        estadoLbl(v.estado),
      ];
      row.getCell(3).numFmt = DATE_FMT;
      row.getCell(6).numFmt = QTY_FMT;
      row.getCell(8).numFmt = MONEY_FMT;
      row.getCell(9).numFmt = MONEY_FMT;
      const color = ESTADO_FG[v.estado];
      if (color) row.getCell(10).font = fnt({ color: { argb: color } });
    }
  }

  autoWidth(ws);
}

/* ── Hojas de Reportes ── */
function addHojaPorDia(wb, porDia) {
  const ws = wb.addWorksheet('Ventas por día');
  let r = setupSheet(ws, ['Fecha', 'Facturación']);

  for (const d of porDia) {
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [null, dayDate(d.fecha), Number(d.monto)];
    row.getCell(2).numFmt = DATE_FMT;
    row.getCell(3).numFmt = MONEY_FMT;
  }

  const total = porDia.reduce((a, d) => a + Number(d.monto), 0);
  const tr = ws.getRow(r);
  tr.values = [null, 'Total', total];
  [2, 3].forEach((c) => applyTotal(tr.getCell(c)));
  tr.getCell(3).numFmt = MONEY_FMT;
  autoWidth(ws);
}

function addHojaProductos(wb, topProductos) {
  const ws = wb.addWorksheet('Productos más vendidos');
  let r = setupSheet(ws, ['Producto', 'Categoría', 'Cantidad', 'Unidad', 'Facturación']);

  for (const p of topProductos) {
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [null, p.nombre, p.categoria ?? '', Number(p.cantidad), p.unidad ?? '', Number(p.total)];
    row.getCell(4).numFmt = QTY_FMT;
    row.getCell(6).numFmt = MONEY_FMT;
  }

  autoWidth(ws);
}

function addHojaMedios(wb, medios, totalGeneral) {
  const ws = wb.addWorksheet('Medios de pago');
  let r = setupSheet(ws, ['Medio de pago', 'Facturación', '%']);

  for (const m of medios) {
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [null, MEDIOS_LABEL[m.medio] ?? m.medio ?? '', Number(m.monto), totalGeneral ? m.monto / totalGeneral : 0];
    row.getCell(3).numFmt = MONEY_FMT;
    row.getCell(4).numFmt = PCT_FMT;
  }

  const total = medios.reduce((a, m) => a + Number(m.monto), 0);
  const tr = ws.getRow(r);
  tr.values = [null, 'Total', total, null];
  [2, 3, 4].forEach((c) => applyTotal(tr.getCell(c)));
  tr.getCell(3).numFmt = MONEY_FMT;
  autoWidth(ws);
}

function addHojaClientes(wb, topClientes) {
  const ws = wb.addWorksheet('Mejores clientes');
  let r = setupSheet(ws, ['Cliente', 'Compras', 'Facturación']);

  for (const c of topClientes) {
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [null, c.nombre, c.n, Number(c.total)];
    row.getCell(4).numFmt = MONEY_FMT;
  }

  autoWidth(ws);
}

function addHojaStockBajo(wb, lowStock) {
  const ws = wb.addWorksheet('Stock bajo');
  let r = setupSheet(ws, ['Producto', 'Stock actual', 'Mínimo', 'Unidad', 'Diferencia']);

  for (const p of lowStock) {
    const diff = Number(p.stock) - Number(p.stock_minimo);
    const row = ws.getRow(r++);
    row.font = fnt();
    row.values = [null, p.nombre, Number(p.stock), Number(p.stock_minimo), p.unidad ?? '', diff];
    row.getCell(3).numFmt = QTY_FMT;
    row.getCell(4).numFmt = QTY_FMT;
    row.getCell(6).numFmt = QTY_FMT;
    if (diff < 0) row.getCell(6).font = fnt({ color: { argb: ESTADO_FG.cancelada } });
  }

  autoWidth(ws);
}

/* ── Cálculo de stats para Reportes ── */
function computarStats(ventas, desde, hasta) {
  const total = ventas.reduce((a, v) => a + Number(v.total), 0);
  const n = ventas.length;

  // Incluye todos los días en el rango aunque no haya ventas
  const porDia = new Map();
  const d0 = new Date(dayDate(desde));
  const d1 = new Date(dayDate(hasta));
  for (let d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
    const k = toDateInputLocal(d);
    porDia.set(k, 0);
  }
  for (const v of ventas) {
    const k = toDateInputLocal(new Date(v.fecha));
    porDia.set(k, (porDia.get(k) ?? 0) + Number(v.total));
  }

  const prod    = new Map();
  const medios  = new Map();
  const clientes = new Map();
  for (const v of ventas) {
    medios.set(v.medio_pago, (medios.get(v.medio_pago) ?? 0) + Number(v.total));
    if (v.cliente?.id) {
      const c = clientes.get(v.cliente.id) ?? { nombre: v.cliente.nombre, total: 0, n: 0 };
      c.total += Number(v.total);
      c.n += 1;
      clientes.set(v.cliente.id, c);
    }
    for (const it of v.items ?? []) {
      const key = it.producto_id ?? it.nombre;
      const p = prod.get(key) ?? {
        nombre: it.nombre,
        categoria: it.producto?.categoria ?? '',
        unidad: it.producto?.unidad ?? '',
        cantidad: 0,
        total: 0,
      };
      p.cantidad += Number(it.cantidad);
      p.total    += Number(it.subtotal);
      prod.set(key, p);
    }
  }

  const desc = (m) => [...m.values()].sort((a, b) => b.total - a.total);
  return {
    total, n,
    ticket: n ? total / n : 0,
    porDia: [...porDia.entries()].map(([fecha, monto]) => ({ fecha, monto })),
    topProductos: desc(prod),
    medios: [...medios.entries()].map(([medio, monto]) => ({ medio, monto })).sort((a, b) => b.monto - a.monto),
    topClientes: desc(clientes),
  };
}

function toDateInputLocal(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── Descarga ── */
function descargar(buf, nombre) {
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Helpers públicos ── */
function estadoLbl(v) {
  return v === 'pagada' ? 'Pagada' : v === 'pendiente' ? 'Pendiente' : v === 'cancelada' ? 'Cancelada' : (v ?? '');
}

/* ══════════════════════════════════════════════
   API pública
══════════════════════════════════════════════ */

export async function exportarVentas({ ventas, filtros, opciones }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Portal Natural';
  wb.created = new Date();

  const { desde, hasta, conDetalle, userEmail, filtrosCatProd } = opciones;

  const pagadas = ventas.filter((v) => v.estado === 'pagada');
  const pend    = ventas.filter((v) => v.estado === 'pendiente');
  const canc    = ventas.filter((v) => v.estado === 'cancelada');
  const totVend = pagadas.reduce((a, v) => a + Number(v.total), 0);
  const kpis = {
    totVendido:     totVend,
    cantPagadas:    pagadas.length,
    ticketPromedio: pagadas.length ? totVend / pagadas.length : 0,
    cantPendientes: pend.length,
    cantCanceladas: canc.length,
  };

  addResumen(wb, { titulo: 'Exportación de Ventas', desde, hasta, filtros, kpis, userEmail });
  addHojaVentas(wb, ventas);
  if (conDetalle) addHojaDetalle(wb, ventas, filtrosCatProd);

  const buf = await wb.xlsx.writeBuffer();
  descargar(buf, `portal-natural_ventas_${desde}_a_${hasta}.xlsx`);
}

export async function exportarReportes({ lowStock, filtros, opciones }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Portal Natural';
  wb.created = new Date();

  const { desde, hasta, userEmail, hojas, sqlStats } = opciones;
  const { resumen, porDia, topProductos, medios, topClientes } = sqlStats;

  const kpis = {
    totVendido:     resumen.total_vendido,
    cantPagadas:    resumen.cant_pagadas,
    ticketPromedio: resumen.ticket_promedio,
    cantPendientes: resumen.cant_pendientes,
    cantCanceladas: resumen.cant_canceladas,
  };

  addResumen(wb, { titulo: 'Reportes', desde, hasta, filtros, kpis, userEmail });
  if (hojas.includes('dia'))       addHojaPorDia(wb, porDia);
  if (hojas.includes('productos')) addHojaProductos(wb, topProductos);
  if (hojas.includes('medios'))    addHojaMedios(wb, medios, resumen.total_vendido);
  if (hojas.includes('clientes'))  addHojaClientes(wb, topClientes);
  if (hojas.includes('stock'))     addHojaStockBajo(wb, lowStock);

  const buf = await wb.xlsx.writeBuffer();
  descargar(buf, `portal-natural_reportes_${desde}_a_${hasta}.xlsx`);
}

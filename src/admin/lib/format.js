const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const moneyCents = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const qty = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

export function fmtMoney(n, cents = false) {
  const v = Number(n) || 0;
  return cents ? moneyCents.format(v) : money.format(v);
}

export function fmtQty(n, unidad) {
  const v = Number(n) || 0;
  return unidad ? `${qty.format(v)} ${unidad}` : qty.format(v);
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/** YYYY-MM-DD en hora local (para inputs type=date). */
export function toDateInput(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Inicio del día local en ISO (para filtrar en Supabase). */
export function startOfDayISO(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

/** Fin del día local en ISO. */
export function endOfDayISO(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'otro', label: 'Otro' },
];

export const UNIDADES = [
  { value: 'un', label: 'Unidad' },
  { value: 'kg', label: 'Kilo' },
  { value: 'g', label: 'Gramo' },
  { value: 'l', label: 'Litro' },
];

export function medioPagoLabel(v) {
  return MEDIOS_PAGO.find((m) => m.value === v)?.label ?? v;
}

// Zona horaria fija: Argentina/Mendoza = UTC-3, sin horario de verano.
const TZ = 'America/Argentina/Mendoza';

/** Retorna 'YYYY-MM-DD' según la hora de Mendoza. */
export function toMendozaDateStr(d = new Date()) {
  return new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(d);
}

/** Inicio del día en Mendoza → timestamp UTC. Medianoche Mendoza = UTC+3h. */
export function startOfDayMendoza(dateStr) {
  return dateStr + 'T03:00:00.000Z';
}

/** Fin del día en Mendoza → timestamp UTC. 23:59:59.999 Mendoza = día siguiente T02:59:59.999Z. */
export function endOfDayMendoza(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().split('T')[0] + 'T02:59:59.999Z';
}

/** Resta n días a una fecha 'YYYY-MM-DD'. */
export function subDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().split('T')[0];
}

/** Suma n días a una fecha 'YYYY-MM-DD'. */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().split('T')[0];
}

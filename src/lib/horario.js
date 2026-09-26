// Franjas en minutos desde medianoche. 0=Dom, 1=Lun … 6=Sáb.
export const HORARIOS = {
  1: [[570, 810], [1020, 1230]],
  2: [[570, 810], [1020, 1230]],
  3: [[570, 810], [1020, 1230]],
  4: [[570, 810], [1020, 1230]],
  5: [[570, 810], [1020, 1230]],
  6: [[570, 810]],
  0: [],
};

function fmt(min) {
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return `${h}${mm ? '.' + String(mm).padStart(2, '0') : ''} h`;
}

export function estadoLocal(fecha = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Mendoza',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(fecha);
  const get = (t) => (parts.find((p) => p.type === t) || {}).value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const m = (+get('hour') % 24) * 60 + +get('minute');

  const hoy = HORARIOS[day] || [];
  for (let i = 0; i < hoy.length; i++) {
    if (m >= hoy[i][0] && m < hoy[i][1])
      return { abierto: true, texto: 'Abierto ahora', detalle: `cierra ${fmt(hoy[i][1])}` };
    if (m < hoy[i][0])
      return { abierto: false, texto: 'Cerrado', detalle: `abre hoy ${fmt(hoy[i][0])}` };
  }

  const names = ['el domingo', 'el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado'];
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7;
    const h = HORARIOS[d] || [];
    if (h.length) {
      const cuando = k === 1 ? 'mañana' : names[d];
      return { abierto: false, texto: 'Cerrado', detalle: `abre ${cuando} ${fmt(h[0][0])}` };
    }
  }
  return { abierto: false, texto: 'Cerrado', detalle: '' };
}

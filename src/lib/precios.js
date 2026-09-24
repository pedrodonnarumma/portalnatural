// Helpers de presentación de precios y cantidades por fracción.
// "precio" siempre es por la unidad base (kg / l / un).
// "venta_por" es la fracción de esa unidad que se muestra al cliente.

const numES = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });

// "100 g" / "250 g" / "kg" / "500 ml" / "1 l" / "unidad" / "2 unidades"
export function etiquetaPresentacion(unidad, venta_por = 1) {
  const vp = Number(venta_por) || 1;
  if (unidad === 'kg') {
    if (vp < 1) return `${Math.round(vp * 1000)} g`;
    return vp === 1 ? 'kg' : `${numES.format(vp)} kg`;
  }
  if (unidad === 'l') {
    if (vp < 1) return `${Math.round(vp * 1000)} ml`;
    return vp === 1 ? '1 l' : `${numES.format(vp)} l`;
  }
  // unidad = 'un' u otro
  if (vp === 1) return 'unidad';
  return `${numES.format(vp)} unidades`;
}

// Precio que ve el cliente ($3.500 por 100 g).
export function precioPresentacion(precio, venta_por = 1) {
  return Math.round(Number(precio) * Number(venta_por));
}

// "$35.000 el kg" / "$8.000 el litro" — solo cuando venta_por ≠ 1 y unidad es kg o l.
// Retorna null si no aplica.
export function precioReferencia(precio, unidad, venta_por = 1) {
  const vp = Number(venta_por) || 1;
  if (vp === 1) return null;
  if (unidad === 'kg') return `$${Math.round(Number(precio)).toLocaleString('es-AR')} el kg`;
  if (unidad === 'l') return `$${Math.round(Number(precio)).toLocaleString('es-AR')} el litro`;
  return null;
}

// "300 g" / "1,2 kg" / "3 unidades" — cantidad legible a partir de N pasos.
export function etiquetaCantidad(pasos, unidad, venta_por = 1) {
  const vp = Number(venta_por) || 1;
  const real = pasos * vp;
  if (unidad === 'kg') {
    if (real < 1) return `${Math.round(real * 1000)} g`;
    return `${numES.format(real)} kg`;
  }
  if (unidad === 'l') {
    if (real < 1) return `${Math.round(real * 1000)} ml`;
    return `${numES.format(real)} l`;
  }
  return pasos === 1 ? '1 unidad' : `${numES.format(pasos)} unidades`;
}

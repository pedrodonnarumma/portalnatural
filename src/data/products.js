// Catálogo. TODO(cliente): precios de referencia del diseño — reemplazar por los reales.
// `icono`: miniatura del catálogo (ver ProductIcon en components/icons.jsx).
// `foto` (opcional): ruta en /public; reemplaza la miniatura.

export const categorias = ['Todos', 'Frutos secos', 'Semillas', 'Sin TACC', 'Almacén', 'Infusiones', 'Suplementos'];

export const catalogo = [
  { nombre: 'Almendras tostadas', categoria: 'Frutos secos', descripcion: 'Sin sal agregada.', unidad: '500 g', precio: 4800, icono: 'almendra' },
  { nombre: 'Nueces mariposa', categoria: 'Frutos secos', descripcion: 'Mitades enteras, cosecha del año.', unidad: '500 g', precio: 5200, icono: 'almendra' },
  { nombre: 'Castañas de cajú', categoria: 'Frutos secos', descripcion: 'Naturales o tostadas sin sal.', unidad: '500 g', precio: 6100, icono: 'almendra' },
  { nombre: 'Chía', categoria: 'Semillas', descripcion: 'Lista para hidratar o espolvorear.', unidad: '250 g', precio: 1900, icono: 'semilla' },
  { nombre: 'Lino dorado', categoria: 'Semillas', descripcion: 'Entero o molido en el momento.', unidad: '250 g', precio: 1500, icono: 'semilla' },
  { nombre: 'Girasol pelado', categoria: 'Semillas', descripcion: 'Para panificados y ensaladas.', unidad: '250 g', precio: 1700, icono: 'semilla' },
  { nombre: 'Harina de arroz', categoria: 'Sin TACC', descripcion: 'Apta celíacos, certificada.', unidad: '1 kg', precio: 2600, icono: 'harina' },
  { nombre: 'Premezcla universal', categoria: 'Sin TACC', descripcion: 'Para pan, pizza y tartas.', unidad: '1 kg', precio: 3200, icono: 'harina' },
  { nombre: 'Miel pura de monte', categoria: 'Almacén', descripcion: 'De productor local.', unidad: '500 g', precio: 4500, icono: 'frasco' },
  { nombre: 'Aceite de oliva', categoria: 'Almacén', descripcion: 'Extra virgen, prensada en frío.', unidad: '500 ml', precio: 7900, icono: 'aceite' },
  { nombre: 'Hierbas serranas', categoria: 'Infusiones', descripcion: 'Peperina, cedrón y menta.', unidad: '100 g', precio: 2100, icono: 'brote' },
  { nombre: 'Proteína vegetal', categoria: 'Suplementos', descripcion: 'Arveja y arroz, neutra o vainilla.', unidad: '1 kg', precio: 12500, icono: 'suplemento' },
];

// Favoritos de la landing (8 en escritorio; los 4 primeros en móvil, con `nombreCorto`).
// `precio` null → se muestra "Consultá el precio".
export const destacados = [
  { nombre: 'Almendras tostadas', nombreCorto: 'Almendras', categoria: 'Frutos secos', detalle: 'Sin sal agregada, por 100 g o por kilo.', icono: 'almendra', tono: 'tint-2' },
  { nombre: 'Granola artesanal', nombreCorto: 'Granola', categoria: 'Desayuno', detalle: 'Avena, miel y semillas. Receta propia.', icono: 'bolsa', tono: 'tint' },
  { nombre: 'Miel pura de monte', nombreCorto: 'Miel pura', categoria: 'Almacén', detalle: 'Frasco de 500 g, de productor local.', icono: 'frasco', tono: 'tint-2', tonoMovil: 'tint' },
  { nombre: 'Hierbas serranas', nombreCorto: 'Hierbas', categoria: 'Infusiones', detalle: 'Peperina, cedrón y menta a granel.', icono: 'brote', tono: 'tint', tonoMovil: 'tint-2' },
  { nombre: 'Harina de arroz', categoria: 'Sin TACC', detalle: 'Paquete de 1 kg, apto celíacos.', icono: 'harina', tono: 'tint' },
  { nombre: 'Chía y lino', categoria: 'Semillas', detalle: 'A granel, desde 100 g.', icono: 'semilla', tono: 'tint-2' },
  { nombre: 'Proteína vegetal', categoria: 'Suplementos', detalle: 'Arveja y arroz, neutra o vainilla.', icono: 'suplemento', tono: 'tint-2' },
  { nombre: 'Aceite de oliva', categoria: 'Aceites', detalle: 'Extra virgen, primera prensada en frío.', icono: 'aceite', tono: 'tint' },
].map((d) => ({ ...d, precio: catalogo.find((p) => p.nombre === d.nombre)?.precio ?? null }));

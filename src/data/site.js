// TODO(cliente): reemplazar los placeholders entre corchetes por los datos reales.
export const site = {
  direccion: '[Calle y número]',
  barrioCiudad: '[Barrio], [Ciudad]',
  telefono: '[Teléfono / WhatsApp]',
  telefonoCorto: '[Teléfono]',
  instagram: '[@instagram]',
  horarioSemana: 'Lunes a viernes 9 a 20 h',
  horarioFinde: 'Sábados 9 a 14 h · Domingos cerrado',
  abiertoHoy: 'Abierto hoy · 9 a 20 h',
  // URL de embed de Google Maps (iframe src). Si queda vacío se muestra `fotos.mapa` o el placeholder.
  mapaEmbed: '',
};

// Fotos provistas por el cliente (colocar en /public y poner la ruta, p. ej. '/fotos/local.jpg').
export const fotos = {
  local: '/fotos/local.jpg', // Foto de stock (Unsplash, Compagnons) — reemplazar por la del local.
  equipo: '',
  mapa: '',
};

// Flag de configuración: si es false, todos los precios muestran "Consultá el precio".
export const showPrices = true;

// Datos del local.
export const site = {
  direccion: 'Azcuénaga 22',
  ciudad: 'Luján de Cuyo, Mendoza',
  direccionCorta: 'Azcuénaga 22, Luján de Cuyo',
  horarioSemana: 'Lunes a viernes de 9.30 a 13.30 y de 17 a 20.30',
  horarioFinde: 'Sábados de 9.30 a 13.30 · Domingos cerrado',
  horarioSemanaCorto: 'Lun a vie 9.30–13.30 y 17–20.30',
  horarioFindeCorto: 'Sáb 9.30–13.30 · Dom cerrado',
  telefono: '+54 9 2616 62-2682',
  telefonoCorto: '+54 9 2616 62-2682',
  instagram: '@_portal_natural',
  instagramUrl: 'https://www.instagram.com/_portal_natural/',
  // Número para los pedidos, solo dígitos con código de país.
  whatsapp: '5492616622682',
  // URL de embed de Google Maps (iframe src). Vacío: se muestra el mapa ilustrado del diseño.
  mapaEmbed: 'https://www.google.com/maps?q=Azcu%C3%A9naga+22%2C+Luj%C3%A1n+de+Cuyo%2C+Mendoza&output=embed',
  anio: new Date().getFullYear(),
};

// Fotos provistas por el cliente (en /public). Vacío: se muestra el placeholder ilustrado del diseño.
export const fotos = {
  local: '',
};

// Si es false, todos los precios muestran "Consultá el precio".
export const showPrices = true;

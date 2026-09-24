// Datos del local. TODO(cliente): completar lo que sigue entre corchetes.
export const site = {
  direccion: 'Azcuénaga 22',
  ciudad: 'Luján de Cuyo, Mendoza',
  direccionCorta: 'Azcuénaga 22, Luján de Cuyo',
  horarioSemana: 'Lunes a viernes de 9.30 a 13.30 y de 17 a 20.30',
  horarioFinde: 'Sábados de 9.30 a 13.30 · Domingos cerrado',
  horarioSemanaCorto: 'Lun a vie 9.30–13.30 y 17–20.30',
  horarioFindeCorto: 'Sáb 9.30–13.30 · Dom cerrado',
  telefono: '[Teléfono / WhatsApp]',
  telefonoCorto: '[Teléfono]',
  instagram: '[@instagram]',
  // Número para los pedidos, solo dígitos con código de país (p. ej. '5492611234567').
  // Vacío: WhatsApp se abre con el mensaje listo y la persona elige el contacto.
  whatsapp: '',
  // URL de embed de Google Maps (iframe src). Vacío: se muestra el mapa ilustrado del diseño.
  mapaEmbed: '',
  anio: new Date().getFullYear(),
};

// Fotos provistas por el cliente (en /public). Vacío: se muestra el placeholder ilustrado del diseño.
export const fotos = {
  local: '',
  equipo: '',
};

// Si es false, todos los precios muestran "Consultá el precio".
export const showPrices = true;

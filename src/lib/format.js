export const fmtPrecio = (n) => '$' + Math.round(n).toLocaleString('es-AR');

// Minúsculas y sin tildes, para buscar "cajú" escribiendo "caju".
export const normalizar = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

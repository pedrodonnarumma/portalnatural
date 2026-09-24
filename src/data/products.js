// Seed del catálogo. En producción debería venir de un CMS o JSON.
// `foto` es opcional: si está, reemplaza el "plate" con la inicial.
export const categorias = ['Todos', 'Granel', 'Sin TACC', 'Almacén', 'Suplementos'];

export const productos = [
  { nombre: 'Almendras tostadas', categoria: 'Frutos secos', grupo: 'Granel', detalle: 'Sin sal agregada, por 100 g o por kilo.', precio: '$ por kg' },
  { nombre: 'Granola artesanal', categoria: 'Desayuno', grupo: 'Almacén', detalle: 'Avena, miel y semillas. Receta propia.', precio: '$ por 500 g' },
  { nombre: 'Miel pura de monte', categoria: 'Almacén', grupo: 'Almacén', detalle: 'Frasco de 500 g, de productor local.', precio: '$ por frasco' },
  { nombre: 'Hierbas serranas', categoria: 'Infusiones', grupo: 'Granel', detalle: 'Peperina, cedrón y menta a granel.', precio: '$ por 100 g' },
  { nombre: 'Harina de arroz', categoria: 'Sin TACC', grupo: 'Sin TACC', detalle: 'Paquete de 1 kg, apto celíacos.', precio: '$ por kg' },
  { nombre: 'Chía y lino', categoria: 'Semillas', grupo: 'Granel', detalle: 'A granel, desde 100 g.', precio: '$ por 100 g' },
  { nombre: 'Proteína vegetal', categoria: 'Suplementos', grupo: 'Suplementos', detalle: 'Arveja y arroz, neutra o vainilla.', precio: '$ por 500 g' },
  { nombre: 'Aceite de oliva', categoria: 'Aceites', grupo: 'Almacén', detalle: 'Extra virgen, primera prensada en frío.', precio: '$ por litro' },
  { nombre: 'Premezcla sin TACC', categoria: 'Sin TACC', grupo: 'Sin TACC', detalle: 'Para pan y pizza, rinde 1 kg.', precio: '$ por kg' },
  { nombre: 'Magnesio en polvo', categoria: 'Suplementos', grupo: 'Suplementos', detalle: 'Citrato, envase de 250 g.', precio: '$ por envase' },
];

// Catálogo de Portal Natural — Luján de Cuyo, Mendoza.
// `precio`   → precio por la unidad base (kg / l / un). Igual que en Supabase.
// `venta_por`→ fracción de la unidad base que se vende al público (ej.: 0.1 kg = 100 g).
// `icono`    → nombre del thumb SVG en components/icons.jsx.
// `foto`     (opcional): ruta en /public; reemplaza el ícono.

export const categorias = ['Todos', 'Frutos secos', 'Semillas', 'Sin TACC', 'Almacén', 'Infusiones', 'Suplementos'];

export const catalogo = [
  // — Frutos secos —
  { id: 'mock-01', nombre: 'Almendras tostadas',   categoria: 'Frutos secos', descripcion: 'Sin sal agregada. A granel o en bolsa sellada.',            unidad: 'kg', venta_por: 0.5,  precio: 10400, icono: 'almendra' },
  { id: 'mock-02', nombre: 'Nueces mariposa',      categoria: 'Frutos secos', descripcion: 'Mitades enteras, cosecha del año, ideales para repostería.', unidad: 'kg', venta_por: 0.5,  precio: 12400, icono: 'almendra' },
  { id: 'mock-03', nombre: 'Castañas de cajú',     categoria: 'Frutos secos', descripcion: 'Naturales o tostadas sin sal. Textura cremosa.',             unidad: 'kg', venta_por: 0.5,  precio: 14800, icono: 'almendra' },
  { id: 'mock-04', nombre: 'Maníes tostados',      categoria: 'Frutos secos', descripcion: 'Con o sin sal. También en pasta artesanal.',                 unidad: 'kg', venta_por: 0.5,  precio:  5800, icono: 'almendra' },
  { id: 'mock-05', nombre: 'Mix frutos secos',     categoria: 'Frutos secos', descripcion: 'Almendras, nueces, cajú y uvas pasas. Para snack o granola.', unidad: 'kg', venta_por: 0.5,  precio: 13600, icono: 'bolsa'    },

  // — Semillas —
  { id: 'mock-06', nombre: 'Chía',                 categoria: 'Semillas',     descripcion: 'Lista para hidratar, agregar a jugos o espolvorear.',        unidad: 'kg', venta_por: 0.25, precio:  8800, icono: 'semilla'   },
  { id: 'mock-07', nombre: 'Lino dorado',          categoria: 'Semillas',     descripcion: 'Entero o molido en el momento. Rico en omega 3.',            unidad: 'kg', venta_por: 0.25, precio:  6800, icono: 'semilla'   },
  { id: 'mock-08', nombre: 'Girasol pelado',       categoria: 'Semillas',     descripcion: 'Para panificados, ensaladas y barras caseras.',              unidad: 'kg', venta_por: 0.25, precio:  7600, icono: 'semilla'   },
  { id: 'mock-09', nombre: 'Sésamo integral',      categoria: 'Semillas',     descripcion: 'Natural o tostado. Fuente de calcio y hierro.',              unidad: 'kg', venta_por: 0.25, precio:  8400, icono: 'semilla'   },
  { id: 'mock-10', nombre: 'Semillas de zapallo',  categoria: 'Semillas',     descripcion: 'Peladas. Ricas en zinc y antioxidantes.',                    unidad: 'kg', venta_por: 0.2,  precio: 17000, icono: 'semilla'   },

  // — Sin TACC —
  { id: 'mock-11', nombre: 'Harina de arroz',      categoria: 'Sin TACC',     descripcion: 'Apta celíacos, certificada. Ideal para rebozados.',          unidad: 'kg', venta_por: 1,    precio:  2900, icono: 'harina'    },
  { id: 'mock-12', nombre: 'Premezcla universal',  categoria: 'Sin TACC',     descripcion: 'Para pan, pizza y tartas sin TACC. Resultado esponjoso.',    unidad: 'kg', venta_por: 1,    precio:  3900, icono: 'harina'    },
  { id: 'mock-13', nombre: 'Harina de garbanzo',   categoria: 'Sin TACC',     descripcion: 'Libre de gluten. Perfecta para farinata y budines salados.', unidad: 'kg', venta_por: 0.5,  precio:  4800, icono: 'harina'    },
  { id: 'mock-14', nombre: 'Fideos de arroz',      categoria: 'Sin TACC',     descripcion: 'Corte spaghetti. Cocción rápida, textura firme.',            unidad: 'un', venta_por: 1,    precio:  2600, icono: 'bolsa'     },

  // — Almacén —
  { id: 'mock-15', nombre: 'Miel pura de monte',   categoria: 'Almacén',      descripcion: 'De productor local de Luján de Cuyo. Sin filtrar.',         unidad: 'un', venta_por: 1,    precio:  5500, icono: 'frasco'    },
  { id: 'mock-16', nombre: 'Aceite de oliva',      categoria: 'Almacén',      descripcion: 'Extra virgen, primera prensada en frío. Sabor intenso.',    unidad: 'l',  venta_por: 0.5,  precio: 18400, icono: 'aceite'    },
  { id: 'mock-17', nombre: 'Granola artesanal',    categoria: 'Almacén',      descripcion: 'Avena, miel mendocina y semillas. Receta propia del local.', unidad: 'un', venta_por: 1,    precio:  4500, icono: 'bolsa'    },
  { id: 'mock-18', nombre: 'Arroz integral',       categoria: 'Almacén',      descripcion: 'Grano entero. Más fibra y nutrientes que el blanco.',       unidad: 'kg', venta_por: 1,    precio:  2000, icono: 'bolsa'     },

  // — Infusiones —
  { id: 'mock-19', nombre: 'Hierbas serranas',     categoria: 'Infusiones',   descripcion: 'Blend de peperina, cedrón y menta. Cosecha regional.',      unidad: 'kg', venta_por: 0.1,  precio: 25000, icono: 'brote'     },
  { id: 'mock-20', nombre: 'Té verde premium',     categoria: 'Infusiones',   descripcion: 'Hoja suelta. Antioxidante y suave al paladar.',              unidad: 'kg', venta_por: 0.1,  precio: 42500, icono: 'brote'     },
  { id: 'mock-21', nombre: 'Tisana digestiva',     categoria: 'Infusiones',   descripcion: 'Menta, manzanilla e hinojo. Para después de comer.',        unidad: 'kg', venta_por: 0.1,  precio: 29000, icono: 'brote'     },

  // — Suplementos —
  { id: 'mock-22', nombre: 'Proteína vegetal',     categoria: 'Suplementos',  descripcion: 'Arveja y arroz. Neutra o vainilla, sin edulcorantes.',      unidad: 'kg', venta_por: 1,    precio: 14500, icono: 'suplemento'},
  { id: 'mock-23', nombre: 'Espirulina',           categoria: 'Suplementos',  descripcion: 'Polvo puro, sin aditivos. Una cucharadita por día.',        unidad: 'kg', venta_por: 0.2,  precio: 31000, icono: 'suplemento'},
  { id: 'mock-24', nombre: 'Cúrcuma + pimienta',   categoria: 'Suplementos',  descripcion: 'Molidos juntos para mejor absorción de curcumina.',        unidad: 'kg', venta_por: 0.1,  precio: 31000, icono: 'brote'     },
];

// — Favoritos de la landing —
// Los primeros 4 aparecen en móvil; los 8 en escritorio.
// `tono` / `tonoMovil`: 'tint' (verde) o 'tint-2' (tierra).
export const destacados = [
  {
    nombre: 'Almendras tostadas',
    nombreCorto: 'Almendras',
    categoria: 'Frutos secos',
    detalle: 'Sin sal, a granel. Por 500 g o por kilo.',
    icono: 'almendra',
    tono: 'tint-2',
  },
  {
    nombre: 'Granola artesanal',
    nombreCorto: 'Granola',
    categoria: 'Almacén',
    detalle: 'Avena, miel mendocina y semillas. Receta propia del local.',
    icono: 'bolsa',
    tono: 'tint',
  },
  {
    nombre: 'Miel pura de monte',
    nombreCorto: 'Miel pura',
    categoria: 'Almacén',
    detalle: 'De productor local de Luján de Cuyo. Sin filtrar, frasco de 500 g.',
    icono: 'frasco',
    tono: 'tint-2',
    tonoMovil: 'tint',
  },
  {
    nombre: 'Hierbas serranas',
    nombreCorto: 'Hierbas',
    categoria: 'Infusiones',
    detalle: 'Blend de peperina, cedrón y menta. Cosecha regional a granel.',
    icono: 'brote',
    tono: 'tint',
    tonoMovil: 'tint-2',
  },
  {
    nombre: 'Harina de arroz',
    categoria: 'Sin TACC',
    detalle: 'Apta celíacos, certificada. Paquete de 1 kg para toda la semana.',
    icono: 'harina',
    tono: 'tint',
  },
  {
    nombre: 'Chía',
    categoria: 'Semillas',
    detalle: 'A granel, desde 250 g. Para jugos, yogur o panificados.',
    icono: 'semilla',
    tono: 'tint-2',
  },
  {
    nombre: 'Proteína vegetal',
    categoria: 'Suplementos',
    detalle: 'Arveja y arroz. Neutra o vainilla, sin edulcorantes ni conservantes.',
    icono: 'suplemento',
    tono: 'tint-2',
  },
  {
    nombre: 'Aceite de oliva',
    categoria: 'Almacén',
    detalle: 'Extra virgen, primera prensada en frío. Botella de 500 ml.',
    icono: 'aceite',
    tono: 'tint',
  },
].map((d) => {
  const prod = catalogo.find((p) => p.nombre === d.nombre);
  return {
    ...d,
    id: prod?.id ?? null,
    precio: prod?.precio ?? null,
    venta_por: prod?.venta_por ?? 1,
    unidad: prod?.unidad ?? 'un',
  };
});

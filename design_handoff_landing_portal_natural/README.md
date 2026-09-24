# Handoff: Landing page — Portal Natural (dietética)

## Overview
Landing page de una sola página para **Portal Natural**, una dietética / almacén natural de barrio.
Objetivo: comunicar la propuesta (productos naturales, a granel, sin TACC, asesoramiento), mostrar
una muestra del catálogo con filtro por categoría, dar ubicación y horarios, y capturar una consulta
por correo o WhatsApp.

Idioma: **español rioplatense** (voseo: "escribinos", "visitanos", "armá tu pedido"). Mantenerlo.

## About the Design Files
El archivo incluido (`Portal Natural.dc.html`) es una **referencia de diseño hecha en HTML** — un
prototipo que muestra el aspecto y el comportamiento buscados, **no código de producción para copiar
tal cual**. La tarea es **recrear este diseño en el entorno del proyecto destino** (React, Next.js,
Astro, Vue, etc.) usando sus patrones y librerías existentes. Si todavía no hay proyecto, elegir el
stack más apropiado (recomendado: Astro o Next.js + CSS variables / Tailwind con los tokens de abajo)
e implementarlo ahí.

Notas sobre el archivo: usa un runtime propio de prototipado — el markup vive entre `<x-dc>` y
`</x-dc>`, los estilos son **inline** y la lógica es una clase JS (`class Component extends DCLogic`)
cuyo método `renderVals()` devuelve los datos del template. Al portarlo: el markup se traduce a JSX/
templates normales, los estilos inline a CSS/clases del proyecto, y `renderVals()` a estado de
componente. Los `<image-slot>` son placeholders de imagen del prototipo → reemplazar por `<img>`
reales.

## Fidelity
**High-fidelity.** Colores, tipografía, espaciado, estados e interacciones son definitivos.
Recrear la UI con fidelidad visual usando las librerías del codebase.

---

## Design Tokens

Sistema de diseño **Organic**: crema + terracota + sage, formas muy redondeadas, display Caprasimo.

### Color

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-bg` | #f5ead8 | fondo de página (crema) |
| `--color-text` | #201e1d | texto principal |
| `--color-accent` | #c67139 | acento 1 (terracota) |
| `--color-accent-2` | #7a8a5e | acento 2 (sage) |

Cada rol (`neutral`, `accent`, `accent-2`) tiene rampa **100 → 900** generada en OKLCH sobre la misma
escala perceptual de luminosidad (`--color-accent-100` … `--color-accent-900`, etc.). Reglas:

- **100–300**: rellenos tintados, hovers, bordes suaves.
- **500**: base del rol.
- **700–900**: texto sobre relleno tintado y estados pressed.
- Texto tamaño párrafo en acento: usar **`--color-accent-700`**, nunca `--color-accent` (contraste).
- Preferir pasos de rampa antes que `color-mix()` ad-hoc.
- `--color-divider` para líneas de 1px.

Transparencias usadas en el prototipo para texto secundario:
`color-mix(in srgb, var(--color-text) 82%/76%/72%/62%/60%, transparent)` — al portar, mapear a
2–3 tonos de texto secundario del codebase.

### Tipografía

- `--font-heading`: **Caprasimo** 400 — única voz display, solo para headings.
- `--font-body`: **Figtree** 400/600/700 — todo el resto.
- Google Fonts: `family=Caprasimo:wght@400&family=Figtree:wght@400;600;700`

| Rol | Tamaño | Line-height | Letter-spacing |
| --- | --- | --- | --- |
| H1 hero | clamp(42px, 5.6vw, 74px) | 1.06 | -0.02em |
| H2 sección | clamp(30px, 3.6vw, 46px) | 1.12 | -0.015em |
| H3 card / feature | 19–20px | 26px | — |
| Body | 16.5–17.5px | 28–30px | — |
| Body small | 14–14.5px | 22–23px | — |
| Kicker / eyebrow | 12.5–13px, weight 600, UPPERCASE | — | 0.08em |
| Tag hero | 13px, weight 600, UPPERCASE | — | 0.04em |
| Nav links | 15px | — | — |
| Números stat | 38px (Caprasimo) | 1 | — |

### Radios, sombras, espaciado

- `--radius-lg` (16px) para contenedores; **999px** para botones, chips, inputs y avatares.
- Panel de contacto: `calc(2 * var(--radius-lg))`.
- Sombras: `--shadow-sm` / `--shadow-md` / `--shadow-lg` — nunca box-shadows inventadas.
- Padding horizontal de sección: `clamp(20px, 5vw, 72px)`; ancho máximo de contenido **1200px**, centrado.
- Padding vertical de sección: `clamp(52px, 6–7vw, 96–104px)`.

### Iconos
**Lucide** (lucide.dev), `stroke-width: 2.75`, `stroke-linecap/linejoin: round`, tamaños 14 / 18 / 20 px.
Iconos usados: `leaf`, `shopping-bag`, `ban`, `message-square`, `check`, `map-pin`, `clock`, `phone`.

### Reglas del sistema
- Layout asimétrico, alineado a la izquierda; aire generoso.
- Nada de esquinas duras ni geometría de hairline.
- Fotos siempre dentro del wrapper `.washed` (desaturado, menor contraste) y con bordes redondeados o máscaras orgánicas.
- Sage (`accent-2`) es una **segunda voz real**, no un highlight ocasional.
- Focus de teclado: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` — nunca el anillo azul por defecto.
- Disabled: opacidad 45%.

---

## Screens / Views

Una sola página, scroll vertical, con navegación por anclas: `#inicio`, `#nosotros`, `#catalogo`,
`#ubicacion`, `#contacto`. `html { scroll-behavior: smooth; }`.

### 1. Nav (sticky)
- **Propósito**: navegación y CTA permanente.
- **Layout**: flex horizontal, `position: sticky; top: 0; z-index: 20`, padding `14px clamp(20px,5vw,72px)`.
  Fondo `color-mix(in srgb, var(--color-bg) 88%, transparent)` + `backdrop-filter: blur(10px)`,
  borde inferior 1px `--color-divider`.
- **Brand** (izquierda, `margin-right: auto`): círculo 38px `--color-accent-2-700` con la letra "P" en
  Caprasimo 17px color `--color-accent-2-100`, + wordmark "Portal Natural" en Caprasimo 21px,
  letter-spacing -0.01em. Enlaza a `#inicio`.
- **Links** (derecha): "Nosotros", "Catálogo", "Ubicación" — 15px, `opacity: .78`;
  hover → `opacity: 1` + color `--color-accent-700`, sin subrayado. Gap `clamp(14px,2vw,26px)`, wrap permitido.
- **CTA**: botón pill primario "Ver catálogo" → `#contacto`; padding 9px 20px, 15px, `white-space: nowrap`;
  hover → fondo `--color-accent-600`.

### 2. Hero — `#inicio`
- **Propósito**: propuesta de valor + dos CTAs + prueba social ligera.
- **Layout**: grid `repeat(auto-fit, minmax(320px, 1fr))`, gap `clamp(28px,5vw,72px)`, items centrados,
  padding `clamp(40px,6vw,88px) … clamp(36px,5vw,72px)`. `position: relative` (contiene el SVG decorativo).
- **Decoración de ramas (importante)**: un `<svg viewBox="0 0 1200 620" preserveAspectRatio="none">` en
  `position:absolute; inset:0; z-index:0; pointer-events:none; overflow:visible`, **detrás** del contenido
  (el texto va en `z-index: 1`). Tres ramas orgánicas que cruzan la sección:
  1. Superior, de borde a borde (`opacity .85`), 5 hojas.
  2. Inferior, de borde a borde (`opacity .75`), 4 hojas.
  3. Media-izquierda, corta (`opacity .9`), 2 hojas.
  **Tallos**: `stroke` marrón pastel = `--color-accent-200` / `--color-accent-300`, `stroke-width: 2.75`,
  `stroke-linecap: round`, `fill: none`, curvas Bézier suaves.
  **Hojas**: paths cerrados en forma de gota, `fill` verde pastel = `--color-accent-2-200` /
  `--color-accent-2-300`, sin stroke. (Ver los paths exactos en el HTML adjunto.)
- **Columna izquierda**:
  - Tag pill `.tag.tag-accent-2`: icono leaf 14px + "Dietética de barrio". Fondo `--color-accent-2-200`,
    texto `--color-accent-2-800`, padding 6px 14px.
  - H1 en dos líneas: "Comer bien," (color texto) / "simple y natural" (`--color-accent-700`).
  - Párrafo, `max-width: 46ch`: "Semillas, frutos secos, harinas, suplementos y productos sin TACC.
    Seleccionamos cada partida a granel y envasada para que tu alimentación sea más consciente."
  - Botones: primario pill "Explorar productos" → `#catalogo`; secundario pill "Cómo llegar" →
    `#ubicacion` (fondo transparente, borde 1px `--color-neutral-400`, hover `--color-neutral-200`).
    Ambos 13px/26px, 16px, `white-space: nowrap`, flex-wrap con gap 12px.
  - Stats (flex, gap 34px): **+50** (`--color-accent-2-700`) "productos seleccionados" ·
    **100%** (`--color-accent-700`) "a granel, sin envases de más". Número Caprasimo 38px,
    label 14px/19px en `max-width: 12ch`.
- **Columna derecha**:
  - Dos círculos decorativos detrás (`z-index: 0`): 320px `--color-accent-2-200` arriba-derecha,
    150px `--color-accent-200` abajo-izquierda.
  - Foto principal en `figure.washed` con máscara orgánica:
    `border-radius: 58% 42% 48% 52% / 52% 50% 50% 48%`, `aspect-ratio: 5/6`, `--shadow-md`.
    Contenido: **foto del local / mostrador**.
  - Badge flotante pill (`margin-top: -28px`, alineado a la derecha): "Abierto hoy · 9 a 20 h",
    fondo `--color-neutral-100`, `--shadow-sm`, 14px/600.

### 3. Franja de features
- **Layout**: fondo `--color-accent-2-100` a todo el ancho; interior 1200px, grid
  `repeat(auto-fit, minmax(210px,1fr))`, gap `clamp(24px,3vw,44px)`, padding vertical `clamp(36px,4vw,56px)`.
- **Cada ítem**: círculo 40px con icono 20px (alternando `accent-2-200/800` y `accent-200/800`),
  H3 19px/26px, párrafo 14.5px/23px.
- **Contenido**:
  1. leaf — "Productos naturales" — "Selección sin conservantes ni aditivos innecesarios."
  2. shopping-bag — "Armá tu pedido" — "Lo dejamos preparado y lo retirás cuando quieras."
  3. ban — "Apto sin TACC" — "Línea celíaca identificada y separada en góndola."
  4. message-square — "Asesoramiento" — "Te ayudamos a elegir según lo que necesitás."

### 4. Nosotros — `#nosotros`
- **Layout**: grid `repeat(auto-fit, minmax(300px,1fr))`, gap `clamp(28px,5vw,80px)`,
  padding vertical `clamp(56px,7vw,104px)`. Imagen a la izquierda, texto a la derecha.
- **Imagen**: `figure.washed`, `border-radius: 48% 52% 55% 45% / 46% 44% 56% 54%`, `aspect-ratio: 4/5`,
  `--shadow-sm`; círculo 160px `--color-accent-2-200` detrás, abajo-derecha. Contenido: **foto del equipo**.
- **Texto**: kicker "Sobre nosotros" (`--color-accent-700`); H2 "Una dietética pensada como
  *un lugar de encuentro*" (segunda parte en `--color-accent-2-700`); dos párrafos de `max-width: 58ch`;
  lista de 3 ítems con check de Lucide en `--color-accent-2-700` (20px, `margin-top: 5px`, `flex: none`),
  gap 12px:
  - "Atención personalizada, sin apuro"
  - "Productos frescos con rotación semanal"
  - "Envases retornables y bolsas de papel"

### 5. Catálogo — `#catalogo`
- **Propósito**: muestra filtrable del catálogo. Es la sección interactiva principal.
- **Layout**: fondo `--color-neutral-100`; header flex con `space-between` y `align-items: flex-end`
  (kicker "Catálogo" + H2 "Algunos de *nuestros favoritos*" a la izquierda; botón secundario pill
  "Ver catálogo completo →" a la derecha).
- **Chips de filtro**: fila flex-wrap, gap 10px, margen `32px 0 30px`. Categorías:
  **Todos · Granel · Sin TACC · Almacén · Suplementos**.
  - Base: 14.5px/600, pill, padding 9px 18px, `white-space: nowrap`, `transition: background .15s ease`, cursor pointer.
  - Activo: fondo `--color-accent-2-700`, texto `--color-accent-2-100`, borde del mismo color.
  - Inactivo: transparente, texto `--color-text`, borde 1px `--color-neutral-400`.
- **Grid de productos**: `repeat(auto-fill, minmax(230px,1fr))`, gap `clamp(16px,2vw,24px)`.
- **Card**: fondo `--color-bg`, borde 1px `--color-divider`, `--radius-lg`, `overflow: hidden`,
  animación de entrada `pn-rise` (opacity 0 → 1, translateY 14px → 0, 0.35s ease both).
  Hover: `--shadow-md` + `translateY(-3px)`.
  - **Plate superior** (128px, grid centrado): fondo rotando entre `--color-accent-2-200`,
    `--color-accent-200` y `--color-neutral-200` según índice; inicial del producto en Caprasimo 42px
    con el "ink" correspondiente (`accent-2-800` / `accent-800` / `accent-2-700`).
    Badge de grupo arriba-derecha: 11px UPPERCASE 700, pill, fondo `color-mix(bg 70%, transparent)`.
    *En producción, reemplazar el plate por la foto real del producto manteniendo la altura y el badge.*
  - **Cuerpo** (padding 18px 20px 20px, flex column, gap 6px): categoría (11.5px UPPERCASE 600, texto 60%),
    nombre (Caprasimo 20px/26px), detalle (14px/22px, texto 76%), precio al pie
    (`margin-top: auto`, 16px/700, `--color-accent-700`).
- **Resumen** debajo del grid, 14px al 62%: "\`N\` productos en \`categoría\` · el catálogo completo está en el local."
  (singular "producto" si N = 1; con "Todos" el texto es "en el catálogo").

#### Datos de productos (seed)
| Nombre | Categoría | Grupo (filtro) | Detalle | Precio |
| --- | --- | --- | --- | --- |
| Almendras tostadas | Frutos secos | Granel | Sin sal agregada, por 100 g o por kilo. | $ por kg |
| Granola artesanal | Desayuno | Almacén | Avena, miel y semillas. Receta propia. | $ por 500 g |
| Miel pura de monte | Almacén | Almacén | Frasco de 500 g, de productor local. | $ por frasco |
| Hierbas serranas | Infusiones | Granel | Peperina, cedrón y menta a granel. | $ por 100 g |
| Harina de arroz | Sin TACC | Sin TACC | Paquete de 1 kg, apto celíacos. | $ por kg |
| Chía y lino | Semillas | Granel | A granel, desde 100 g. | $ por 100 g |
| Proteína vegetal | Suplementos | Suplementos | Arveja y arroz, neutra o vainilla. | $ por 500 g |
| Aceite de oliva | Aceites | Almacén | Extra virgen, primera prensada en frío. | $ por litro |
| Premezcla sin TACC | Sin TACC | Sin TACC | Para pan y pizza, rinde 1 kg. | $ por kg |
| Magnesio en polvo | Suplementos | Suplementos | Citrato, envase de 250 g. | $ por envase |

Los precios son placeholders — el cliente debe cargar los reales.

### 6. Ubicación — `#ubicacion`
- **Layout**: grid `repeat(auto-fit, minmax(300px,1fr))`, gap `clamp(28px,5vw,76px)`, padding vertical `clamp(56px,7vw,104px)`.
- **Izquierda**: `figure.washed`, `--radius-lg`, `aspect-ratio: 4/3`, `--shadow-sm` — **mapa o foto de la cuadra**.
  En producción: embed de mapa real (Google Maps / Leaflet) con el mismo radio y proporción.
- **Derecha**: kicker "Ubicación", H2 "Visitanos en el *local*"; lista de 3 ítems (gap 20px), cada uno con
  círculo 38px + icono 18px (alternando accent-2 / accent), título 16.5px bold y subtítulo 14.5px al 72%:
  - map-pin — "[Calle y número]" / "[Barrio], [Ciudad]"
  - clock — "Lunes a viernes 9 a 20 h" / "Sábados 9 a 14 h · Domingos cerrado"
  - phone — "[Teléfono / WhatsApp]" / "También tomamos pedidos por mensaje"
  - CTA pill primario "Escribinos" → `#contacto` (margin-top 30px, padding 13px 28px).

### 7. Contacto — `#contacto`
- **Panel oscuro**: fondo `--color-accent-2-900`, texto `--color-accent-2-100`,
  `border-radius: calc(2 * var(--radius-lg))`, padding `clamp(36px,5vw,76px) clamp(24px,5vw,68px)`,
  `overflow: hidden`. Círculo decorativo 300px abajo-izquierda en
  `color-mix(in srgb, var(--color-accent-2-100) 8%, transparent)`.
- **Grid**: `repeat(auto-fit, minmax(290px,1fr))`, gap `clamp(28px,5vw,64px)`.
- **Izquierda**: H2 "¿Buscás algo *en particular*?" (segunda parte en `--color-accent-300`) + párrafo
  `max-width: 46ch`: "Escribinos y te decimos si lo tenemos, cuánto sale y te lo dejamos reservado
  hasta que pases."
- **Derecha**: label "Tu correo o teléfono"; input pill `min-height: 52px`, padding 12px 22px, 16px,
  fondo `color-mix(accent-2-100 10%, transparent)`, borde 1px `color-mix(accent-2-100 26%, transparent)`,
  texto `--color-accent-2-100`, placeholder "hola@correo.com".
  Botón block pill `min-height: 52px`, 16px/700, fondo `--color-neutral-100`, texto `--color-accent-2-900`,
  hover `--color-accent-200`. Label: "Enviar consulta" → tras enviar: "¡Gracias! Te respondemos hoy".

### 8. Footer
- Borde superior 1px `--color-divider`; grid `repeat(auto-fit, minmax(210px,1fr))`, gap `clamp(24px,4vw,56px)`,
  padding `clamp(36px,4vw,60px) clamp(20px,5vw,72px)`.
- **Col 1**: brand (círculo 34px + wordmark Caprasimo 19px) + "Dietética y almacén natural. Productos a
  granel, sin TACC y asesoramiento." (14.5px/23px, `max-width: 34ch`).
- **Col 2** "Secciones": Nosotros · Catálogo completo · Ubicación.
- **Col 3** "Contacto": [Calle y número] · [Teléfono] · [@instagram].
- Línea inferior: "© 2026 Portal Natural", 13px al 60%.

---

## Interactions & Behavior

- **Filtro de catálogo**: click en chip → `cat` cambia → el grid se filtra por `grupo` ("Todos" muestra todo)
  y el texto de resumen se recalcula. Las cards reentran con la animación `pn-rise` (0.35s ease).
- **Formulario de contacto**: click en "Enviar consulta" → `sent = true` → el label del botón pasa a
  "¡Gracias! Te respondemos hoy". En producción: validar el campo (email o teléfono, requerido),
  enviar a un endpoint / formulario, mostrar estados de loading y error, y limpiar el input al éxito.
- **Navegación**: anclas con scroll suave; nav sticky con blur.
- **Hovers**: botón primario → `--color-accent-600`; secundario → fondo `--color-neutral-200`;
  links del nav → opacidad 1 + `--color-accent-700`; cards → `--shadow-md` + `translateY(-3px)`.
- **Focus**: anillo `2px solid var(--color-accent)` con `outline-offset: 2px` en todo lo interactivo.
- **Responsive**: todas las secciones usan `auto-fit` + `minmax`, así que colapsan a una columna por
  debajo de ~640–700px sin media queries. Verificar en móvil: el SVG de ramas del hero
  (`preserveAspectRatio: none`) se estira — considerar reducir su opacidad u ocultarlo por debajo de 600px.
  Targets táctiles: mínimo 44px (los chips quedan en ~40px — subirlos a 44px en móvil).

## State Management
Estado local de la página, sin backend en el prototipo:

| Estado | Tipo | Inicial | Trigger |
| --- | --- | --- | --- |
| `cat` | string | `"Todos"` | click en chip de filtro |
| `sent` | boolean | `false` | submit del formulario de contacto |
| `showPrices` | boolean (prop) | `true` | flag de configuración: si es `false`, todos los precios muestran "Consultá el precio" |

En producción, el catálogo debería venir de un CMS o JSON (nombre, categoría, grupo, detalle, precio, foto).

## Assets
- **3 fotos a proveer por el cliente**: (1) local / mostrador — vertical 5:6; (2) equipo — vertical 4:5;
  (3) mapa o foto de la cuadra — 4:3. En el prototipo son placeholders `<image-slot>`.
- **Fotos de producto**: 10, cuadradas o 16:10, para reemplazar los "plates" con inicial de las cards.
- **Iconos**: Lucide, stroke-width 2.75 (instalar `lucide` / `lucide-react` en vez de pegar los SVG).
- **Fuentes**: Caprasimo 400 y Figtree 400/600/700 desde Google Fonts (o self-hosted).
- **Ramas del hero**: SVG inline, incluido en el HTML adjunto — extraerlo tal cual a un componente o `.svg`.

## Content TODO (pendiente del cliente)
Reemplazar todos los placeholders entre corchetes: `[Calle y número]`, `[Barrio], [Ciudad]`,
`[Teléfono / WhatsApp]`, `[@instagram]`, y los precios reales de los 10 productos.
Confirmar también horarios y el claim "+50 productos".

## Files
- `Portal Natural.dc.html` — la landing completa (referencia de diseño).
- `image-slot.js` — componente de placeholder de imagen usado por el prototipo; **no portar**, se
  reemplaza por `<img>` reales.
- `_ds/` — el sistema de diseño Organic: `styles.css` (todos los tokens y clases: `.btn`, `.tag`,
  `.card`, `.input`, `.nav`, `.washed`…), `readme.md` (la guía), `theme.json` (los parámetros del tema).
  **Empezar por `styles.css`** — es la fuente de verdad de los valores exactos de cada token.

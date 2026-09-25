# Portal Natural — landing + panel de gestión

Sitio de Portal Natural (dietética) en React + Vite. Tiene dos partes:

- **Landing** en `/` y **catálogo extendido** en `/catalogo` (buscador, pedido y envío por WhatsApp). El diseño de referencia es `design/Design.html` (escritorio 1280 px, móvil 390 px y catálogo).
- **Panel de gestión** en `/admin`: clientes, stock, ventas y reportes. Los datos viven en Supabase (Postgres en la nube) y el acceso es con usuario y contraseña.

## Para el equipo: accesos y recursos

Todo lo que se necesita para trabajar en el proyecto:

| Recurso | Dónde | Cómo acceder |
|---|---|---|
| Código | https://github.com/pedrodonnarumma/portalnatural | Pedir acceso al repo como colaborador. |
| Base de datos y usuarios | Supabase, proyecto `ihtdpnrmphzmnipfxwkp` (https://supabase.com/dashboard/project/ihtdpnrmphzmnipfxwkp) | Pedir invitación al proyecto: el dueño la manda desde Organization → Team → Invite. |
| URL de la API | `https://ihtdpnrmphzmnipfxwkp.supabase.co` | Va en `VITE_SUPABASE_URL`. |
| Clave pública (anon) | Supabase → Project Settings → API Keys → pestaña Legacy API keys → `anon` (empieza con `eyJ`) | Va en `VITE_SUPABASE_ANON_KEY`. No está en el repo: se copia a mano al `.env`. |
| Usuario del panel | Supabase → Authentication → Users | Cada persona del equipo puede tener el suyo (Add user, con Auto Confirm). |
| Mails de promociones | Resend (https://resend.com) | Opcional. Ver la sección de mails más abajo. |
| Hosting | Vercel o Netlify | Todavía no publicado. Ver "Publicar en la nube". |

Pasos para arrancar en otra computadora:

```bash
git clone https://github.com/pedrodonnarumma/portalnatural.git
cd portalnatural
npm install
copy .env.example .env      # en Windows; en Mac/Linux: cp .env.example .env
```

Después abrir `.env` y completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los valores de la tabla. Luego `npm run dev` y entrar a http://localhost:5173/admin con el usuario del panel.

El archivo `.env` está en `.gitignore` y nunca se sube: cada uno lo completa localmente. La base de datos ya está creada y con el esquema cargado, no hace falta volver a ejecutar `supabase/schema.sql` salvo que cambie.

## Uso local

```bash
npm install
cp .env.example .env   # y completar las variables (ver abajo)
npm run dev            # http://localhost:5173  ·  panel en /admin
npm run build          # genera dist/
```

## Configurar Supabase (una sola vez)

1. Crear un proyecto en [supabase.com](https://supabase.com) (plan gratuito alcanza).
2. Ir a **SQL Editor**, pegar el contenido de `supabase/schema.sql` y ejecutarlo. Crea las tablas, las reglas de seguridad y las funciones de venta/stock. Se puede volver a correr sin problema.
   - Al final del archivo hay productos de ejemplo comentados; descomentarlos si querés arrancar con datos.
3. Ir a **Authentication → Users → Add user** y crear el usuario con el que va a entrar el local (correo + contraseña). Marcar “Auto confirm user”.
4. En **Authentication → Sign In / Providers → Email**, desactivar **Allow new users to sign up** para que nadie pueda registrarse solo.
5. Ir a **Project Settings → API** y copiar la **Project URL** y la **anon public key** a `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Con eso, `/admin` ya muestra el login. La clave anon es pública por diseño: la seguridad la dan las políticas RLS del esquema, que solo permiten operar a usuarios autenticados.

## Mails de promociones (Resend + Edge Function)

Las promociones se mandan por correo desde una función en la nube de Supabase usando [Resend](https://resend.com) (gratis hasta 3.000 mails por mes). Se configura una vez:

1. Crear cuenta en Resend y una **API key**. Para mandar a cualquier cliente hay que verificar un dominio propio en Resend (Domains → Add). Sin dominio verificado, solo se puede enviar al correo de la cuenta de Resend (sirve para probar).
2. Instalar la CLI de Supabase y desplegar la función desde la carpeta del proyecto:

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>   # el ref está en la URL del proyecto
npx supabase secrets set RESEND_API_KEY=re_xxx "MAIL_FROM=Portal Natural <hola@tudominio.com>" MAIL_REPLY_TO=hola@tudominio.com SITE_URL=https://tusitio.com
npx supabase functions deploy enviar-promocion --no-verify-jwt
```

3. Volver a ejecutar `supabase/schema.sql` en el SQL Editor si ya lo habías corrido antes (agrega las tablas de promociones sin tocar los datos).

Con eso, desde **Promociones** se envía con un clic. El botón “Prueba” manda el mail solo a un correo para verlo antes.

**Envío automático (opcional):** si querés que una promo se mande sola el día que empieza, marcá “Enviar el mail automáticamente al iniciar” y activá el cron una sola vez: habilitá las extensiones `pg_cron` y `pg_net` en Database → Extensions, completá los dos valores marcados en `supabase/cron.sql` (ref del proyecto y service role key, en Project Settings → API) y ejecutalo en el SQL Editor. Revisa cada hora y manda las promos vigentes pendientes.

## Publicar en la nube

El proyecto es estático (Vite) y funciona en cualquier hosting con soporte para SPA. Recomendado: **Vercel** o **Netlify**, ambos gratis.

1. Subir el repo a GitHub.
2. Importar el repo en Vercel/Netlify. Detectan Vite solos (build `npm run build`, salida `dist`).
3. Cargar las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (y `VITE_CONTACT_ENDPOINT` si se usa) en la configuración del proyecto del hosting.
4. Deploy. Cada push a `main` vuelve a publicar.

Ya están incluidos `vercel.json` y `public/_redirects` para que `/admin` cargue bien al recargar la página.

## Pedidos web

Los clientes pueden armar un pedido desde `/catalogo` y confirmarlo sin salir del sitio. El flujo es:

1. El cliente agrega productos al carrito y presiona **"Hacer pedido"**.
2. Se abre un modal donde ingresa nombre y teléfono (se recuerdan para la próxima visita).
3. Al confirmar, se llama a la RPC `crear_pedido_web` con la anon key. El precio lo fija siempre la base de datos: si alguien intenta manipular el precio desde el navegador, la función lo ignora.
4. La venta queda con `estado = 'pendiente'` y `origen = 'web'`, el stock se descuenta en ese momento (el pedido reserva la mercadería).
5. El modal muestra el número de pedido y un botón **"Enviar por WhatsApp"** para coordinar el retiro.
6. Desde el panel (Ventas → Pendientes) el local ve el pedido, puede **marcar como pagado** (elige el medio de pago) o **cancelar** (el stock vuelve).

**Estados de una venta:**

| Estado | Descripción |
|---|---|
| `pendiente` | Pedido web confirmado, no cobrado aún |
| `pagada` | Venta registrada y cobrada |
| `cancelada` | Anulada (stock devuelto) |

### Pasos de migración SQL

Si la base de datos ya existe (hay datos en producción), correr el bloque **"MIGRACIÓN pedidos web"** al final de `supabase/schema.sql` en el SQL Editor de Supabase. El bloque es idempotente: agrega columnas con `add column if not exists`, actualiza los registros anulados existentes y recrea las funciones sin borrar datos.

En resumen, los cambios que aplica:
- Agrega columnas `estado`, `origen`, `contacto_nombre`, `contacto_telefono`, `direccion_envio`, `pagada_at`, `cancelada_at` a la tabla `ventas`.
- Sincroniza: `update ventas set estado = 'cancelada' where anulada = true`.
- Recrea `registrar_venta` (drop + create) para aceptar `p_estado` y `p_direccion_envio`.
- Crea `crear_pedido_web` (SECURITY DEFINER, `grant execute to anon`).
- Crea `marcar_venta_pagada` y `cancelar_venta`.
- Reemplaza `anular_venta` con un alias a `cancelar_venta`.
- Emite `notify pgrst, 'reload schema'` para que PostgREST actualice la caché.

## Cómo se usa el panel

- **Ventas**: arriba aparecen los pedidos web **Pendientes** (sin filtro de fecha). Cada uno muestra el contacto con link a WhatsApp, el origen (Web/Local) y las acciones: ver detalle, marcar como pagado o cancelar. El listado inferior muestra el resto de ventas con tag de estado; total y cantidad cuentan solo las pagadas. “Nueva venta” permite elegir estado (Pagada/Pendiente) y dirección de envío opcional.
- **Clientes**: alta, edición y baja. Sirve para asignar ventas y ver mejores clientes en reportes.
- **Artículos**: la ficha de cada producto: nombre, categoría, unidad de venta, precio, costo opcional (muestra el margen), stock mínimo y si está activo. Al crear uno se puede cargar el stock inicial.
- **Stock**: las existencias de los artículos activos, con valor del inventario a costo y a venta, cantidad con stock bajo y sin stock. Desde acá se ingresa mercadería o se ajusta el stock con motivo, se ve el historial por artículo y la pestaña “Movimientos” lista todo lo que entró y salió (ingresos, ajustes, ventas y anulaciones).
- **Promociones**: se arma con título, texto, vigencia y los productos con su precio promocional. Mientras está vigente y activa, la pantalla de ventas usa el precio promo automáticamente. Se envía por mail a todos los clientes con correo que aceptan promociones (opción en la ficha del cliente), con prueba previa y registro de envíos.
- **Reportes**: por período (hoy, semana, mes, 30 días o personalizado). Total vendido, cantidad de ventas, ticket promedio, ventas por día, productos más vendidos, medios de pago, mejores clientes y productos con stock bajo.

## Estructura

- `src/styles/theme.css`: colores, fuentes (DM Sans y Fraunces, en `public/fonts/`) y base. `src/styles/site.css`: landing y catálogo; escritorio desde 1024 px, móvil por debajo.
- `src/styles/admin-base.css` + `src/styles/admin.css`: estilos del panel (se cargan solo en `/admin`).
- `src/pages/`: `Landing.jsx` y `Catalogo.jsx`. `src/components/`: secciones de la landing, `Nav`, `Brand` (logo en `public/logo.jpg`) e `icons.jsx` (íconos del diseño).
- `src/lib/pedido.js`: pedido del catálogo (se guarda en el navegador) y armado del mensaje de WhatsApp. El número va en `site.whatsapp`.
- `src/admin/`: panel. `AdminApp.jsx` (auth + rutas), `Layout.jsx`, `Login.jsx`, `pages/` (Ventas, Clientes, Artículos, Stock, Promociones, Reportes), `components/ui.jsx` (modal, toasts, campos), `lib/format.js` (formato de moneda, fechas, listas fijas).
- `src/lib/supabase.js`: cliente de Supabase. `supabase/schema.sql`: esquema completo de la base. `supabase/functions/enviar-promocion/`: función que manda los mails. `supabase/cron.sql`: envío automático opcional.
- `src/data/site.js` y `src/data/products.js`: datos públicos (dirección, horarios, WhatsApp, catálogo con precios y favoritos de la landing).
- `src/lib/pedido.js`: pedido del catálogo y funciones de mensaje WhatsApp. El número va en `site.whatsapp`. `src/lib/precios.js`: cálculo de precios por fracción.

## Verificación post-migración SQL (Fase 1A)

Después de ejecutar el bloque Fase 1A en el SQL Editor, corrés estos `curl` con la **anon key** para confirmar que la seguridad quedó como se espera. Reemplazá `<ANON_KEY>` con el valor de `VITE_SUPABASE_ANON_KEY`.

```bash
SB="https://ihtdpnrmphzmnipfxwkp.supabase.co"
KEY="<ANON_KEY>"
```

### 1. `productos` directo — anon ve productos activos (hasta que corra Fase 1B)

```bash
curl -s "$SB/rest/v1/productos?activo=eq.true&select=nombre,precio,costo,stock&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -m json.tool
```

**Resultado esperado:** un array con un producto. Los campos `costo` y `stock` todavía son visibles (se eliminan en Fase 1B). Después de Fase 1B, devuelve `[]`.

### 2. `precios_promo_vigentes` — anon debe recibir 401 / error de permisos

```bash
curl -s "$SB/rest/v1/precios_promo_vigentes?select=*&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -m json.tool
```

**Resultado esperado:** `{"code":"42501","message":"permission denied for view precios_promo_vigentes"}` (o similar). Si devuelve datos, el `revoke` no se aplicó.

### 3. `catalogo_publico` — anon ve productos con precio lista + precio_promo

```bash
curl -s "$SB/rest/v1/catalogo_publico?select=nombre,precio,precio_promo,unidad&order=nombre&limit=3" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" | python3 -m json.tool
```

**Resultado esperado:** array de productos. `precio` es el precio de lista. `precio_promo` es el precio promo o `null` si no hay. Ningún campo `costo` ni `stock` visible.

```json
[
  { "nombre": "Almendras", "precio": 12000, "precio_promo": null, "unidad": "kg" },
  { "nombre": "Nueces",    "precio": 15000, "precio_promo": 12000, "unidad": "kg" }
]
```

### 4. `resumen_ventas` — anon debe recibir error de permisos

```bash
curl -s "$SB/rest/v1/rpc/resumen_ventas" \
  -X POST -H "Content-Type: application/json" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -d '{"desde":"2025-01-01T00:00:00Z","hasta":"2025-12-31T23:59:59Z"}' | python3 -m json.tool
```

**Resultado esperado:** `{"code":"42501","message":"permission denied for function resumen_ventas"}`. Si devuelve datos, el `revoke` de la función no se aplicó.

### 5. `crear_pedido_web` — anon puede llamarla (es la única RPC pública)

```bash
curl -s "$SB/rest/v1/rpc/crear_pedido_web" \
  -X POST -H "Content-Type: application/json" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -d '{"p_nombre":"Test","p_telefono":"2615000000","p_items":[]}' | python3 -m json.tool
```

**Resultado esperado:** `{"code":"P0001","message":"El pedido no tiene ítems"}`. El error de validación confirma que la función es accesible para anon (si fuera 401 hay un problema con el grant).

---

## Pendiente del cliente

- Cargar foto del local en `public/` y poner su ruta en `fotos.local` de `src/data/site.js`.
- Cargar los precios reales en `src/data/products.js` (el catálogo público usa estos datos cuando Supabase no está configurado; si lo está, carga los productos desde la base).
- Ejecutar el bloque de migración SQL en Supabase si la base ya tenía datos (ver sección "Pedidos web" arriba).

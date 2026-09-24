# Portal Natural — landing + panel de gestión

Sitio de Portal Natural (dietética) en React + Vite. Tiene dos partes:

- **Landing** en `/`: página pública, implementada a partir del handoff en `design_handoff_landing_portal_natural/`.
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

## Cómo se usa el panel

- **Ventas**: “Nueva venta” abre el buscador de productos. Se agregan al ticket tocándolos, se ajusta cantidad (admite decimales para granel) y precio si hace falta, se elige cliente (opcional) y medio de pago. Al registrar, descuenta stock. Una venta se puede anular desde su detalle y el stock vuelve.
- **Clientes**: alta, edición y baja. Sirve para asignar ventas y ver mejores clientes en reportes.
- **Artículos**: la ficha de cada producto: nombre, categoría, unidad de venta, precio, costo opcional (muestra el margen), stock mínimo y si está activo. Al crear uno se puede cargar el stock inicial.
- **Stock**: las existencias de los artículos activos, con valor del inventario a costo y a venta, cantidad con stock bajo y sin stock. Desde acá se ingresa mercadería o se ajusta el stock con motivo, se ve el historial por artículo y la pestaña “Movimientos” lista todo lo que entró y salió (ingresos, ajustes, ventas y anulaciones).
- **Promociones**: se arma con título, texto, vigencia y los productos con su precio promocional. Mientras está vigente y activa, la pantalla de ventas usa el precio promo automáticamente. Se envía por mail a todos los clientes con correo que aceptan promociones (opción en la ficha del cliente), con prueba previa y registro de envíos.
- **Reportes**: por período (hoy, semana, mes, 30 días o personalizado). Total vendido, cantidad de ventas, ticket promedio, ventas por día, productos más vendidos, medios de pago, mejores clientes y productos con stock bajo.

## Estructura

- `src/styles/organic.css`: sistema de diseño Organic (tokens + clases).
- `src/styles/app.css`: estilos de la landing. `src/styles/admin.css`: estilos del panel.
- `src/components/`: secciones de la landing.
- `src/admin/`: panel. `AdminApp.jsx` (auth + rutas), `Layout.jsx`, `Login.jsx`, `pages/` (Ventas, Clientes, Artículos, Stock, Promociones, Reportes), `components/ui.jsx` (modal, toasts, campos), `lib/format.js` (formato de moneda, fechas, listas fijas).
- `src/lib/supabase.js`: cliente de Supabase. `supabase/schema.sql`: esquema completo de la base. `supabase/functions/enviar-promocion/`: función que manda los mails. `supabase/cron.sql`: envío automático opcional.
- `src/data/site.js` y `src/data/products.js`: datos de la landing (dirección, horarios, catálogo público).
- `src/lib/contact.js`: formulario de contacto. Sin `VITE_CONTACT_ENDPOINT`, el envío se simula.

## Pendiente del cliente

- Reemplazar los placeholders entre corchetes en `src/data/site.js`.
- Cargar las fotos en `public/` y poner sus rutas en `fotos`, o la URL de embed de Google Maps en `mapaEmbed`.
- Cargar los precios reales en `src/data/products.js` (el catálogo público sigue siendo estático, independiente del stock del panel).

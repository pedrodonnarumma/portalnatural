-- Portal Natural — esquema del sistema de gestión.
-- Ejecutar completo en Supabase → SQL Editor. Es idempotente: se puede volver a correr.

create extension if not exists "pgcrypto";

-- ───────────────────────── Tablas ─────────────────────────

create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  categoria     text,
  unidad        text not null default 'un' check (unidad in ('un', 'kg', 'g', 'l')),
  precio        numeric(12,2) not null default 0 check (precio >= 0),
  costo         numeric(12,2) check (costo is null or costo >= 0),
  stock         numeric(12,3) not null default 0,
  stock_minimo  numeric(12,3) not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists public.ventas (
  id          uuid primary key default gen_random_uuid(),
  numero      bigint generated always as identity,
  cliente_id  uuid references public.clientes(id) on delete set null,
  fecha       timestamptz not null default now(),
  medio_pago  text not null default 'efectivo' check (medio_pago in ('efectivo', 'transferencia', 'debito', 'credito', 'otro')),
  total       numeric(12,2) not null default 0,
  notas       text,
  anulada     boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.venta_items (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references public.ventas(id) on delete cascade,
  producto_id     uuid references public.productos(id) on delete set null,
  nombre          text not null,              -- snapshot del nombre al momento de la venta
  cantidad        numeric(12,3) not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  subtotal        numeric(12,2) not null
);

create table if not exists public.movimientos_stock (
  id           uuid primary key default gen_random_uuid(),
  producto_id  uuid not null references public.productos(id) on delete cascade,
  tipo         text not null check (tipo in ('ingreso', 'ajuste', 'venta', 'anulacion')),
  cantidad     numeric(12,3) not null,        -- con signo: positivo suma stock, negativo resta
  motivo       text,
  venta_id     uuid references public.ventas(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists ventas_fecha_idx on public.ventas (fecha desc);
create index if not exists venta_items_venta_idx on public.venta_items (venta_id);
create index if not exists movimientos_producto_idx on public.movimientos_stock (producto_id, created_at desc);

-- ───────────────────────── Seguridad (RLS) ─────────────────────────
-- Solo usuarios autenticados (los que se crean en Authentication → Users) pueden operar.

alter table public.clientes          enable row level security;
alter table public.productos         enable row level security;
alter table public.ventas            enable row level security;
alter table public.venta_items       enable row level security;
alter table public.movimientos_stock enable row level security;

do $$
declare t text;
begin
  foreach t in array array['clientes', 'productos', 'ventas', 'venta_items', 'movimientos_stock'] loop
    execute format('drop policy if exists "auth_all" on public.%I', t);
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- ───────────────────────── Funciones ─────────────────────────

-- Ingreso o ajuste manual de stock. `p_cantidad` con signo.
create or replace function public.ajustar_stock(
  p_producto_id uuid,
  p_cantidad    numeric,
  p_tipo        text default 'ajuste',
  p_motivo      text default null
) returns void
language plpgsql security invoker as $$
begin
  if p_tipo not in ('ingreso', 'ajuste') then
    raise exception 'Tipo de movimiento inválido: %', p_tipo;
  end if;
  update public.productos set stock = stock + p_cantidad where id = p_producto_id;
  if not found then raise exception 'Producto inexistente'; end if;
  insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo)
  values (p_producto_id, p_tipo, p_cantidad, p_motivo);
end $$;

-- Registra una venta completa (cabecera + ítems + descuento de stock) en una sola transacción.
-- p_items: [{ "producto_id": uuid, "cantidad": 2, "precio_unitario": 1500 }, ...]
create or replace function public.registrar_venta(
  p_items       jsonb,
  p_cliente_id  uuid default null,
  p_medio_pago  text default 'efectivo',
  p_notas       text default null
) returns uuid
language plpgsql security invoker as $$
declare
  v_venta_id uuid;
  v_item     jsonb;
  v_prod     public.productos%rowtype;
  v_cant     numeric;
  v_precio   numeric;
  v_total    numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;

  insert into public.ventas (cliente_id, medio_pago, notas)
  values (p_cliente_id, coalesce(p_medio_pago, 'efectivo'), p_notas)
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.productos where id = (v_item->>'producto_id')::uuid for update;
    if not found then raise exception 'Producto inexistente'; end if;

    v_cant   := (v_item->>'cantidad')::numeric;
    v_precio := coalesce((v_item->>'precio_unitario')::numeric, v_prod.precio);
    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida para %', v_prod.nombre; end if;

    insert into public.venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_prod.id, v_prod.nombre, v_cant, v_precio, round(v_cant * v_precio, 2));

    update public.productos set stock = stock - v_cant where id = v_prod.id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_prod.id, 'venta', -v_cant, 'Venta', v_venta_id);

    v_total := v_total + round(v_cant * v_precio, 2);
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;
  return v_venta_id;
end $$;

-- Anula una venta y devuelve el stock.
create or replace function public.anular_venta(p_venta_id uuid) returns void
language plpgsql security invoker as $$
declare v_item record;
begin
  perform 1 from public.ventas where id = p_venta_id and anulada = false for update;
  if not found then raise exception 'La venta no existe o ya está anulada'; end if;

  for v_item in select producto_id, cantidad from public.venta_items where venta_id = p_venta_id and producto_id is not null loop
    update public.productos set stock = stock + v_item.cantidad where id = v_item.producto_id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_item.producto_id, 'anulacion', v_item.cantidad, 'Anulación de venta', p_venta_id);
  end loop;

  update public.ventas set anulada = true where id = p_venta_id;
end $$;

-- ───────────────────────── Datos de ejemplo (opcional) ─────────────────────────
-- Descomentar para arrancar con algunos productos cargados.
-- insert into public.productos (nombre, categoria, unidad, precio, stock, stock_minimo) values
--   ('Almendras tostadas', 'Frutos secos', 'kg', 12000, 5, 1),
--   ('Granola artesanal', 'Desayuno', 'un', 4500, 12, 3),
--   ('Miel pura de monte', 'Almacén', 'un', 6000, 8, 2),
--   ('Harina de arroz', 'Sin TACC', 'kg', 2200, 10, 2),
--   ('Chía', 'Semillas', 'kg', 5000, 3, 1);

-- ───────────────────────── Promociones ─────────────────────────

alter table public.clientes add column if not exists acepta_promos boolean not null default true;

create table if not exists public.promociones (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descripcion   text,
  fecha_inicio  date not null default current_date,
  fecha_fin     date,
  activa        boolean not null default true,
  enviar_auto   boolean not null default false,   -- enviar el mail solo al iniciar la vigencia (requiere cron.sql)
  enviada_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.promocion_items (
  id            uuid primary key default gen_random_uuid(),
  promocion_id  uuid not null references public.promociones(id) on delete cascade,
  producto_id   uuid not null references public.productos(id) on delete cascade,
  precio_promo  numeric(12,2) not null check (precio_promo >= 0),
  unique (promocion_id, producto_id)
);

create table if not exists public.envios_promocion (
  id            uuid primary key default gen_random_uuid(),
  promocion_id  uuid not null references public.promociones(id) on delete cascade,
  cliente_id    uuid references public.clientes(id) on delete set null,
  email         text not null,
  estado        text not null check (estado in ('enviado', 'error')),
  detalle       text,
  created_at    timestamptz not null default now()
);

create index if not exists promocion_items_promo_idx on public.promocion_items (promocion_id);
create index if not exists envios_promocion_promo_idx on public.envios_promocion (promocion_id, created_at desc);

alter table public.promociones      enable row level security;
alter table public.promocion_items  enable row level security;
alter table public.envios_promocion enable row level security;

do $$
declare t text;
begin
  foreach t in array array['promociones', 'promocion_items', 'envios_promocion'] loop
    execute format('drop policy if exists "auth_all" on public.%I', t);
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- Precios promocionales vigentes hoy (un producto toma el menor si está en varias promos).
create or replace view public.precios_promo_vigentes as
  select pi.producto_id, min(pi.precio_promo) as precio_promo
  from public.promocion_items pi
  join public.promociones p on p.id = pi.promocion_id
  where p.activa
    and p.fecha_inicio <= current_date
    and (p.fecha_fin is null or p.fecha_fin >= current_date)
  group by pi.producto_id;

-- ───────────────────────── Categorías ─────────────────────────
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,
  orden      smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;

do $$
begin
  execute 'drop policy if exists "auth_all" on public.categorias';
  execute 'create policy "auth_all" on public.categorias for all to authenticated using (true) with check (true)';
  if not exists (select 1 from pg_policies where tablename = 'categorias' and policyname = 'public_read') then
    execute 'create policy "public_read" on public.categorias for select to anon using (true)';
  end if;
end $$;

-- FK en productos
alter table public.productos add column if not exists categoria_id uuid references public.categorias(id) on delete set null;

-- Migración: insertar categorías desde los textos existentes y vincular productos
insert into public.categorias (nombre)
select distinct categoria from public.productos where categoria is not null and categoria != ''
on conflict (nombre) do nothing;

update public.productos p
set categoria_id = c.id
from public.categorias c
where p.categoria = c.nombre and p.categoria_id is null;

-- ───────────────────────── Imágenes y descripciones ─────────────────────────
alter table public.productos add column if not exists imagen_url text;
alter table public.productos add column if not exists descripcion text;
alter table public.productos add column if not exists destacado boolean not null default false;

-- ───────────────────────── Venta por fracción ─────────────────────────
-- `venta_por`: fracción de la unidad base a la que refiere el precio público
-- y el paso del stepper en el carrito.
-- Ejemplos: unidad='kg' venta_por=0.1  → precio es por 100 g, se vende de a 100 g.
--           unidad='kg' venta_por=0.25 → precio es por 250 g.
--           unidad='kg' venta_por=1    → precio es por kg.
--           unidad='l'  venta_por=0.5  → precio es por 500 ml.
--           unidad='un' venta_por=1    → precio es por unidad.
--
-- IMPORTANTE — migración previa si hay productos con unidad='g':
-- Ejecutar ANTES de correr este schema si la tabla ya tiene datos con unidad='g':
--
--   UPDATE public.productos
--   SET precio = precio * 1000,
--       unidad = 'kg',
--       venta_por = 0.1
--   WHERE unidad = 'g';
--
-- Así "Nueces — $12 / g" pasa a "Nueces — $12.000 / kg, venta_por=0.1 → $1.200 / 100 g".
-- Verificar los precios con: SELECT nombre, unidad, precio, venta_por FROM productos;

alter table public.productos add column if not exists venta_por numeric(12,3) not null default 1 check (venta_por > 0);

-- Lectura pública de productos activos para la landing (sin autenticación).
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'productos' and policyname = 'public_read'
  ) then
    execute 'create policy "public_read" on public.productos for select to anon using (activo = true)';
  end if;
end $$;

-- Bucket de Storage para imágenes de productos (archivos públicos).
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'productos_public_read') then
    execute 'create policy "productos_public_read" on storage.objects for select to public using (bucket_id = ''productos'')';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'productos_auth_write') then
    execute 'create policy "productos_auth_write" on storage.objects for insert to authenticated with check (bucket_id = ''productos'')';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'productos_auth_delete') then
    execute 'create policy "productos_auth_delete" on storage.objects for delete to authenticated using (bucket_id = ''productos'')';
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
-- MIGRACIÓN pedidos web
-- Correr en Supabase → SQL Editor (idempotente).
-- ═══════════════════════════════════════════════════════════

-- ── a. Columnas nuevas en ventas ──────────────────────────

alter table public.ventas
  add column if not exists estado text not null default 'pagada'
    check (estado in ('pendiente','pagada','cancelada'));

alter table public.ventas
  add column if not exists origen text not null default 'local'
    check (origen in ('local','web'));

alter table public.ventas add column if not exists contacto_nombre    text;
alter table public.ventas add column if not exists contacto_telefono  text;
alter table public.ventas add column if not exists direccion_envio    text;
alter table public.ventas add column if not exists pagada_at          timestamptz;
alter table public.ventas add column if not exists cancelada_at       timestamptz;

-- Sincronizar registros existentes: anuladas → canceladas
update public.ventas
set estado = 'cancelada', cancelada_at = created_at
where anulada = true and estado = 'pagada';

create index if not exists ventas_estado_fecha_idx on public.ventas (estado, fecha desc);

-- ── b. registrar_venta (drop y recrear para evitar ambigüedad de firma) ──

drop function if exists public.registrar_venta(jsonb, uuid, text, text);

create or replace function public.registrar_venta(
  p_items           jsonb,
  p_cliente_id      uuid    default null,
  p_medio_pago      text    default 'efectivo',
  p_notas           text    default null,
  p_estado          text    default 'pagada',
  p_direccion_envio text    default null
) returns uuid
language plpgsql security invoker as $$
declare
  v_venta_id uuid;
  v_item     jsonb;
  v_prod     public.productos%rowtype;
  v_cant     numeric;
  v_precio   numeric;
  v_total    numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;
  if p_estado not in ('pendiente','pagada','cancelada') then
    raise exception 'Estado inválido: %', p_estado;
  end if;

  insert into public.ventas (cliente_id, medio_pago, notas, estado, origen, direccion_envio, pagada_at)
  values (
    p_cliente_id,
    coalesce(p_medio_pago, 'efectivo'),
    p_notas,
    p_estado,
    'local',
    p_direccion_envio,
    case when p_estado = 'pagada' then now() else null end
  )
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.productos where id = (v_item->>'producto_id')::uuid for update;
    if not found then raise exception 'Producto inexistente'; end if;

    v_cant   := (v_item->>'cantidad')::numeric;
    v_precio := coalesce((v_item->>'precio_unitario')::numeric, v_prod.precio);
    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida para %', v_prod.nombre; end if;

    insert into public.venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_prod.id, v_prod.nombre, v_cant, v_precio, round(v_cant * v_precio, 2));

    update public.productos set stock = stock - v_cant where id = v_prod.id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_prod.id, 'venta', -v_cant, 'Venta', v_venta_id);

    v_total := v_total + round(v_cant * v_precio, 2);
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;
  return v_venta_id;
end $$;

-- ── c. crear_pedido_web ───────────────────────────────────
-- SECURITY DEFINER: la función corre con los permisos del owner (authenticated),
-- no del invocador (anon). Así anon no necesita INSERT en ninguna tabla.

drop function if exists public.crear_pedido_web(jsonb, text, text);

create or replace function public.crear_pedido_web(
  p_items     jsonb,
  p_nombre    text,
  p_telefono  text
) returns table(id uuid, numero bigint, total numeric)
language plpgsql security definer
set search_path = public
as $$
declare
  v_venta_id   uuid;
  v_numero     bigint;
  v_item       jsonb;
  v_prod       public.productos%rowtype;
  v_cant       numeric;
  v_total      numeric := 0;
  v_cliente_id uuid;
  v_tel_digits text;
begin
  -- Validaciones del nombre
  if p_nombre is null or length(trim(p_nombre)) < 2 or length(trim(p_nombre)) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  -- Validación del teléfono (8–20 dígitos)
  v_tel_digits := regexp_replace(coalesce(p_telefono,''), '\D', '', 'g');
  if length(v_tel_digits) < 8 or length(v_tel_digits) > 20 then
    raise exception 'El teléfono debe tener entre 8 y 20 dígitos';
  end if;

  -- Validación de ítems
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene ítems';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Máximo 50 ítems por pedido';
  end if;

  -- Intentar vincular cliente existente por teléfono
  select c.id into v_cliente_id
  from public.clientes c
  where regexp_replace(coalesce(c.telefono,''), '\D', '', 'g') = v_tel_digits
  limit 1;

  -- Crear la venta pendiente
  insert into public.ventas (cliente_id, medio_pago, estado, origen, contacto_nombre, contacto_telefono)
  values (v_cliente_id, 'efectivo', 'pendiente', 'web', trim(p_nombre), p_telefono)
  returning ventas.id, ventas.numero into v_venta_id, v_numero;

  -- Procesar ítems
  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod
    from public.productos
    where productos.id = (v_item->>'producto_id')::uuid and activo = true
    for update;

    if not found then
      raise exception 'Producto inexistente o inactivo';
    end if;

    v_cant := (v_item->>'cantidad')::numeric;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad inválida para %', v_prod.nombre;
    end if;

    -- Validar que sea múltiplo de venta_por (tolerancia de redondeo)
    if abs(mod(v_cant, v_prod.venta_por)) > 0.0001 then
      raise exception 'Cantidad de % debe ser múltiplo de %', v_prod.nombre, v_prod.venta_por;
    end if;

    -- El precio SIEMPRE viene de la base, nunca del cliente
    insert into public.venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
    values (v_venta_id, v_prod.id, v_prod.nombre, v_cant, v_prod.precio, round(v_cant * v_prod.precio, 2));

    update public.productos set stock = stock - v_cant where productos.id = v_prod.id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_prod.id, 'venta', -v_cant, 'Pedido web', v_venta_id);

    v_total := v_total + round(v_cant * v_prod.precio, 2);
  end loop;

  update public.ventas set total = v_total where ventas.id = v_venta_id;

  return query select v_venta_id, v_numero, v_total;
end $$;

-- Permitir que anon llame a crear_pedido_web (solo esta función, sin acceso directo a tablas)
grant execute on function public.crear_pedido_web(jsonb, text, text) to anon;

-- ── d. marcar_venta_pagada ────────────────────────────────

drop function if exists public.marcar_venta_pagada(uuid, text);

create or replace function public.marcar_venta_pagada(
  p_venta_id   uuid,
  p_medio_pago text default 'efectivo'
) returns void
language plpgsql security invoker as $$
begin
  update public.ventas
  set estado = 'pagada', medio_pago = coalesce(p_medio_pago, medio_pago), pagada_at = now()
  where id = p_venta_id and estado = 'pendiente';

  if not found then
    raise exception 'La venta no existe o no está en estado pendiente';
  end if;
end $$;

-- ── e. cancelar_venta (reemplaza y extiende anular_venta) ─

drop function if exists public.cancelar_venta(uuid);

create or replace function public.cancelar_venta(p_venta_id uuid) returns void
language plpgsql security invoker as $$
declare v_item record;
begin
  perform 1 from public.ventas
  where id = p_venta_id and estado in ('pendiente','pagada')
  for update;

  if not found then
    raise exception 'La venta no existe o ya está cancelada';
  end if;

  for v_item in
    select producto_id, cantidad from public.venta_items
    where venta_id = p_venta_id and producto_id is not null
  loop
    update public.productos set stock = stock + v_item.cantidad where id = v_item.producto_id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_item.producto_id, 'anulacion', v_item.cantidad, 'Cancelación de venta', p_venta_id);
  end loop;

  update public.ventas
  set estado = 'cancelada', anulada = true, cancelada_at = now()
  where id = p_venta_id;
end $$;

-- anular_venta queda como alias para no romper código existente
drop function if exists public.anular_venta(uuid);

create or replace function public.anular_venta(p_venta_id uuid) returns void
language plpgsql security invoker as $$
begin
  perform public.cancelar_venta(p_venta_id);
end $$;

-- Indicar a PostgREST que recargue el schema
notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════
-- FASE 1A — Mejoras de seguridad y funciones de agregación.
-- Seguro ejecutar ANTES del deploy de frontend.
-- ════════════════════════════════════════════════════════════════

-- 1. Fix timezone en precios_promo_vigentes (current_date usaba UTC)
create or replace view public.precios_promo_vigentes as
  select pi.producto_id, min(pi.precio_promo) as precio_promo
  from public.promocion_items pi
  join public.promociones p on p.id = pi.promocion_id
  where p.activa
    and p.fecha_inicio <= (now() AT TIME ZONE 'America/Argentina/Mendoza')::date
    and (p.fecha_fin is null or p.fecha_fin >= (now() AT TIME ZONE 'America/Argentina/Mendoza')::date)
  group by pi.producto_id;

-- Solo authenticated accede directamente a la vista de precios
revoke all on public.precios_promo_vigentes from anon, public;
grant select on public.precios_promo_vigentes to authenticated;

-- 2. Vista pública del catálogo: reemplaza acceso directo anon a productos.
--    Corre como owner (security_invoker=false, default PostgreSQL) → no expone
--    costo ni stock.
--    precio      = precio de lista (siempre el precio base del producto)
--    precio_promo = precio promocional vigente, NULL si no hay promo activa
create or replace view public.catalogo_publico as
  select
    p.id,
    p.nombre,
    p.categoria,
    p.categoria_id,
    p.unidad,
    p.venta_por,
    p.imagen_url,
    p.descripcion,
    p.destacado,
    p.precio              as precio,       -- precio de lista (siempre)
    ppv.precio_promo      as precio_promo  -- precio promo, NULL si no hay
  from public.productos p
  left join public.precios_promo_vigentes ppv on ppv.producto_id = p.id
  where p.activo = true;

-- Acceso público a la vista del catálogo (anon y authenticated)
revoke all on public.catalogo_publico from anon, public;
grant select on public.catalogo_publico to anon, authenticated;

-- 3. Trigger: sincroniza productos.categoria cuando la categoría cambia de nombre o se borra
create or replace function public.sync_categoria_nombre()
returns trigger language plpgsql security invoker as $$
begin
  if TG_OP = 'UPDATE' and OLD.nombre is distinct from NEW.nombre then
    update public.productos set categoria = NEW.nombre where categoria = OLD.nombre;
  elsif TG_OP = 'DELETE' then
    update public.productos set categoria = null where categoria_id = OLD.id;
    return OLD;
  end if;
  return NEW;
end $$;

drop trigger if exists sync_categoria_nombre_trg on public.categorias;
create trigger sync_categoria_nombre_trg
  after update or delete on public.categorias
  for each row execute function public.sync_categoria_nombre();

-- 4. Snapshot histórico del costo unitario en venta_items
alter table public.venta_items add column if not exists costo_unitario numeric(12,2);

-- 5. Drop y recrear registrar_venta con snapshot de costo_unitario
drop function if exists public.registrar_venta(jsonb, uuid, text, text, text, text);

create or replace function public.registrar_venta(
  p_items           jsonb,
  p_cliente_id      uuid    default null,
  p_medio_pago      text    default 'efectivo',
  p_notas           text    default null,
  p_estado          text    default 'pagada',
  p_direccion_envio text    default null
) returns uuid
language plpgsql security invoker as $$
declare
  v_venta_id uuid;
  v_item     jsonb;
  v_prod     public.productos%rowtype;
  v_cant     numeric;
  v_precio   numeric;
  v_total    numeric := 0;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene ítems';
  end if;
  if p_estado not in ('pendiente','pagada','cancelada') then
    raise exception 'Estado inválido: %', p_estado;
  end if;

  insert into public.ventas (cliente_id, medio_pago, notas, estado, origen, direccion_envio, pagada_at)
  values (
    p_cliente_id,
    coalesce(p_medio_pago, 'efectivo'),
    p_notas,
    p_estado,
    'local',
    p_direccion_envio,
    case when p_estado = 'pagada' then now() else null end
  )
  returning id into v_venta_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.productos where id = (v_item->>'producto_id')::uuid for update;
    if not found then raise exception 'Producto inexistente'; end if;

    v_cant   := (v_item->>'cantidad')::numeric;
    v_precio := coalesce((v_item->>'precio_unitario')::numeric, v_prod.precio);
    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida para %', v_prod.nombre; end if;

    insert into public.venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
    values (v_venta_id, v_prod.id, v_prod.nombre, v_cant, v_precio, v_prod.costo, round(v_cant * v_precio, 2));

    update public.productos set stock = stock - v_cant where id = v_prod.id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_prod.id, 'venta', -v_cant, 'Venta', v_venta_id);

    v_total := v_total + round(v_cant * v_precio, 2);
  end loop;

  update public.ventas set total = v_total where id = v_venta_id;
  return v_venta_id;
end $$;

-- 6. Drop y recrear crear_pedido_web con precio promocional y snapshot de costo_unitario
drop function if exists public.crear_pedido_web(jsonb, text, text);

create or replace function public.crear_pedido_web(
  p_items     jsonb,
  p_nombre    text,
  p_telefono  text
) returns table(id uuid, numero bigint, total numeric)
language plpgsql security definer
set search_path = public
as $$
declare
  v_venta_id   uuid;
  v_numero     bigint;
  v_item       jsonb;
  v_prod       public.productos%rowtype;
  v_cant       numeric;
  v_precio     numeric;
  v_total      numeric := 0;
  v_cliente_id uuid;
  v_tel_digits text;
begin
  if p_nombre is null or length(trim(p_nombre)) < 2 or length(trim(p_nombre)) > 80 then
    raise exception 'El nombre debe tener entre 2 y 80 caracteres';
  end if;

  v_tel_digits := regexp_replace(coalesce(p_telefono,''), '\D', '', 'g');
  if length(v_tel_digits) < 8 or length(v_tel_digits) > 20 then
    raise exception 'El teléfono debe tener entre 8 y 20 dígitos';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene ítems';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Máximo 50 ítems por pedido';
  end if;

  select c.id into v_cliente_id
  from public.clientes c
  where regexp_replace(coalesce(c.telefono,''), '\D', '', 'g') = v_tel_digits
  limit 1;

  insert into public.ventas (cliente_id, medio_pago, estado, origen, contacto_nombre, contacto_telefono)
  values (v_cliente_id, 'efectivo', 'pendiente', 'web', trim(p_nombre), p_telefono)
  returning ventas.id, ventas.numero into v_venta_id, v_numero;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod
    from public.productos
    where productos.id = (v_item->>'producto_id')::uuid and activo = true
    for update;

    if not found then
      raise exception 'Producto inexistente o inactivo';
    end if;

    v_cant := (v_item->>'cantidad')::numeric;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad inválida para %', v_prod.nombre;
    end if;

    if abs(mod(v_cant, v_prod.venta_por)) > 0.0001 then
      raise exception 'Cantidad de % debe ser múltiplo de %', v_prod.nombre, v_prod.venta_por;
    end if;

    -- Precio efectivo: usa promo si existe, sino precio de lista
    select coalesce(min(ppv.precio_promo), v_prod.precio) into v_precio
    from public.precios_promo_vigentes ppv
    where ppv.producto_id = v_prod.id;
    if v_precio is null then v_precio := v_prod.precio; end if;

    insert into public.venta_items (venta_id, producto_id, nombre, cantidad, precio_unitario, costo_unitario, subtotal)
    values (v_venta_id, v_prod.id, v_prod.nombre, v_cant, v_precio, v_prod.costo, round(v_cant * v_precio, 2));

    update public.productos set stock = stock - v_cant where productos.id = v_prod.id;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, motivo, venta_id)
    values (v_prod.id, 'venta', -v_cant, 'Pedido web', v_venta_id);

    v_total := v_total + round(v_cant * v_precio, 2);
  end loop;

  update public.ventas set total = v_total where ventas.id = v_venta_id;
  return query select v_venta_id, v_numero, v_total;
end $$;

grant execute on function public.crear_pedido_web(jsonb, text, text) to anon;

-- 7. Funciones de agregación (security invoker, solo authenticated)

drop function if exists public.resumen_ventas(timestamptz, timestamptz);
create or replace function public.resumen_ventas(
  desde timestamptz,
  hasta timestamptz
) returns table(
  total_vendido   numeric,
  cant_pagadas    bigint,
  cant_pendientes bigint,
  cant_canceladas bigint,
  ticket_promedio numeric
)
language sql security invoker stable as $$
  select
    coalesce(sum(total) filter (where estado = 'pagada'), 0),
    count(*) filter (where estado = 'pagada'),
    count(*) filter (where estado = 'pendiente'),
    count(*) filter (where estado = 'cancelada'),
    case when count(*) filter (where estado = 'pagada') > 0
      then sum(total) filter (where estado = 'pagada') / count(*) filter (where estado = 'pagada')
      else 0
    end
  from public.ventas
  where fecha >= desde and fecha <= hasta;
$$;
revoke all on function public.resumen_ventas(timestamptz, timestamptz) from public, anon;
grant execute on function public.resumen_ventas(timestamptz, timestamptz) to authenticated;

drop function if exists public.ventas_por_dia(timestamptz, timestamptz);
create or replace function public.ventas_por_dia(
  desde timestamptz,
  hasta timestamptz
) returns table(fecha date, monto numeric)
language sql security invoker stable as $$
  select
    gs::date as fecha,
    coalesce(sum(v.total), 0) as monto
  from generate_series(
    (desde AT TIME ZONE 'America/Argentina/Mendoza')::date,
    (hasta AT TIME ZONE 'America/Argentina/Mendoza')::date,
    '1 day'::interval
  ) gs
  left join public.ventas v
    on (v.fecha AT TIME ZONE 'America/Argentina/Mendoza')::date = gs::date
    and v.estado = 'pagada'
    and v.fecha >= desde and v.fecha <= hasta
  group by gs::date
  order by gs::date;
$$;
revoke all on function public.ventas_por_dia(timestamptz, timestamptz) from public, anon;
grant execute on function public.ventas_por_dia(timestamptz, timestamptz) to authenticated;

drop function if exists public.top_productos(timestamptz, timestamptz, int);
create or replace function public.top_productos(
  desde  timestamptz,
  hasta  timestamptz,
  limite int default 10
) returns table(nombre text, unidad text, cantidad numeric, total numeric)
language sql security invoker stable as $$
  select
    vi.nombre,
    p.unidad,
    sum(vi.cantidad)  as cantidad,
    sum(vi.subtotal)  as total
  from public.venta_items vi
  join public.ventas v on v.id = vi.venta_id
  left join public.productos p on p.id = vi.producto_id
  where v.estado = 'pagada'
    and v.fecha >= desde and v.fecha <= hasta
  group by vi.nombre, p.unidad
  order by sum(vi.subtotal) desc
  limit limite;
$$;
revoke all on function public.top_productos(timestamptz, timestamptz, int) from public, anon;
grant execute on function public.top_productos(timestamptz, timestamptz, int) to authenticated;

drop function if exists public.ventas_por_medio(timestamptz, timestamptz);
create or replace function public.ventas_por_medio(
  desde timestamptz,
  hasta timestamptz
) returns table(medio text, monto numeric, cant bigint)
language sql security invoker stable as $$
  select medio_pago as medio, sum(total) as monto, count(*) as cant
  from public.ventas
  where estado = 'pagada' and fecha >= desde and fecha <= hasta
  group by medio_pago
  order by sum(total) desc;
$$;
revoke all on function public.ventas_por_medio(timestamptz, timestamptz) from public, anon;
grant execute on function public.ventas_por_medio(timestamptz, timestamptz) to authenticated;

drop function if exists public.top_clientes(timestamptz, timestamptz, int);
create or replace function public.top_clientes(
  desde  timestamptz,
  hasta  timestamptz,
  limite int default 8
) returns table(nombre text, compras bigint, total numeric)
language sql security invoker stable as $$
  select
    coalesce(c.nombre, v.contacto_nombre) as nombre,
    count(*)       as compras,
    sum(v.total)   as total
  from public.ventas v
  left join public.clientes c on c.id = v.cliente_id
  where v.estado = 'pagada'
    and v.fecha >= desde and v.fecha <= hasta
    and (v.cliente_id is not null or v.contacto_nombre is not null)
  group by coalesce(c.nombre, v.contacto_nombre)
  order by sum(v.total) desc
  limit limite;
$$;
revoke all on function public.top_clientes(timestamptz, timestamptz, int) from public, anon;
grant execute on function public.top_clientes(timestamptz, timestamptz, int) to authenticated;

notify pgrst, 'reload schema';

-- ════════════════════════════════════════════════════════════════
-- FASE 1B — Ejecutar DESPUÉS del deploy de frontend.
-- Elimina la policy que expone costo/stock al rol anon.
-- El catálogo público ya usa catalogo_publico en lugar de productos.
-- ════════════════════════════════════════════════════════════════
-- drop policy if exists "public_read" on public.productos;
-- notify pgrst, 'reload schema';

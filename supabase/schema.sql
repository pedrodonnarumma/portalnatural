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

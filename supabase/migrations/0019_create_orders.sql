-- Fiko: tilaukset. Aiemmin checkout (Cart.jsx) vain simuloi maksun eikä tallentanut mitään -
-- tämä migraatio lisää oikeat orders/order_items-taulut niin että tilaukset pysyvät ja
-- ravintolan omistajan kojelauta (PartnerDashboard) voi vastaanottaa niitä.

create sequence if not exists public.order_number_seq;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('FIKO-' || lpad(nextval('public.order_number_seq')::text, 4, '0')),
  restaurant_id uuid not null references public.restaurants (id),
  customer_id uuid not null references public.customers (id),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  delivery_method text not null check (delivery_method in ('pickup', 'delivery')),
  delivery_name text not null,
  delivery_phone text not null,
  delivery_address text,
  delivery_notes text,
  subtotal_cents int not null,
  delivery_fee_cents int not null default 0,
  service_fee_cents int not null default 0,
  discount_cents int not null default 0,
  promo_code text,
  total_cents int not null,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.orders is 'Asiakkaan tekemät tilaukset. order_number generoidaan DB:ssä (order_number_seq) - ei enää satunnaisluku clientilla.';
comment on column public.orders.status is 'Elinkaari: pending -> confirmed -> preparing -> ready -> completed, tai cancelled miltä tahansa aikaisemmalta tilalta.';

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  price_cents int not null,
  quantity int not null check (quantity > 0)
);

comment on table public.order_items is 'Tilausrivit. name/price_cents ovat snapshotteja tilaushetkeltä - eivät seuraa menu_items-taulun myöhempiä muutoksia.';

create index if not exists orders_restaurant_id_created_at_idx on public.orders (restaurant_id, created_at desc);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Estää ravintolan omistajaa (tai mitä tahansa muuta kuin tilauksen tehnyttä asiakasta)
-- muuttamasta summia/toimitustietoja jälkikäteen - dashboardin pitäisi voida päivittää
-- vain tilan (status), ei mitään muuta.
create or replace function public.prevent_order_field_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from new.customer_id then
    new.order_number := old.order_number;
    new.restaurant_id := old.restaurant_id;
    new.customer_id := old.customer_id;
    new.delivery_method := old.delivery_method;
    new.delivery_name := old.delivery_name;
    new.delivery_phone := old.delivery_phone;
    new.delivery_address := old.delivery_address;
    new.delivery_notes := old.delivery_notes;
    new.subtotal_cents := old.subtotal_cents;
    new.delivery_fee_cents := old.delivery_fee_cents;
    new.service_fee_cents := old.service_fee_cents;
    new.discount_cents := old.discount_cents;
    new.promo_code := old.promo_code;
    new.total_cents := old.total_cents;
    new.estimated_ready_at := old.estimated_ready_at;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_prevent_field_tampering on public.orders;

create trigger orders_prevent_field_tampering
  before update on public.orders
  for each row
  execute function public.prevent_order_field_tampering();

-- Asiakas näkee ja luo vain omat tilauksensa.
create policy "Customers can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = customer_id);

create policy "Customers can create own orders"
  on public.orders
  for insert
  to authenticated
  with check (auth.uid() = customer_id);

-- Ravintolan omistaja näkee ja päivittää (triggerin rajaamana vain statuksen osalta)
-- oman ravintolansa tilaukset.
create policy "Owners can view own restaurant orders"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = orders.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

create policy "Owners can update own restaurant orders"
  on public.orders
  for update
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = orders.restaurant_id
        and ro.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = orders.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

-- order_items: näkyvyys/kirjoitus kytketään omistavan orders-rivin kautta (asiakas TAI
-- ravintolan omistaja).
create policy "Customers can view own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "Customers can insert own order items"
  on public.order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
  );

create policy "Owners can view own restaurant order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.restaurant_owners ro on ro.restaurant_id = o.restaurant_id
      where o.id = order_items.order_id
        and ro.owner_id = auth.uid()
    )
  );

grant select, insert on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant usage on public.order_number_seq to authenticated;

-- delivo: koko toimitusketju toimimaan demo-McDonald'silla.
--
--   1. Asiakas tilaa verkkosivulta (maksu on vielä simuloitu, tilaus on oikea).
--   2. Ravintola hyväksyy kumppanidashboardissa ja valitsee valmistusajan
--      (estimated_ready_at, migraatio 0026).
--   3. Kuljettaja-app tarjoaa hyväksytyn toimitustilauksen kuljettajille. Ensimmäinen
--      hyväksyjä saa keikan (courier_claim_order). Kuljettajan pitää olla
--      ravintolassa ruoan valmistuttua tai ajomatkan jälkeen, kumpi on myöhemmin
--      (courier_arrive_by - kuljettaja-app laskee sen ja tallentaa tähän).
--   4. Asiakas näkee kuljettajan sijainnin kartalla (courier_locations, reaaliaikainen).
--
-- Todisteet, ettei keikkaa voi kuitata pelkällä napin painalluksella:
--   - Nouto: ravintolan dashboardissa näkyvä noutokoodi, jonka henkilökunta antaa
--     kuljettajalle - tai ravintola merkitsee tilauksen itse luovutetuksi (completed).
--   - Toimitus: asiakkaan seurannassa näkyvä toimituskoodi TAI kuljettajan sijainti
--     enintään 250 m päässä toimitusosoitteesta.
--   - Aikaraja: toimitusta ei voi kuitata nopeammin kuin matka ravintolasta
--     asiakkaalle on mahdollista ajaa (45 km/h, vähintään 60 s noudosta).
--   - Kuljettajan sijainti tallentuu tilaukseen noudon ja toimituksen hetkellä.
--
-- Kuljettajan tilat (courier_status): assigned -> at_restaurant -> picked_up -> delivered.
-- Tilauksen oma status pysyy ravintolan elinkaarena: nouto nostaa sen vähintään
-- tilaan 'ready' (orderStatusLabel: "Matkalla") ja toimitus tilaan 'completed'.
--
-- Kuljettajatilit luodaan toistaiseksi käsin (kuten kumppanitkin) - itse
-- rekisteröityvä kuljettaja näkisi asiakkaiden osoitteita ilman hyväksyntää.

begin;

-- ---------------------------------------------------------------------------
-- 1. Demo-McDonald's oikeaksi ravintolaksi. Sama id ja samat tuotteet kuin
--    frontendin lib/demoRestaurants.js:ssä, jotta tilausrivit viittaavat oikeisiin
--    menu_items-riveihin ja dashboard näyttää saman ruokalistan.
-- ---------------------------------------------------------------------------

insert into public.restaurants (id, name, category, image_url, is_open, address, city, lat, lng, rating, pickup_estimate_minutes, free_delivery)
values (
  'b42ac227-e8eb-4086-8de4-f2d7043465fd',
  'McDonald''s',
  'Burgerit',
  'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127',
  true,
  'Kauppakatu 40, 70110 Kuopio',
  'Kuopio',
  62.8922,
  27.6795,
  4.1,
  15,
  false
)
on conflict (id) do nothing;

insert into public.menu_items (id, restaurant_id, name, description, price_cents, category, image_url, is_available)
values
  ('093e4d5c-ed7a-470e-94a9-a60d0582aa6e', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Maple BBQ & Bacon Double Quarter Pounder®', 'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.', 1265, 'Burgerit', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca81f3ee-affb-11f1-984a-fe269514dbf4_fi3180.png?w=960', true),
  ('7855b43a-a6ff-46d3-8b76-a893596ff4ba', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Maple BBQ & Bacon Double Quarter Pounder® -ateria', 'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.', 1900, 'Ateriat', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca830c16-affb-11f1-984a-fe269514dbf4_fi3181.png?w=960', true),
  ('fe0d6b72-9b01-4f62-b3c0-da29e8bcf3f9', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Maple BBQ & Bacon Quarter Pounder®', 'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.', 995, 'Burgerit', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca842538-affb-11f1-984a-fe269514dbf4_fi3177.png?w=960', true),
  ('92c062c0-3b1e-4247-874b-a4c4315a0d1b', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Maple BBQ & Bacon Quarter Pounder® -ateria', 'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.', 1495, 'Ateriat', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca855516-affb-11f1-984a-fe269514dbf4_fi3178.png?w=960', true),
  ('deeb5773-8aeb-43b9-bf92-a35b964a0887', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Big Arch®', 'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta.', 1380, 'Burgerit', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca871676-affb-11f1-984a-fe269514dbf4_fi3183.png?w=960', true),
  ('33caa326-c30b-4436-a5c0-4e1715acd15d', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Big Arch® -ateria', 'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta. Ateriaan kuuluu ranskalaiset ja juoma.', 1915, 'Ateriat', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca8931a4-affb-11f1-984a-fe269514dbf4_fi3184.png?w=960', true),
  ('3bbf839a-4d73-4753-8ddf-1825edbee865', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Double Big Tasty® Bacon', 'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia.', 1380, 'Burgerit', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c33cf9c-63c2-11f1-8c5c-724a2a819d31_fi6069.png?w=960', true),
  ('35155c6f-72f3-4ed0-9a33-47aa2ce9b528', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Double Big Tasty® Bacon -ateria', 'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia. Ateriaan kuuluu ranskalaiset ja juoma.', 1915, 'Ateriat', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c4aadb6-63c2-11f1-aa97-724a2a819d31_fi2800.png?w=960', true),
  ('c59181de-b136-44dd-b92c-f819069e4122', 'b42ac227-e8eb-4086-8de4-f2d7043465fd', 'Double Quarter Pounder® with Cheese', 'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, cheddarsulatejuustoa, tuoretta sipulia, suolakurkkua ja ketsuppia.', 1120, 'Burgerit', 'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c5436d8-63c2-11f1-aa97-724a2a819d31_fi8011.png?w=960', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Kuljettajat. Rivi luodaan käsin hyväksytylle kuljettajalle (id = auth.users.id).
-- ---------------------------------------------------------------------------

create table if not exists public.couriers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  phone text,
  vehicle text not null default 'bike' check (vehicle in ('bike', 'ebike', 'scooter', 'car')),
  created_at timestamptz not null default now()
);

comment on table public.couriers is 'Hyväksytyt kuljettajat. Rivin luo delivo (ei itserekisteröintiä).';

alter table public.couriers enable row level security;

drop policy if exists "Couriers can view own courier row" on public.couriers;
create policy "Couriers can view own courier row"
  on public.couriers
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Couriers can update own courier row" on public.couriers;
create policy "Couriers can update own courier row"
  on public.couriers
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select on public.couriers to authenticated;
grant update (name, phone, vehicle) on public.couriers to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Tilausten kuljetustiedot. Clientilla ei ole näihin kirjoitusoikeutta:
--    ne muuttuvat vain alla olevien funktioiden kautta.
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists courier_id uuid references public.couriers (id) on delete set null,
  add column if not exists courier_status text check (courier_status in ('assigned', 'at_restaurant', 'picked_up', 'delivered')),
  add column if not exists courier_assigned_at timestamptz,
  add column if not exists courier_arrive_by timestamptz,
  add column if not exists courier_fee_cents int,
  add column if not exists delivery_eta timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists picked_up_lat double precision,
  add column if not exists picked_up_lng double precision,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivered_lat double precision,
  add column if not exists delivered_lng double precision,
  add column if not exists delivery_proof text check (delivery_proof in ('code', 'location'));

comment on column public.orders.courier_arrive_by is 'Milloin kuljettajan pitää olla ravintolassa: ruoan valmistuminen tai ajomatkan pituus, kumpi myöhemmin.';
comment on column public.orders.delivery_eta is 'Kuljettajan arvio toimitusajasta - asiakkaan seuranta näyttää tämän kun kuljettaja on löytynyt.';
comment on column public.orders.delivery_proof is 'Toimituksen todiste: asiakkaan toimituskoodi (code) tai kuljettajan sijainti osoitteessa (location).';

create index if not exists orders_courier_id_idx on public.orders (courier_id);
create index if not exists orders_waiting_for_courier_idx
  on public.orders (created_at)
  where courier_id is null and delivery_method = 'delivery';

-- Uusi tilaus ei voi tulla clientilta valmiiksi "kuljetettuna": kuljetuskentät
-- tyhjätään aina lisättäessä (insert-oikeus on taulutasoinen, 0019).
create or replace function public.reset_order_courier_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.courier_id := null;
  new.courier_status := null;
  new.courier_assigned_at := null;
  new.courier_arrive_by := null;
  new.courier_fee_cents := null;
  new.delivery_eta := null;
  new.picked_up_at := null;
  new.picked_up_lat := null;
  new.picked_up_lng := null;
  new.delivered_at := null;
  new.delivered_lat := null;
  new.delivered_lng := null;
  new.delivery_proof := null;
  return new;
end;
$$;

drop trigger if exists orders_reset_courier_fields on public.orders;
create trigger orders_reset_courier_fields
  before insert on public.orders
  for each row
  execute function public.reset_order_courier_fields();

-- Kuljettaja näkee keikkaa odottavat toimitustilaukset (ravintola on hyväksynyt,
-- ei vielä kuljettajaa, korkeintaan 3 h vanhat) sekä omat keikkansa.
drop policy if exists "Couriers can view open and own delivery orders" on public.orders;
create policy "Couriers can view open and own delivery orders"
  on public.orders
  for select
  to authenticated
  using (
    exists (select 1 from public.couriers c where c.id = auth.uid())
    and delivery_method = 'delivery'
    and (
      courier_id = auth.uid()
      or (
        courier_id is null
        and status in ('confirmed', 'preparing', 'ready')
        and created_at > now() - interval '3 hours'
      )
    )
  );

drop policy if exists "Couriers can view own order items" on public.order_items;
create policy "Couriers can view own order items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.courier_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Todistekoodit omassa taulussaan, johon clientilla ei ole suoraa pääsyä:
--    ravintola saa noutokoodin ja asiakas toimituskoodin vain funktioiden kautta,
--    eikä kuljettaja näe kumpaakaan.
-- ---------------------------------------------------------------------------

create table if not exists public.order_codes (
  order_id uuid primary key references public.orders (id) on delete cascade,
  pickup_code text not null,
  delivery_code text not null
);

alter table public.order_codes enable row level security;
-- Ei politiikkoja eikä oikeuksia: luku ja tarkistus vain alla olevilla funktioilla.

create or replace function public.random_order_code()
returns text
language sql
volatile
as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
$$;

create or replace function public.create_order_codes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.order_codes (order_id, pickup_code, delivery_code)
  values (new.id, public.random_order_code(), public.random_order_code())
  on conflict (order_id) do nothing;
  return new;
end;
$$;

drop trigger if exists orders_create_codes on public.orders;
create trigger orders_create_codes
  after insert on public.orders
  for each row
  execute function public.create_order_codes();

-- Koodit myös jo olemassa oleville tilauksille.
insert into public.order_codes (order_id, pickup_code, delivery_code)
select id, public.random_order_code(), public.random_order_code()
from public.orders
on conflict (order_id) do nothing;

-- Ravintolan omistaja: noutokoodi, jonka henkilökunta antaa kuljettajalle.
create or replace function public.order_pickup_code(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.pickup_code
  from public.order_codes c
  join public.orders o on o.id = c.order_id
  join public.restaurant_owners ro on ro.restaurant_id = o.restaurant_id
  where c.order_id = p_order_id
    and ro.owner_id = auth.uid();
$$;

-- Asiakas: toimituskoodi, jonka hän kertoo kuljettajalle ovella.
create or replace function public.order_delivery_code(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.delivery_code
  from public.order_codes c
  join public.orders o on o.id = c.order_id
  where c.order_id = p_order_id
    and o.customer_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 5. Kuljettajan sijainti (yksi rivi per kuljettaja, päivittyy liikkuessa).
-- ---------------------------------------------------------------------------

create table if not exists public.courier_locations (
  courier_id uuid primary key references public.couriers (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.courier_locations enable row level security;

drop policy if exists "Couriers can view own location" on public.courier_locations;
create policy "Couriers can view own location"
  on public.courier_locations
  for select
  to authenticated
  using (auth.uid() = courier_id);

drop policy if exists "Couriers can insert own location" on public.courier_locations;
create policy "Couriers can insert own location"
  on public.courier_locations
  for insert
  to authenticated
  with check (auth.uid() = courier_id);

drop policy if exists "Couriers can update own location" on public.courier_locations;
create policy "Couriers can update own location"
  on public.courier_locations
  for update
  to authenticated
  using (auth.uid() = courier_id)
  with check (auth.uid() = courier_id);

-- Asiakas näkee oman käynnissä olevan tilauksensa kuljettajan sijainnin.
drop policy if exists "Customers can view their courier's location" on public.courier_locations;
create policy "Customers can view their courier's location"
  on public.courier_locations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.courier_id = courier_locations.courier_id
        and o.customer_id = auth.uid()
        and o.courier_status in ('assigned', 'at_restaurant', 'picked_up')
    )
  );

-- Ravintola näkee ravintolaan tulossa olevan kuljettajan sijainnin.
drop policy if exists "Owners can view couriers coming to their restaurant" on public.courier_locations;
create policy "Owners can view couriers coming to their restaurant"
  on public.courier_locations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.restaurant_owners ro on ro.restaurant_id = o.restaurant_id
      where o.courier_id = courier_locations.courier_id
        and ro.owner_id = auth.uid()
        and o.courier_status in ('assigned', 'at_restaurant')
    )
  );

grant select, insert, update on public.courier_locations to authenticated;

-- Asiakkaan kartta päivittyy reaaliajassa (orders on jo julkaisussa, 0024).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courier_locations'
  ) then
    alter publication supabase_realtime add table public.courier_locations;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Kuljettajan toiminnot. Kaikki muutokset kulkevat näiden kautta: ne
--    tarkistavat että käyttäjä on kuljettaja, keikka on hänen ja todiste pätee.
--    Virheet palautetaan lyhyinä koodeina, jotka kuljettaja-app suomentaa.
-- ---------------------------------------------------------------------------

create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Keikan hyväksyminen. Atominen: vain yksi kuljettaja voi saada saman tilauksen.
create or replace function public.courier_claim_order(
  p_order_id uuid,
  p_arrive_by timestamptz,
  p_delivery_eta timestamptz,
  p_fee_cents int
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;

  if exists (
    select 1 from public.orders
    where courier_id = auth.uid()
      and courier_status in ('assigned', 'at_restaurant', 'picked_up')
  ) then
    raise exception 'courier_busy';
  end if;

  update public.orders
  set courier_id = auth.uid(),
      courier_status = 'assigned',
      courier_assigned_at = now(),
      courier_arrive_by = greatest(coalesce(p_arrive_by, now()), now()),
      delivery_eta = p_delivery_eta,
      courier_fee_cents = least(greatest(coalesce(p_fee_cents, 0), 0), 5000)
  where id = p_order_id
    and courier_id is null
    and delivery_method = 'delivery'
    and status in ('confirmed', 'preparing', 'ready')
  returning * into v_order;

  if v_order.id is null then
    raise exception 'order_not_available';
  end if;

  return v_order;
end;
$$;

-- Kuljettaja on ravintolassa (tiedoksi ravintolalle ja asiakkaalle).
create or replace function public.courier_arrived_at_restaurant(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  update public.orders
  set courier_status = 'at_restaurant'
  where id = p_order_id
    and courier_id = auth.uid()
    and courier_status = 'assigned'
    and status <> 'cancelled'
  returning * into v_order;

  if v_order.id is null then
    raise exception 'invalid_state';
  end if;

  return v_order;
end;
$$;

-- Nouto: todisteena ravintolan noutokoodi, tai ravintola on jo itse merkinnyt
-- tilauksen luovutetuksi (status completed).
create or replace function public.courier_pick_up_order(p_order_id uuid, p_code text, p_delivery_eta timestamptz)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_code text;
  v_lat double precision;
  v_lng double precision;
begin
  select * into v_order from public.orders where id = p_order_id and courier_id = auth.uid() for update;
  if v_order.id is null then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'order_cancelled';
  end if;
  if v_order.courier_status not in ('assigned', 'at_restaurant') then
    raise exception 'invalid_state';
  end if;

  select pickup_code into v_code from public.order_codes where order_id = p_order_id;
  if v_order.status <> 'completed' and (p_code is null or v_code is null or trim(p_code) <> v_code) then
    raise exception 'wrong_pickup_code';
  end if;

  select lat, lng into v_lat, v_lng from public.courier_locations where courier_id = auth.uid();

  update public.orders
  set courier_status = 'picked_up',
      picked_up_at = now(),
      picked_up_lat = v_lat,
      picked_up_lng = v_lng,
      status = case when status in ('confirmed', 'preparing') then 'ready' else status end,
      delivery_eta = coalesce(p_delivery_eta, delivery_eta)
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Toimitus: todisteena asiakkaan toimituskoodi TAI tuore sijainti (alle 3 min
-- vanha) enintään 250 m päässä toimitusosoitteesta. Lisäksi aikaraja: matka
-- ravintolasta asiakkaalle ei voi taittua nopeammin kuin 45 km/h (vähintään 60 s).
create or replace function public.courier_deliver_order(p_order_id uuid, p_code text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_restaurant public.restaurants;
  v_code text;
  v_loc public.courier_locations;
  v_min_seconds int := 60;
  v_proof text;
begin
  select * into v_order from public.orders where id = p_order_id and courier_id = auth.uid() for update;
  if v_order.id is null then
    raise exception 'order_not_found';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'order_cancelled';
  end if;
  if v_order.courier_status <> 'picked_up' then
    raise exception 'invalid_state';
  end if;

  select * into v_restaurant from public.restaurants where id = v_order.restaurant_id;
  if v_restaurant.lat is not null and v_order.delivery_lat is not null then
    v_min_seconds := greatest(
      60,
      ceil(public.distance_km(v_restaurant.lat::double precision, v_restaurant.lng::double precision, v_order.delivery_lat, v_order.delivery_lng) / 45.0 * 3600)::int
    );
  end if;
  if now() < v_order.picked_up_at + make_interval(secs => v_min_seconds) then
    raise exception 'too_early:%', ceil(extract(epoch from (v_order.picked_up_at + make_interval(secs => v_min_seconds) - now())))::int;
  end if;

  select delivery_code into v_code from public.order_codes where order_id = p_order_id;
  select * into v_loc from public.courier_locations where courier_id = auth.uid();

  if p_code is not null and v_code is not null and trim(p_code) = v_code then
    v_proof := 'code';
  elsif v_loc.courier_id is not null
    and v_loc.updated_at > now() - interval '3 minutes'
    and v_order.delivery_lat is not null
    and public.distance_km(v_loc.lat, v_loc.lng, v_order.delivery_lat, v_order.delivery_lng) <= 0.25 then
    v_proof := 'location';
  elsif p_code is not null then
    raise exception 'wrong_delivery_code';
  else
    raise exception 'not_at_address';
  end if;

  update public.orders
  set courier_status = 'delivered',
      delivered_at = now(),
      delivered_lat = v_loc.lat,
      delivered_lng = v_loc.lng,
      delivery_proof = v_proof,
      status = 'completed'
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- Kuljettaja luopuu keikasta ennen noutoa: tilaus palaa muiden kuljettajien tarjolle.
create or replace function public.courier_release_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set courier_id = null,
      courier_status = null,
      courier_assigned_at = null,
      courier_arrive_by = null,
      courier_fee_cents = null,
      delivery_eta = null
  where id = p_order_id
    and courier_id = auth.uid()
    and courier_status in ('assigned', 'at_restaurant');
end;
$$;

revoke all on function public.order_pickup_code(uuid) from public, anon;
revoke all on function public.order_delivery_code(uuid) from public, anon;
revoke all on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) from public, anon;
revoke all on function public.courier_arrived_at_restaurant(uuid) from public, anon;
revoke all on function public.courier_pick_up_order(uuid, text, timestamptz) from public, anon;
revoke all on function public.courier_deliver_order(uuid, text) from public, anon;
revoke all on function public.courier_release_order(uuid) from public, anon;

grant execute on function public.order_pickup_code(uuid) to authenticated;
grant execute on function public.order_delivery_code(uuid) to authenticated;
grant execute on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) to authenticated;
grant execute on function public.courier_arrived_at_restaurant(uuid) to authenticated;
grant execute on function public.courier_pick_up_order(uuid, text, timestamptz) to authenticated;
grant execute on function public.courier_deliver_order(uuid, text) to authenticated;
grant execute on function public.courier_release_order(uuid) to authenticated;

commit;

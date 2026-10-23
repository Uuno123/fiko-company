-- delivo: kuljetushinnasta sovitaan kuljettajan kanssa (käyttäjän malli 22.10.2026).
--
-- Ennen: asiakas maksoi kiinteän 5,99 € kuljetusmaksun, ravintola hyväksyi
-- tilauksen ja palvelin tarjosi keikan lähimmälle kuljettajalle.
-- Nyt kotiinkuljetuksessa:
--   1. Asiakas maksaa kassalla. Kortilta VARATAAN ruoka + palvelumaksu + suurin
--      mahdollinen kuljetushinta (7,99 €), mitään ei vielä veloiteta (Stripe:
--      capture_method = manual, backend/src/settlement.js).
--   2. Tilaus on tilassa awaiting_courier: ravintola ei vielä näe sitä. Lähellä
--      olevat online-kuljettajat näkevät pyynnön (courier_bid_requests) ja
--      tarjoavat hinnan 1,99-7,99 € (courier_place_bid).
--   3. Asiakas hyväksyy jonkin tarjouksen (customer_accept_bid) - tai asettaa oman
--      hintansa (customer_set_delivery_offer), jonka kuljettaja voi hyväksyä:
--      kuljettajan tarjous asiakkaan hinnalla tai alle on sovittu heti.
--   4. Sopimus (agree_delivery_price): kuljettaja kiinnitetään keikalle, tilaus
--      siirtyy ravintolalle (pending) ja ravintolan hyväksyntäaika alkaa (0059: 90 s).
--   5. Kun ravintola hyväksyy, backend veloittaa varauksesta vain ruoan ja
--      sovitun kuljetushinnan. Peruttu tilaus vapauttaa varauksen. Kuljettajalle
--      kirjataan koko kuljetushinta (orders.courier_fee_cents).
--   6. Jos hinnasta ei sovita 10 minuutissa, tilaus perutaan (no_courier).
-- Noutotilaukset menevät suoraan ravintolalle kuten ennenkin.
-- Asetukset (hintahaarukka, aikaraja, kuljettajan osuus) dispatch_settings-taulussa.

begin;

-- ---------------------------------------------------------------------------
-- 1. Asetukset
-- ---------------------------------------------------------------------------

alter table public.dispatch_settings
  add column if not exists bid_min_cents int not null default 199,
  add column if not exists bid_max_cents int not null default 799,
  add column if not exists bidding_minutes int not null default 10,
  add column if not exists courier_share_percent int not null default 100;

comment on column public.dispatch_settings.bid_max_cents is
  'Suurin kuljetushinta. Pidä samana kuin frontend/src/lib/deliveryTime.js DELIVERY_BID ja backendin varaus.';

-- ---------------------------------------------------------------------------
-- 2. Tilauksen uusi tila ja tiedot
-- ---------------------------------------------------------------------------

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_courier', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'));

alter table public.orders
  add column if not exists placed_at timestamptz,
  add column if not exists bidding_expires_at timestamptz,
  add column if not exists customer_offer_cents int,
  add column if not exists delivery_price_cents int,
  add column if not exists payment_intent_id text,
  add column if not exists payment_status text not null default 'none'
    check (payment_status in ('none', 'authorized', 'captured', 'released', 'refunded', 'failed'));

comment on column public.orders.placed_at is 'Milloin tilaus lähti ravintolalle (kotiinkuljetuksessa vasta kun kuljetushinnasta on sovittu). Ravintolan hyväksyntäaika lasketaan tästä.';
comment on column public.orders.bidding_expires_at is 'Kuljetushinnan sopimisen aikaraja (awaiting_courier).';
comment on column public.orders.customer_offer_cents is 'Asiakkaan oma kuljetushintatarjous. Kuljettajan tarjous tällä hinnalla tai alle on sovittu heti.';
comment on column public.orders.delivery_price_cents is 'Sovittu kuljetushinta, jonka asiakas maksaa. Kuljettajalle courier_fee_cents (koko hinta).';
comment on column public.orders.payment_status is 'Kortin varaus/veloitus (backend/src/settlement.js): none = ei Stripe-maksua (testimaksu).';

create unique index if not exists orders_payment_intent_id_key on public.orders (payment_intent_id) where payment_intent_id is not null;
create index if not exists orders_awaiting_courier_idx on public.orders (bidding_expires_at) where status = 'awaiting_courier';

-- Vanhat tilaukset ovat jo lähteneet ravintolalle.
update public.orders set placed_at = created_at where placed_at is null and status <> 'awaiting_courier';

-- Asiakkaan lisäämä tilaus: kotiinkuljetus alkaa hinnan sopimisella, nouto menee
-- suoraan ravintolalle. Asiakas ei voi itse asettaa tilaa, hintaa eikä maksun tilaa.
create or replace function public.orders_start_delivery_bidding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
begin
  select * into s from public.dispatch_settings limit 1;
  new.delivery_price_cents := null;
  new.payment_status := case when new.payment_intent_id is null then 'none' else 'authorized' end;

  if new.delivery_method = 'delivery' then
    new.status := 'awaiting_courier';
    new.placed_at := null;
    new.bidding_expires_at := now() + make_interval(mins => coalesce(s.bidding_minutes, 10));
    -- Kuljetus lisätään summaan vasta, kun hinnasta on sovittu.
    new.delivery_fee_cents := 0;
    new.total_cents := greatest(new.subtotal_cents + coalesce(new.service_fee_cents, 0) - coalesce(new.discount_cents, 0), 0);
    if new.customer_offer_cents is not null then
      new.customer_offer_cents := least(
        greatest(new.customer_offer_cents, coalesce(s.bid_min_cents, 199)),
        coalesce(s.bid_max_cents, 799)
      );
    end if;
  else
    new.status := 'pending';
    new.placed_at := now();
    new.bidding_expires_at := null;
    new.customer_offer_cents := null;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_start_delivery_bidding on public.orders;
create trigger orders_start_delivery_bidding
  before insert on public.orders
  for each row
  execute function public.orders_start_delivery_bidding();

-- Kenttäsuoja (0019/0025/0026) uusiksi: luotetut tietokantafunktiot (security
-- definer, esim. hinnan sopiminen) ja backend (service_role) saavat muuttaa
-- summia. Ennen suoja palautti myös niiden muutokset, jos kutsuja ei ollut
-- tilauksen asiakas. Ravintola ei voi koskea uusiin hinta- ja maksukenttiin.
create or replace function public.prevent_order_field_tampering()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if auth.uid() is distinct from new.customer_id then
    new.order_number := old.order_number;
    new.restaurant_id := old.restaurant_id;
    new.customer_id := old.customer_id;
    new.delivery_method := old.delivery_method;
    new.delivery_name := old.delivery_name;
    new.delivery_phone := old.delivery_phone;
    new.delivery_address := old.delivery_address;
    new.delivery_lat := old.delivery_lat;
    new.delivery_lng := old.delivery_lng;
    new.delivery_notes := old.delivery_notes;
    new.subtotal_cents := old.subtotal_cents;
    new.delivery_fee_cents := old.delivery_fee_cents;
    new.service_fee_cents := old.service_fee_cents;
    new.discount_cents := old.discount_cents;
    new.promo_code := old.promo_code;
    new.total_cents := old.total_cents;
    new.created_at := old.created_at;
    new.placed_at := old.placed_at;
    new.bidding_expires_at := old.bidding_expires_at;
    new.customer_offer_cents := old.customer_offer_cents;
    new.delivery_price_cents := old.delivery_price_cents;
    new.payment_intent_id := old.payment_intent_id;
    new.payment_status := old.payment_status;
  end if;
  -- Hinnan sopimisvaiheeseen ei palata eikä sitä ohiteta käsin.
  if (new.status = 'awaiting_courier') <> (old.status = 'awaiting_courier') and new.status <> 'cancelled' then
    raise exception 'invalid_status';
  end if;
  return new;
end;
$$;

-- Ravintola näkee (ja voi päivittää) tilauksen vasta, kun se on lähtenyt
-- ravintolalle. Tilausrivien käytäntö katsoo orders-taulun kautta, joten
-- rivitkin piiloutuvat.
drop policy if exists "Owners can view own restaurant orders" on public.orders;
create policy "Owners can view own restaurant orders"
  on public.orders
  for select
  to authenticated
  using (
    orders.placed_at is not null
    and exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = orders.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can update own restaurant orders" on public.orders;
create policy "Owners can update own restaurant orders"
  on public.orders
  for update
  to authenticated
  using (
    orders.placed_at is not null
    and exists (
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

-- Ravintolan hyväksyntäaika (0028, 0059: 90 s) lasketaan ravintolalle lähtemisestä.
create or replace function public.cancel_stale_pending_orders()
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set status = 'cancelled'
  where status = 'pending'
    and coalesce(placed_at, created_at) < now() - interval '3 minutes';
$$;

-- ---------------------------------------------------------------------------
-- 3. Kuljettajien hintatarjoukset
-- ---------------------------------------------------------------------------

create table if not exists public.delivery_bids (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  -- Asiakkaalle näytettävä nimi ("Janne K.") ja kulkuneuvo tarjoushetkeltä:
  -- asiakas ei näe couriers-taulua.
  courier_name text not null default '',
  vehicle text,
  price_cents int not null check (price_cents > 0),
  distance_km double precision,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, courier_id)
);

comment on table public.delivery_bids is 'Kuljettajien kuljetushintatarjoukset (courier_place_bid). rejected = asiakas valitsi toisen, withdrawn = tarjous tai tilaus peruttiin.';

create index if not exists delivery_bids_order_offered_idx on public.delivery_bids (order_id) where status = 'offered';
create index if not exists delivery_bids_courier_offered_idx on public.delivery_bids (courier_id) where status = 'offered';

alter table public.delivery_bids enable row level security;

drop policy if exists "Couriers can view own bids" on public.delivery_bids;
create policy "Couriers can view own bids"
  on public.delivery_bids
  for select
  to authenticated
  using (courier_id = auth.uid());

drop policy if exists "Customers can view bids on own orders" on public.delivery_bids;
create policy "Customers can view bids on own orders"
  on public.delivery_bids
  for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = delivery_bids.order_id
        and o.customer_id = auth.uid()
    )
  );

-- Vain luku: tarjoukset tehdään ja hyväksytään alla olevilla funktioilla.
grant select on public.delivery_bids to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'delivery_bids'
  ) then
    alter publication supabase_realtime add table public.delivery_bids;
  end if;
end;
$$;

-- Onko kuljettajalla keikka kesken (ei voi tarjota eikä tulla valituksi).
create or replace function public.courier_has_active_job(p_courier_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where courier_id = p_courier_id
      and courier_status in ('assigned', 'at_restaurant', 'picked_up')
  );
$$;

-- Sopimus: kuljettaja keikalle, tilaus ravintolalle, kuljetus summaan.
-- Ravintolan valmistusaika (tilaushetken arvio) alkaa nyt, koska ravintola saa
-- tilauksen vasta nyt. Toimitusarvio samalla mallilla kuin deliveryTime.js
-- (1,35 x linnuntie, kulkuneuvon nopeus, luovutukset 2 + 2 min).
create or replace function public.agree_delivery_price(p_bid_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_bid public.delivery_bids;
  v_order public.orders;
  v_rest public.restaurants;
  v_ready timestamptz;
  v_ride_min int := 12;
  v_speed double precision;
begin
  select * into s from public.dispatch_settings limit 1;
  select * into v_bid from public.delivery_bids where id = p_bid_id;
  select * into v_order from public.orders where id = v_bid.order_id;
  select * into v_rest from public.restaurants where id = v_order.restaurant_id;

  v_ready := now() + greatest(coalesce(v_order.estimated_ready_at - v_order.created_at, interval '15 minutes'), interval '5 minutes');
  if v_rest.lat is not null and v_rest.lng is not null and v_order.delivery_lat is not null and v_order.delivery_lng is not null then
    v_speed := case v_bid.vehicle when 'ebike' then 20 when 'scooter' then 25 when 'car' then 28 else 15 end;
    v_ride_min := greatest(3, round(
      public.distance_km(v_rest.lat::double precision, v_rest.lng::double precision, v_order.delivery_lat::double precision, v_order.delivery_lng::double precision)
      * 1.35 / v_speed * 60
    )::int);
  end if;

  update public.orders
  set status = 'pending',
      placed_at = now(),
      bidding_expires_at = null,
      delivery_price_cents = v_bid.price_cents,
      delivery_fee_cents = v_bid.price_cents,
      total_cents = subtotal_cents + coalesce(service_fee_cents, 0) - coalesce(discount_cents, 0) + v_bid.price_cents,
      estimated_ready_at = v_ready,
      courier_id = v_bid.courier_id,
      courier_status = 'assigned',
      courier_assigned_at = now(),
      courier_arrive_by = v_ready,
      delivery_eta = v_ready + make_interval(mins => 4 + v_ride_min),
      courier_fee_cents = round(v_bid.price_cents * coalesce(s.courier_share_percent, 100) / 100.0)::int,
      dispatch_next_at = null
  where id = v_order.id;

  update public.delivery_bids set status = 'accepted', updated_at = now() where id = p_bid_id;
  update public.delivery_bids set status = 'rejected', updated_at = now()
  where order_id = v_order.id and id <> p_bid_id and status = 'offered';
  -- Kuljettaja on nyt varattu: muut tarjoukset ja keikkatarjoukset pois.
  update public.delivery_bids set status = 'withdrawn', updated_at = now()
  where courier_id = v_bid.courier_id and id <> p_bid_id and status = 'offered';
  update public.courier_offers set status = 'withdrawn', responded_at = now()
  where courier_id = v_bid.courier_id and status = 'pending';
  update public.couriers set missed_offers = 0 where id = v_bid.courier_id;
end;
$$;

-- Kuljettajalle näytettävät avoimet pyynnöt: online, tuore sijainti, ei keikkaa
-- kesken, ravintola enintään radius_km päässä. Tarkka osoite näkyy vasta
-- sopimuksen jälkeen (tilauksen RLS) - pyynnössä vain postinumero ja alue sekä
-- noin kilometrin tarkkuudella pyöristetty piste matkan arviointiin.
create or replace function public.courier_bid_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_online boolean;
  v_loc public.courier_locations;
begin
  select * into s from public.dispatch_settings limit 1;
  select online into v_online from public.couriers where id = auth.uid();
  if v_online is null then
    raise exception 'not_a_courier';
  end if;
  if not v_online or public.courier_has_active_job(auth.uid()) then
    return '[]'::jsonb;
  end if;
  select * into v_loc from public.courier_locations
  where courier_id = auth.uid() and updated_at > now() - make_interval(secs => s.location_max_age_seconds);
  if v_loc.courier_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(req order by (req ->> 'distance_km')::double precision)
    from (
      select jsonb_build_object(
        'order_id', o.id,
        'restaurant_name', r.name,
        'restaurant_address', r.address,
        'restaurant_lat', r.lat::double precision,
        'restaurant_lng', r.lng::double precision,
        'dropoff_area', nullif(trim(split_part(coalesce(o.delivery_address, ''), ',', 2)), ''),
        'dropoff_lat', round(o.delivery_lat::numeric, 2)::double precision,
        'dropoff_lng', round(o.delivery_lng::numeric, 2)::double precision,
        'distance_km', public.distance_km(v_loc.lat, v_loc.lng, r.lat::double precision, r.lng::double precision),
        'delivery_km', case when o.delivery_lat is not null and o.delivery_lng is not null
          then public.distance_km(r.lat::double precision, r.lng::double precision, o.delivery_lat::double precision, o.delivery_lng::double precision) end,
        'food_cents', o.subtotal_cents,
        'item_count', (select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id),
        'customer_offer_cents', o.customer_offer_cents,
        'estimated_ready_at', o.estimated_ready_at,
        'created_at', o.created_at,
        'bidding_expires_at', o.bidding_expires_at,
        'my_bid_cents', b.price_cents,
        'my_bid_status', b.status
      ) as req
      from public.orders o
      join public.restaurants r on r.id = o.restaurant_id
      left join public.delivery_bids b on b.order_id = o.id and b.courier_id = auth.uid()
      where o.status = 'awaiting_courier'
        and o.bidding_expires_at > now()
        and r.lat is not null
        and r.lng is not null
        and public.distance_km(v_loc.lat, v_loc.lng, r.lat::double precision, r.lng::double precision) <= s.radius_km
        and coalesce(b.status, 'offered') in ('offered', 'withdrawn')
    ) requests
  ), '[]'::jsonb);
end;
$$;

-- Kuljettajan hintatarjous (tai sen muutos), sentin tarkkuudella haarukassa. Yksi avoin tarjous kerrallaan. Jos asiakas on jo
-- tarjonnut vähintään tämän hinnan, kauppa syntyy heti.
create or replace function public.courier_place_bid(p_order_id uuid, p_price_cents int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_courier public.couriers;
  v_order public.orders;
  v_rest public.restaurants;
  v_loc public.courier_locations;
  v_bid public.delivery_bids;
  v_price int;
  v_km double precision;
  v_name text;
begin
  select * into s from public.dispatch_settings limit 1;
  select * into v_courier from public.couriers where id = auth.uid();
  if v_courier.id is null then
    raise exception 'not_a_courier';
  end if;
  if not v_courier.online then
    raise exception 'courier_offline';
  end if;
  if public.courier_has_active_job(auth.uid()) then
    raise exception 'courier_busy';
  end if;
  if exists (
    select 1 from public.delivery_bids
    where courier_id = auth.uid() and status = 'offered' and order_id <> p_order_id
  ) then
    raise exception 'bid_pending_elsewhere';
  end if;

  v_price := p_price_cents;
  if v_price is null or v_price < s.bid_min_cents or v_price > s.bid_max_cents then
    raise exception 'invalid_price';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null or v_order.status <> 'awaiting_courier' or v_order.bidding_expires_at <= now() then
    raise exception 'order_not_available';
  end if;
  if exists (
    select 1 from public.delivery_bids
    where order_id = p_order_id and courier_id = auth.uid() and status in ('rejected', 'accepted')
  ) then
    raise exception 'order_not_available';
  end if;

  select * into v_rest from public.restaurants where id = v_order.restaurant_id;
  select * into v_loc from public.courier_locations
  where courier_id = auth.uid() and updated_at > now() - make_interval(secs => s.location_max_age_seconds);
  if v_loc.courier_id is null then
    raise exception 'no_location';
  end if;
  v_km := public.distance_km(v_loc.lat, v_loc.lng, v_rest.lat::double precision, v_rest.lng::double precision);
  if v_km is null or v_km > s.radius_km then
    raise exception 'order_not_available';
  end if;

  -- "Janne Korhonen" -> "Janne K."
  v_name := trim(split_part(trim(v_courier.name), ' ', 1)
    || case when split_part(trim(v_courier.name), ' ', 2) <> '' then ' ' || left(split_part(trim(v_courier.name), ' ', 2), 1) || '.' else '' end);

  insert into public.delivery_bids (order_id, courier_id, courier_name, vehicle, price_cents, distance_km)
  values (p_order_id, auth.uid(), coalesce(nullif(v_name, ''), 'Kuljettaja'), v_courier.vehicle, v_price, v_km)
  on conflict (order_id, courier_id) do update
    set price_cents = excluded.price_cents,
        distance_km = excluded.distance_km,
        vehicle = excluded.vehicle,
        courier_name = excluded.courier_name,
        status = 'offered',
        updated_at = now()
  returning * into v_bid;

  update public.couriers set missed_offers = 0 where id = auth.uid();

  if v_order.customer_offer_cents is not null and v_price <= v_order.customer_offer_cents then
    perform public.agree_delivery_price(v_bid.id);
    return jsonb_build_object('status', 'accepted', 'bid_id', v_bid.id, 'price_cents', v_price);
  end if;
  return jsonb_build_object('status', 'offered', 'bid_id', v_bid.id, 'price_cents', v_price);
end;
$$;

create or replace function public.courier_withdraw_bid(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.delivery_bids
  set status = 'withdrawn', updated_at = now()
  where order_id = p_order_id and courier_id = auth.uid() and status = 'offered';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Asiakkaan toiminnot
-- ---------------------------------------------------------------------------

-- Asiakkaan oma hinta (null poistaa). Kuljettajat näkevät sen pyynnössä.
create or replace function public.customer_set_delivery_offer(p_order_id uuid, p_price_cents int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_order public.orders;
  v_price int;
begin
  select * into s from public.dispatch_settings limit 1;
  select * into v_order from public.orders where id = p_order_id and customer_id = auth.uid() for update;
  if v_order.id is null then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'awaiting_courier' or v_order.bidding_expires_at <= now() then
    raise exception 'bidding_closed';
  end if;
  if p_price_cents is not null then
    v_price := p_price_cents;
    if v_price < s.bid_min_cents or v_price > s.bid_max_cents then
      raise exception 'invalid_price';
    end if;
  end if;
  update public.orders set customer_offer_cents = v_price where id = p_order_id;
  return jsonb_build_object('customer_offer_cents', v_price);
end;
$$;

create or replace function public.customer_accept_bid(p_bid_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.delivery_bids;
  v_order public.orders;
begin
  select * into v_bid from public.delivery_bids where id = p_bid_id;
  select * into v_order from public.orders
  where id = v_bid.order_id and customer_id = auth.uid()
  for update;
  if v_order.id is null then
    raise exception 'order_not_found';
  end if;
  -- 5 s armonaika verkon viiveelle.
  if v_order.status <> 'awaiting_courier' or v_order.bidding_expires_at < now() - interval '5 seconds' then
    raise exception 'bidding_closed';
  end if;
  select * into v_bid from public.delivery_bids where id = p_bid_id for update;
  if v_bid.status <> 'offered' then
    raise exception 'bid_not_available';
  end if;
  -- Varautuessaan (sopimus tai keikka) kuljettajan muut tarjoukset poistuvat,
  -- joten tämä on vain varmistus samanaikaisille kutsuille.
  if public.courier_has_active_job(v_bid.courier_id) then
    raise exception 'courier_unavailable';
  end if;

  perform public.agree_delivery_price(p_bid_id);
  return jsonb_build_object('status', 'accepted', 'price_cents', v_bid.price_cents);
end;
$$;

-- Asiakas voi perua tilauksen, kunnes hinnasta on sovittu (ravintola ei ole
-- vielä aloittanut). Kortin varaus vapautuu (backend).
create or replace function public.customer_cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = 'cancelled', cancel_reason = 'customer_cancelled'
  where id = p_order_id
    and customer_id = auth.uid()
    and status = 'awaiting_courier';
  if not found then
    raise exception 'cannot_cancel';
  end if;
end;
$$;

-- Peruttu tilaus (asiakas, aikaraja) sulkee avoimet tarjoukset.
create or replace function public.orders_close_bidding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.delivery_bids
  set status = 'withdrawn', updated_at = now()
  where order_id = new.id and status = 'offered';
  return null;
end;
$$;

drop trigger if exists orders_close_bidding on public.orders;
create trigger orders_close_bidding
  after update of status on public.orders
  for each row
  when (old.status = 'awaiting_courier' and new.status = 'cancelled')
  execute function public.orders_close_bidding();

-- Aikaraja: hinnasta ei sovittu -> peruttu (sama syy kuin kun kuljettajaa ei löydy).
create or replace function public.expire_delivery_bidding()
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set status = 'cancelled', cancel_reason = 'no_courier'
  where status = 'awaiting_courier'
    and bidding_expires_at < now() - interval '5 seconds';
$$;

-- ---------------------------------------------------------------------------
-- 5. Keikan uudelleenjako (kuljettaja luopui): sama sovittu hinta
-- ---------------------------------------------------------------------------

-- Kuten 0046, mutta jos kuljetushinnasta on sovittu, uusi kuljettaja saa siitä
-- saman osuuden (sovelluksen laskemaa palkkiota ei käytetä).
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
  v_offer public.courier_offers;
  v_share int;
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;

  if public.courier_has_active_job(auth.uid()) then
    raise exception 'courier_busy';
  end if;

  select * into v_offer
  from public.courier_offers
  where order_id = p_order_id
    and courier_id = auth.uid()
    and status = 'pending'
    and expires_at > now() - interval '5 seconds'
  for update;
  if v_offer.id is null then
    raise exception 'order_not_available';
  end if;

  select courier_share_percent into v_share from public.dispatch_settings limit 1;

  update public.orders
  set courier_id = auth.uid(),
      courier_status = 'assigned',
      courier_assigned_at = now(),
      courier_arrive_by = greatest(coalesce(p_arrive_by, now()), now()),
      delivery_eta = p_delivery_eta,
      courier_fee_cents = case
        when delivery_price_cents is not null then round(delivery_price_cents * coalesce(v_share, 100) / 100.0)::int
        else least(greatest(coalesce(p_fee_cents, 0), 0), 5000)
      end,
      dispatch_next_at = null
  where id = p_order_id
    and courier_id is null
    and delivery_method = 'delivery'
    and status in ('confirmed', 'preparing', 'ready')
  returning * into v_order;

  if v_order.id is null then
    update public.courier_offers set status = 'withdrawn', responded_at = now() where id = v_offer.id;
    raise exception 'order_not_available';
  end if;

  update public.courier_offers set status = 'accepted', responded_at = now() where id = v_offer.id;
  update public.couriers set missed_offers = 0 where id = auth.uid();
  -- Varattu kuljettaja ei voi enää tulla valituksi muihin tilauksiin.
  update public.delivery_bids set status = 'withdrawn', updated_at = now()
  where courier_id = auth.uid() and status = 'offered';

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Maksujen kirjanpito (backend kirjoittaa service_role-avaimella)
-- ---------------------------------------------------------------------------

-- Yksi rivi veloitettua tilausta kohden: kuinka paljon ravintolalle, kuljettajalle
-- ja delivolle. Tilitykset ravintoloille ja kuljettajille tehdään tämän pohjalta.
create table if not exists public.order_settlements (
  order_id uuid primary key references public.orders (id) on delete cascade,
  payment_intent_id text not null,
  captured_cents int not null,
  restaurant_cents int not null,
  courier_cents int not null,
  delivo_cents int not null,
  refunded_cents int not null default 0,
  captured_at timestamptz not null default now(),
  restaurant_paid_at timestamptz,
  courier_paid_at timestamptz
);

comment on table public.order_settlements is 'Veloitettujen tilausten jako: ravintola (koko ruokasumma), kuljettaja (koko kuljetushinta), delivo (palvelumaksu - alennukset). Vain backend ja Studio.';

alter table public.order_settlements enable row level security;
-- Ei käytäntöjä: asiakkaat, ravintolat ja kuljettajat eivät lue tätä suoraan.

-- ---------------------------------------------------------------------------
-- 7. Oikeudet ja ajastin
-- ---------------------------------------------------------------------------

revoke all on function public.orders_start_delivery_bidding() from public, anon, authenticated;
revoke all on function public.agree_delivery_price(uuid) from public, anon, authenticated;
revoke all on function public.orders_close_bidding() from public, anon, authenticated;
revoke all on function public.expire_delivery_bidding() from public, anon, authenticated;
revoke all on function public.courier_has_active_job(uuid) from public, anon, authenticated;

revoke all on function public.courier_bid_requests() from public, anon;
revoke all on function public.courier_place_bid(uuid, int) from public, anon;
revoke all on function public.courier_withdraw_bid(uuid) from public, anon;
revoke all on function public.customer_set_delivery_offer(uuid, int) from public, anon;
revoke all on function public.customer_accept_bid(uuid) from public, anon;
revoke all on function public.customer_cancel_order(uuid) from public, anon;
revoke all on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) from public, anon;

grant execute on function public.courier_bid_requests() to authenticated;
grant execute on function public.courier_place_bid(uuid, int) to authenticated;
grant execute on function public.courier_withdraw_bid(uuid) to authenticated;
grant execute on function public.customer_set_delivery_offer(uuid, int) to authenticated;
grant execute on function public.customer_accept_bid(uuid) to authenticated;
grant execute on function public.customer_cancel_order(uuid) to authenticated;
grant execute on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) to authenticated;

-- Aikaraja tarkistetaan 15 s välein (pg_cron 1.5+), vanhemmalla kerran minuutissa.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'delivery-bidding-expiry') then
    perform cron.unschedule('delivery-bidding-expiry');
  end if;
  begin
    perform cron.schedule('delivery-bidding-expiry', '15 seconds', 'select public.expire_delivery_bidding();');
  exception when others then
    perform cron.schedule('delivery-bidding-expiry', '* * * * *', 'select public.expire_delivery_bidding();');
  end;
end;
$$;

commit;

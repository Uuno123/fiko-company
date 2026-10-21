-- delivo: keikkojen jako kuljettajille palvelimella (dispatch).
--
-- Ennen: jokainen online-kuljettaja näki kaikki vapaat tilaukset ja nopein sai
-- keikan - 1 km päässä oleva saattoi viedä sen 200 m päässä olevalta.
-- Nyt palvelin tarjoaa keikan yhdelle kuljettajalle kerrallaan:
--   1. Lähin vapaa kuljettaja enintään 8 km päässä ravintolasta saa tarjouksen
--      (60 s aikaa vastata). Tasatilanteessa kauemmin odottanut ensin.
--   2. Jos hän hylkää tai ei vastaa, tarjous menee seuraavaksi lähimmälle jne.
--   3. Kun kaikki säteellä olevat on kysytty, alkaa uusi kierros, jossa kysytään
--      taas lähimmästä alkaen (myös hylänneiltä). Kierros kestää vähintään 3 min,
--      jotta juuri online-tilaan tulevat kuljettajat ehtivät mukaan.
--   4. Jos kahdella kierroksella kukaan ei ota keikkaa, tilaus perutaan
--      (cancel_reason = 'no_courier'); asiakas ja ravintola näkevät syyn.
-- Lisäksi:
--   - Haku alkaa noin 15 min ennen kuin ruoka on valmis (kuitenkin aikaisintaan
--     kun ravintola hyväksyy), jottei kuljettaja odota ravintolassa turhaan.
--   - Kuljettaja, joka jättää kaksi tarjousta peräkkäin vastaamatta, siirretään
--     offline-tilaan - ei hukata muiden asiakkaiden minuutteja.
--   - Kuljettaja näkee vain itselleen tarjotut ja omat keikkansa (ennen kaikki
--     avoimet tilaukset osoitteineen).
--   - Kuljettaja-app kertoo palvelimelle online-tilan ja sijainnin
--     (courier_set_online, courier_heartbeat); sijainti yli 2 min vanha = ei tarjouksia.
--   - Asetukset (säde, vastausaika, kierrokset...) taulussa dispatch_settings,
--     joten niitä voi säätää SQL:llä ilman koodimuutosta.
-- Ajastin (pg_cron) tarkistaa 15 s välein vanhentuneet tarjoukset ja alkavat haut.

begin;

-- ---------------------------------------------------------------------------
-- 1. Asetukset
-- ---------------------------------------------------------------------------

create table if not exists public.dispatch_settings (
  id boolean primary key default true check (id),
  radius_km double precision not null default 8,
  offer_seconds int not null default 60,
  rounds int not null default 2,
  round_min_seconds int not null default 180,
  lead_minutes int not null default 15,
  location_max_age_seconds int not null default 120,
  max_missed_offers int not null default 2
);

comment on table public.dispatch_settings is
  'Keikkajaon asetukset (yksi rivi). Esim. säde: update dispatch_settings set radius_km = 10;';

insert into public.dispatch_settings (id) values (true) on conflict (id) do nothing;

alter table public.dispatch_settings enable row level security;
-- Ei politiikkoja: luetaan vain alla olevissa funktioissa.

-- ---------------------------------------------------------------------------
-- 2. Kuljettajan online-tila, tilauksen hakutila ja peruutuksen syy
-- ---------------------------------------------------------------------------

alter table public.couriers
  add column if not exists online boolean not null default false,
  add column if not exists online_since timestamptz,
  add column if not exists missed_offers int not null default 0;

comment on column public.couriers.online is 'Kuljettaja on online-tilassa ja voi saada tarjouksia (courier_set_online).';
comment on column public.couriers.missed_offers is 'Peräkkäin vastaamatta jääneet tarjoukset; rajan ylittyessä kuljettaja siirretään offline-tilaan.';

alter table public.orders
  add column if not exists dispatch_round int not null default 0,
  add column if not exists dispatch_round_started_at timestamptz,
  add column if not exists dispatch_next_at timestamptz,
  add column if not exists cancel_reason text;

comment on column public.orders.dispatch_round is 'Kuljettajahaun kierros: 0 = haku ei ole alkanut, 1-2 = käynnissä.';
comment on column public.orders.dispatch_next_at is 'Milloin kuljettajahaku alkaa / jatkuu (ajastin käsittelee tilaukset, joilla tämä on mennyt).';
comment on column public.orders.cancel_reason is 'Peruutuksen syy, jos järjestelmä perui: no_courier = kuljettajaa ei löytynyt.';

-- Asiakkaan lisäämä tilaus ei voi tulla valmiiksi haetuksi tai perutuksi.
create or replace function public.reset_order_dispatch_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.dispatch_round := 0;
  new.dispatch_round_started_at := null;
  new.dispatch_next_at := null;
  new.cancel_reason := null;
  return new;
end;
$$;

drop trigger if exists orders_reset_dispatch_fields on public.orders;
create trigger orders_reset_dispatch_fields
  before insert on public.orders
  for each row
  execute function public.reset_order_dispatch_fields();

-- ---------------------------------------------------------------------------
-- 3. Tarjoukset
-- ---------------------------------------------------------------------------

create table if not exists public.courier_offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  round int not null,
  distance_km double precision,
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  responded_at timestamptz,
  unique (order_id, courier_id, round)
);

comment on table public.courier_offers is 'Keikkatarjoukset: yksi kuljettaja kerrallaan, lähimmästä alkaen (dispatch_order).';

create index if not exists courier_offers_courier_pending_idx on public.courier_offers (courier_id) where status = 'pending';
create index if not exists courier_offers_order_idx on public.courier_offers (order_id, round);

alter table public.courier_offers enable row level security;

drop policy if exists "Couriers can view own offers" on public.courier_offers;
create policy "Couriers can view own offers"
  on public.courier_offers
  for select
  to authenticated
  using (courier_id = auth.uid());

grant select on public.courier_offers to authenticated;

-- Uusi tarjous näkyy kuljettaja-appissa heti.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courier_offers'
  ) then
    alter publication supabase_realtime add table public.courier_offers;
  end if;
end;
$$;

-- Kuljettaja näkee vain itselleen tarjotut ja omat keikkansa.
drop policy if exists "Couriers can view open and own delivery orders" on public.orders;
drop policy if exists "Couriers can view offered and own delivery orders" on public.orders;
create policy "Couriers can view offered and own delivery orders"
  on public.orders
  for select
  to authenticated
  using (
    courier_id = auth.uid()
    or exists (
      select 1 from public.courier_offers co
      where co.order_id = orders.id
        and co.courier_id = auth.uid()
        and co.status = 'pending'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Keikkajako
-- ---------------------------------------------------------------------------

-- Tarjoaa tilauksen seuraavalle kuljettajalle, aloittaa uuden kierroksen tai perii
-- tilauksen. Kutsutaan ajastimesta, hylkäyksestä, ravintolan hyväksynnästä ja
-- kuljettajan luopumisesta. Ei tee mitään, jos tilauksella on jo voimassa oleva
-- tarjous tai kuljettaja.
create or replace function public.dispatch_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_order public.orders;
  v_rest public.restaurants;
  v_round int;
  v_round_started timestamptz;
  v_courier uuid;
  v_km double precision;
begin
  select * into s from public.dispatch_settings limit 1;
  if s.id is null then
    return;
  end if;
  select * into v_order from public.orders where id = p_order_id for update skip locked;
  if v_order.id is null then
    return;
  end if;
  if v_order.courier_id is not null
    or v_order.delivery_method <> 'delivery'
    or v_order.status not in ('confirmed', 'preparing', 'ready') then
    return;
  end if;
  if exists (
    select 1 from public.courier_offers
    where order_id = p_order_id and status = 'pending' and expires_at > now()
  ) then
    return;
  end if;

  select * into v_rest from public.restaurants where id = v_order.restaurant_id;
  if v_rest.lat is null or v_rest.lng is null then
    return;
  end if;

  v_round := greatest(v_order.dispatch_round, 1);
  v_round_started := coalesce(v_order.dispatch_round_started_at, now());
  if v_order.dispatch_round = 0 then
    update public.orders set dispatch_round = 1, dispatch_round_started_at = v_round_started where id = p_order_id;
  end if;

  loop
    -- Lähin vapaa kuljettaja, jolta ei ole vielä kysytty tällä kierroksella.
    select c.id, public.distance_km(l.lat, l.lng, v_rest.lat::double precision, v_rest.lng::double precision)
      into v_courier, v_km
    from public.couriers c
    join public.courier_locations l on l.courier_id = c.id
    where c.online
      and l.updated_at > now() - make_interval(secs => s.location_max_age_seconds)
      and public.distance_km(l.lat, l.lng, v_rest.lat::double precision, v_rest.lng::double precision) <= s.radius_km
      and not exists (
        select 1 from public.orders o
        where o.courier_id = c.id and o.courier_status in ('assigned', 'at_restaurant', 'picked_up')
      )
      and not exists (
        select 1 from public.courier_offers co
        where co.courier_id = c.id and co.status = 'pending' and co.expires_at > now()
      )
      and not exists (
        select 1 from public.courier_offers co
        where co.order_id = p_order_id and co.courier_id = c.id and co.round = v_round
      )
    order by 2 asc, c.online_since asc nulls last
    limit 1;

    if v_courier is not null then
      insert into public.courier_offers (order_id, courier_id, round, distance_km, expires_at)
      values (p_order_id, v_courier, v_round, v_km, now() + make_interval(secs => s.offer_seconds));
      return;
    end if;

    -- Kukaan ei ole juuri nyt kysymättä. Kierros jatkuu vähimmäisajan
    -- (ajastin yrittää uudelleen), sitten uusi kierros tai peruutus.
    if now() - v_round_started < make_interval(secs => s.round_min_seconds) then
      return;
    end if;

    if v_round < s.rounds then
      v_round := v_round + 1;
      v_round_started := now();
      update public.orders set dispatch_round = v_round, dispatch_round_started_at = v_round_started where id = p_order_id;
      -- Uusi kierros: kysytään heti lähimmältä (silmukka).
    else
      update public.orders
      set status = 'cancelled', cancel_reason = 'no_courier', dispatch_next_at = null
      where id = p_order_id and courier_id is null;
      return;
    end if;
  end loop;
end;
$$;

-- Vastaamatta jäänyt tarjous: lasketaan kuljettajalle ja siirrytään seuraavaan.
-- Palauttaa true, jos kuljettaja siirrettiin offline-tilaan.
create or replace function public.mark_offer_missed(p_offer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.courier_offers;
  v_limit int;
  v_offline boolean := false;
begin
  update public.courier_offers
  set status = 'expired', responded_at = now()
  where id = p_offer_id and status = 'pending'
  returning * into v_offer;
  if v_offer.id is null then
    return false;
  end if;

  select max_missed_offers into v_limit from public.dispatch_settings limit 1;
  update public.couriers
  set missed_offers = missed_offers + 1,
      online = case when missed_offers + 1 >= v_limit then false else online end,
      online_since = case when missed_offers + 1 >= v_limit then null else online_since end
  where id = v_offer.courier_id
  returning not online into v_offline;

  perform public.dispatch_order(v_offer.order_id);
  return coalesce(v_offline, false);
end;
$$;

-- Ajastin: vanhentuneet tarjoukset (sovellus ei vastannut) ja alkavat/jatkuvat haut.
create or replace function public.dispatch_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Tilaus peruttiin tai sai kuljettajan: avoimet tarjoukset pois ilman, että
  -- kuljettajalle kirjataan vastaamatta jäänyt tarjous.
  update public.courier_offers co
  set status = 'withdrawn', responded_at = now()
  from public.orders o
  where co.order_id = o.id
    and co.status = 'pending'
    and (o.courier_id is not null or o.status not in ('confirmed', 'preparing', 'ready'));

  -- 5 s armonaika: sovellus kuittaa itse vanhenemisen, jos se on auki.
  for v_id in
    select id from public.courier_offers
    where status = 'pending' and expires_at < now() - interval '5 seconds'
  loop
    perform public.mark_offer_missed(v_id);
  end loop;

  for v_id in
    select id from public.orders
    where delivery_method = 'delivery'
      and courier_id is null
      and status in ('confirmed', 'preparing', 'ready')
      and dispatch_next_at is not null
      and dispatch_next_at <= now()
      and created_at > now() - interval '6 hours'
  loop
    perform public.dispatch_order(v_id);
  end loop;
end;
$$;

-- Haun ajoitus: ravintolan hyväksyntä ja valmistusajan muutos ennen haun alkua
-- (alkaa lead_minutes ennen valmistumista), kuljettajan luopuminen (heti).
-- security definer: ravintolan päivitys ajaa tämän, eikä ravintolalla ole
-- lukuoikeutta dispatch_settings-tauluun (ilman tätä hyväksyntä epäonnistui).
create or replace function public.orders_schedule_dispatch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead int;
begin
  if new.delivery_method = 'delivery'
    and new.courier_id is null
    and new.status in ('confirmed', 'preparing', 'ready') then
    if old.courier_id is not null then
      new.dispatch_next_at := now();
    elsif new.dispatch_round = 0 then
      select lead_minutes into v_lead from public.dispatch_settings limit 1;
      new.dispatch_next_at := greatest(now(), coalesce(new.estimated_ready_at, now()) - make_interval(mins => coalesce(v_lead, 15)));
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_schedule_dispatch on public.orders;
create trigger orders_schedule_dispatch
  before update on public.orders
  for each row
  execute function public.orders_schedule_dispatch();

-- Ensimmäinen tarjous heti, kun haku saa alkaa (ei odoteta ajastinta).
create or replace function public.orders_dispatch_now()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.dispatch_order(new.id);
  return null;
end;
$$;

drop trigger if exists orders_dispatch_now on public.orders;
create trigger orders_dispatch_now
  after update of status, courier_id on public.orders
  for each row
  when (
    new.delivery_method = 'delivery'
    and new.courier_id is null
    and new.status in ('confirmed', 'preparing', 'ready')
    and new.dispatch_next_at is not null
    and new.dispatch_next_at <= now()
    and (old.status = 'pending' or old.courier_id is not null)
  )
  execute function public.orders_dispatch_now();

-- ---------------------------------------------------------------------------
-- 5. Kuljettaja-appin toiminnot
-- ---------------------------------------------------------------------------

-- Online/offline (liukukytkin). Online-tilaan mentäessä vastaamatta jääneiden
-- laskuri nollautuu. Offline-tilaan mentäessä avoin tarjous siirtyy seuraavalle.
create or replace function public.courier_set_online(
  p_online boolean,
  p_lat double precision default null,
  p_lng double precision default null,
  p_vehicle text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.courier_offers;
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;

  if p_lat is not null and p_lng is not null then
    insert into public.courier_locations (courier_id, lat, lng, updated_at)
    values (auth.uid(), p_lat, p_lng, now())
    on conflict (courier_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = excluded.updated_at;
  end if;

  update public.couriers
  set online = p_online,
      online_since = case when p_online then coalesce(online_since, now()) else null end,
      missed_offers = case when p_online then 0 else missed_offers end,
      vehicle = case when p_vehicle in ('bike', 'ebike', 'scooter', 'car') then p_vehicle else vehicle end
  where id = auth.uid();

  if not p_online then
    for v_offer in
      update public.courier_offers
      set status = 'withdrawn', responded_at = now()
      where courier_id = auth.uid() and status = 'pending'
      returning *
    loop
      perform public.dispatch_order(v_offer.order_id);
    end loop;
  end if;

  return jsonb_build_object('online', p_online);
end;
$$;

-- Säännöllinen sijainti online-tilassa (30 s välein). Palauttaa palvelimen
-- online-tilan: false, jos kuljettaja siirrettiin offline-tilaan vastaamatta
-- jääneiden tarjousten takia.
create or replace function public.courier_heartbeat(
  p_lat double precision default null,
  p_lng double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_online boolean;
  v_missed int;
begin
  select online, missed_offers into v_online, v_missed from public.couriers where id = auth.uid();
  if v_online is null then
    raise exception 'not_a_courier';
  end if;
  if p_lat is not null and p_lng is not null then
    insert into public.courier_locations (courier_id, lat, lng, updated_at)
    values (auth.uid(), p_lat, p_lng, now())
    on conflict (courier_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = excluded.updated_at;
  end if;
  return jsonb_build_object('online', v_online, 'missed_offers', v_missed);
end;
$$;

-- Tarjouksen hylkäys (tai sovelluksen havaitsema vanheneminen: p_timed_out).
-- Tarjous siirtyy heti seuraavaksi lähimmälle.
create or replace function public.courier_decline_offer(p_order_id uuid, p_timed_out boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.courier_offers;
  v_offline boolean := false;
begin
  select * into v_offer
  from public.courier_offers
  where order_id = p_order_id and courier_id = auth.uid() and status = 'pending'
  for update;

  if v_offer.id is not null then
    if p_timed_out then
      v_offline := public.mark_offer_missed(v_offer.id);
    else
      update public.courier_offers set status = 'declined', responded_at = now() where id = v_offer.id;
      -- Hylkääminen on vastaus: kuljettaja on puhelimen äärellä.
      update public.couriers set missed_offers = 0 where id = auth.uid();
      perform public.dispatch_order(p_order_id);
    end if;
  end if;

  return jsonb_build_object('online', not v_offline and coalesce((select online from public.couriers where id = auth.uid()), false));
end;
$$;

-- Keikan hyväksyminen vaatii nyt voimassa olevan tarjouksen (5 s armonaika
-- verkon viiveelle). Muuten sama kuin 0043.
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

  update public.orders
  set courier_id = auth.uid(),
      courier_status = 'assigned',
      courier_assigned_at = now(),
      courier_arrive_by = greatest(coalesce(p_arrive_by, now()), now()),
      delivery_eta = p_delivery_eta,
      courier_fee_cents = least(greatest(coalesce(p_fee_cents, 0), 0), 5000),
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

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Oikeudet ja ajastin
-- ---------------------------------------------------------------------------

revoke all on function public.dispatch_order(uuid) from public, anon, authenticated;
revoke all on function public.mark_offer_missed(uuid) from public, anon, authenticated;
revoke all on function public.dispatch_tick() from public, anon, authenticated;
revoke all on function public.orders_dispatch_now() from public, anon, authenticated;

revoke all on function public.courier_set_online(boolean, double precision, double precision, text) from public, anon;
revoke all on function public.courier_heartbeat(double precision, double precision) from public, anon;
revoke all on function public.courier_decline_offer(uuid, boolean) from public, anon;
revoke all on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) from public, anon;

grant execute on function public.courier_set_online(boolean, double precision, double precision, text) to authenticated;
grant execute on function public.courier_heartbeat(double precision, double precision) to authenticated;
grant execute on function public.courier_decline_offer(uuid, boolean) to authenticated;
grant execute on function public.courier_claim_order(uuid, timestamptz, timestamptz, int) to authenticated;

-- Jo hyväksytyt, kuljettajaa odottavat tilaukset mukaan hakuun.
update public.orders
set dispatch_next_at = now()
where delivery_method = 'delivery'
  and courier_id is null
  and status in ('confirmed', 'preparing', 'ready')
  and created_at > now() - interval '6 hours';

-- 15 s välein (pg_cron 1.5+); vanhemmalla versiolla kerran minuutissa.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'courier-dispatch-tick') then
    perform cron.unschedule('courier-dispatch-tick');
  end if;
  begin
    perform cron.schedule('courier-dispatch-tick', '15 seconds', 'select public.dispatch_tick();');
  exception when others then
    perform cron.schedule('courier-dispatch-tick', '* * * * *', 'select public.dispatch_tick();');
  end;
end;
$$;

commit;

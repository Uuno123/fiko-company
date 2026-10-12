-- delivo: toimitus todistetaan sijainnilla ja kuljettajan ajat seuraavat
-- ravintolan valmistusaikaa.
--
--   1. Asiakkaalla ei ole enää toimituskoodia. Ainoa koodi on ravintolan
--      noutokoodi, jonka henkilökunta antaa kuljettajalle (migraatio 0043).
--      Toimituksen todiste on kuljettajan tuore sijainti enintään 250 m päässä
--      toimitusosoitteesta, ja aikaraja pysyy: matka ravintolasta asiakkaalle ei
--      voi taittua nopeammin kuin 45 km/h (vähintään 60 s noudosta).
--      Virheissä on mukana etäisyys (not_at_address:metrit), jotta kuljettaja
--      tietää kuinka kaukana hän on.
--   2. Kuljettaja ei voi noutaa ruokaa ennen kuin se on valmis. Jos ravintola
--      lisää valmistusaikaa keikan hyväksymisen jälkeen (dashboardin +5/+10 min),
--      kuljettajan nouto- ja toimitusaika siirtyvät yhtä paljon - muuten asiakas
--      näkisi saapumisajan, joka on ennen ruoan valmistumista.

begin;

-- ---------------------------------------------------------------------------
-- 1. Toimituskoodi pois asiakkaalta
-- ---------------------------------------------------------------------------

drop function if exists public.order_delivery_code(uuid);

comment on column public.order_codes.delivery_code is 'Ei käytössä (migraatio 0044): toimitus todistetaan kuljettajan sijainnilla.';
comment on column public.orders.delivery_proof is 'Toimituksen todiste: kuljettajan sijainti osoitteessa (location). Vanhoissa tilauksissa myös asiakkaan toimituskoodi (code).';

-- Sama nimi ja parametrit kuin ennen, jotta vanhatkin kuljettaja-appin versiot
-- toimivat. p_code ei ole enää käytössä: 4-numeroinen koodi olisi myös arvattavissa
-- kokeilemalla, sijaintia ei.
create or replace function public.courier_deliver_order(p_order_id uuid, p_code text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_restaurant public.restaurants;
  v_loc public.courier_locations;
  v_min_seconds int := 60;
  v_meters int;
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

  -- Osoitteella ei ole sijaintia kartalla (verkkosivun kassa hakee sen nykyään
  -- aina ennen tilausta), joten toimitusta ei voi todistaa.
  if v_order.delivery_lat is null or v_order.delivery_lng is null then
    raise exception 'address_unknown';
  end if;

  select * into v_loc from public.courier_locations where courier_id = auth.uid();
  if v_loc.courier_id is null or v_loc.updated_at < now() - interval '3 minutes' then
    raise exception 'no_location';
  end if;

  v_meters := round(public.distance_km(v_loc.lat, v_loc.lng, v_order.delivery_lat, v_order.delivery_lng) * 1000)::int;
  if v_meters > 250 then
    raise exception 'not_at_address:%', v_meters;
  end if;

  update public.orders
  set courier_status = 'delivered',
      delivered_at = now(),
      delivered_lat = v_loc.lat,
      delivered_lng = v_loc.lng,
      delivery_proof = 'location',
      status = 'completed'
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.courier_deliver_order(uuid, text) from public, anon;
grant execute on function public.courier_deliver_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Kuljettajan ajat eivät ole ennen ruoan valmistumista
-- ---------------------------------------------------------------------------

-- Ennen noutoa: jos ruoka valmistuu kuljettajan suunnittelemaa noutoa myöhemmin,
-- nouto siirtyy valmistumisaikaan ja toimitusarvio yhtä paljon (ajomatka
-- asiakkaalle pysyy samana). Laukeaa, kun ravintola muuttaa valmistusaikaa ja kun
-- kuljettaja hyväksyy keikan (sovelluksen tieto valmistusajasta voi olla
-- hetken vanha). Aikaa ei aikaisteta: kuljettajan oma ajomatka voi olla se,
-- joka määrää noudon.
create or replace function public.keep_courier_schedule_after_ready_time()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_shift interval;
begin
  if new.courier_id is not null
    and new.courier_status in ('assigned', 'at_restaurant')
    and new.estimated_ready_at is not null
    and new.courier_arrive_by is not null
    and new.estimated_ready_at > new.courier_arrive_by then
    v_shift := new.estimated_ready_at - new.courier_arrive_by;
    new.courier_arrive_by := new.estimated_ready_at;
    new.delivery_eta := new.delivery_eta + v_shift;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_keep_courier_schedule on public.orders;
create trigger orders_keep_courier_schedule
  before update of estimated_ready_at, courier_arrive_by on public.orders
  for each row
  when (
    new.estimated_ready_at is distinct from old.estimated_ready_at
    or new.courier_arrive_by is distinct from old.courier_arrive_by
  )
  execute function public.keep_courier_schedule_after_ready_time();

-- Jo käynnissä olevat keikat samaan linjaan.
update public.orders
set courier_arrive_by = estimated_ready_at,
    delivery_eta = delivery_eta + (estimated_ready_at - courier_arrive_by)
where courier_status in ('assigned', 'at_restaurant')
  and estimated_ready_at > courier_arrive_by;

commit;

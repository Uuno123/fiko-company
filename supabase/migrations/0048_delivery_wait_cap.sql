-- delivo: toimituksen kuittauksen odotus noudosta enintään 5 min.
--
-- 0044: toimitusta ei voi kuitata nopeammin kuin matka ravintolasta asiakkaalle
-- on mahdollista ajaa (45 km/h, vähintään 60 s). Pitkällä matkalla odotus oli
-- yli 10 min, mikä teki testaamisesta hidasta. Nyt odotus on enintään
-- dispatch_settings.max_delivery_wait_seconds (oletus 300 s = 5 min); lyhyellä
-- matkalla se on edelleen matkan mukainen (vähintään 60 s). Sijaintitodiste
-- (alle 250 m osoitteesta) pysyy ennallaan.
-- Takaisin pelkkään matkan mukaiseen aikaan: update dispatch_settings set max_delivery_wait_seconds = 3600;

begin;

alter table public.dispatch_settings
  add column if not exists max_delivery_wait_seconds int not null default 300;

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
  v_max_wait int;
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
  select coalesce(max(max_delivery_wait_seconds), 300) into v_max_wait from public.dispatch_settings;
  v_min_seconds := least(v_min_seconds, greatest(v_max_wait, 60));
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

commit;

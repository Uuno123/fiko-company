-- delivo: kuljettaja-appin "Alueen kysyntä" oikeasta datasta (ennen kiinteä "Kiireinen").
--
-- Kysyntä lasketaan samalta alueelta, jolta kuljettaja saa keikkoja: ravintolat
-- dispatch_settings.radius_km (8 km) säteellä kuljettajan sijainnista (0046).
--   - tilaukset: toimitustilaukset viimeisen 30 min ajalta (ei perutut)
--   - odottavat: tilaukset, joille etsitään juuri nyt kuljettajaa
--   - kuljettajat: online-tilassa olevat, sijainti alle 2 min vanha
-- Taso = tilauksia per online-kuljettaja puolessa tunnissa (keikka vie noin puoli
-- tuntia, joten yli 1 tarkoittaa, että kuljettajia tarvitaan lisää):
--   quiet      Hiljaista            ei tilauksia
--   normal     Normaali             alle 1 tilaus / kuljettaja
--   busy       Kiireinen            1-2 tai jokin tilaus odottaa kuljettajaa
--   very_busy  Erittäin kiireinen   yli 2
-- Kuljettaja näkee vain lukumäärät, ei tilauksia tai osoitteita.

begin;

create or replace function public.courier_area_demand(p_lat double precision, p_lng double precision)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_radius double precision;
  v_orders int;
  v_waiting int;
  v_couriers int;
  v_ratio double precision;
  v_level text;
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;
  if p_lat is null or p_lng is null then
    return null;
  end if;

  select coalesce(max(radius_km), 8) into v_radius from public.dispatch_settings;

  select
    count(*) filter (where o.created_at > now() - interval '30 minutes'),
    count(*) filter (where o.courier_id is null and o.status in ('confirmed', 'preparing', 'ready'))
  into v_orders, v_waiting
  from public.orders o
  join public.restaurants r on r.id = o.restaurant_id
  where o.delivery_method = 'delivery'
    and o.status <> 'cancelled'
    and o.created_at > now() - interval '3 hours'
    and r.lat is not null
    and r.lng is not null
    and public.distance_km(p_lat, p_lng, r.lat::double precision, r.lng::double precision) <= v_radius;

  select count(*)
  into v_couriers
  from public.couriers c
  join public.courier_locations l on l.courier_id = c.id
  where c.online
    and l.updated_at > now() - interval '2 minutes'
    and public.distance_km(p_lat, p_lng, l.lat, l.lng) <= v_radius;

  v_ratio := v_orders::double precision / greatest(v_couriers, 1);
  v_level := case
    when v_orders = 0 and v_waiting = 0 then 'quiet'
    when v_ratio > 2 then 'very_busy'
    when v_ratio >= 1 or v_waiting > 0 then 'busy'
    else 'normal'
  end;

  return jsonb_build_object(
    'level', v_level,
    'orders_30min', v_orders,
    'waiting', v_waiting,
    'couriers_online', v_couriers,
    'radius_km', v_radius
  );
end;
$$;

revoke all on function public.courier_area_demand(double precision, double precision) from public, anon;
grant execute on function public.courier_area_demand(double precision, double precision) to authenticated;

commit;

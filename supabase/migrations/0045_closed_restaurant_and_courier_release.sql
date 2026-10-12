-- delivo: suljettuun ravintolaan ei voi tilata, ja kuljettajan luopuminen
-- keikasta näkyy asiakkaalle ja ravintolalle.
--
--   1. Tilaus hylätään tietokannassa, jos ravintola on suljettu (is_open =
--      false, dashboardin "Suljettu"/"Tauko"). Verkkosivu tarkistaa saman, mutta
--      vanhalla tiedolla auki oleva kassa ei saa ohittaa sitä.
--   2. Kun kuljettaja luopuu keikasta (courier_release_order), tilaukseen
--      merkitään courier_released_at. Tilaus palaa samalla kaikkien muiden
--      kuljettajien tarjolle; merkinnän perusteella asiakas näkee "etsimme
--      uutta kuljettajaa" ja ravintola "kuljettaja luopui".

begin;

-- ---------------------------------------------------------------------------
-- 1. Ei tilauksia suljettuun ravintolaan
-- ---------------------------------------------------------------------------

create or replace function public.reject_order_to_closed_restaurant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.restaurants r where r.id = new.restaurant_id and r.is_open = false) then
    raise exception 'restaurant_closed' using errcode = 'P0001',
      hint = 'Ravintola on suljettu eikä ota juuri nyt tilauksia vastaan.';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_reject_closed_restaurant on public.orders;
create trigger orders_reject_closed_restaurant
  before insert on public.orders
  for each row
  execute function public.reject_order_to_closed_restaurant();

-- ---------------------------------------------------------------------------
-- 2. Kuljettajan luopuminen talteen
-- ---------------------------------------------------------------------------

alter table public.orders add column if not exists courier_released_at timestamptz;

comment on column public.orders.courier_released_at is
  'Milloin kuljettaja viimeksi luopui keikasta (courier_release_order). Kun courier_id on tyhjä ja tämä on asetettu, tilaukselle etsitään uutta kuljettajaa.';

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
      delivery_eta = null,
      courier_released_at = now()
  where id = p_order_id
    and courier_id = auth.uid()
    and courier_status in ('assigned', 'at_restaurant');
end;
$$;

revoke all on function public.courier_release_order(uuid) from public, anon;
grant execute on function public.courier_release_order(uuid) to authenticated;

commit;

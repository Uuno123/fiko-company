-- delivo: ravintoloiden järjestys (dokumentti "Delivo: ravintoloiden järjestys",
-- 21.10.2026, toteutus frontend/src/lib/ranking.js).
--
--   1. featured_until: päivä, johon asti Iso ravintola -paketin (plan = 'iso',
--      migraatio 0049) ravintola on sponsoroitu. Sponsoroitu ravintola nostetaan
--      listojen paikoille 1 ja 4 "Sponsoroitu"-merkillä. Päivämäärä paketin
--      lisäksi: sponsorointi loppuu itsestään, jos maksu loppuu. Henkilökunta
--      asettaa sen Supabase Studiosta; omistaja ei voi nostaa omaa ravintolaansa
--      (sama suojaus kuin paketilla ja välityspalkkiolla, 0049).
--   2. restaurant_popularity(): suosio-osa (S) järjestykseen - tilaukset 30
--      päivässä suhteessa suosituimpaan ravintolaan (0-1). Tilausmääriä ei
--      palauteta, jottei kuka tahansa näe ravintoloiden myyntimääriä.

begin;

-- ---------------------------------------------------------------------------
-- 1. Sponsorointi
-- ---------------------------------------------------------------------------

alter table public.restaurants add column if not exists featured_until date;

comment on column public.restaurants.featured_until is
  'Sponsoroitu tähän päivään asti (vain plan = iso). Tyhjä tai mennyt päivä = ei sponsoroitu. Vain henkilökunta asettaa.';

-- 0049:n suojaus laajennetaan koskemaan myös sponsorointia: omistajat saavat
-- päivittää ravintolaansa, mutta eivät pakettia, välityspalkkiota eivätkä
-- sponsorointia.
create or replace function public.restaurants_protect_billing()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.plan is distinct from old.plan
          or new.commission_rate_percent is distinct from old.commission_rate_percent
          or new.featured_until is distinct from old.featured_until) then
    raise exception 'billing_fields_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_protect_billing on public.restaurants;
create trigger restaurants_protect_billing
  before update on public.restaurants
  for each row
  execute function public.restaurants_protect_billing();

-- ---------------------------------------------------------------------------
-- 2. Suosio
-- ---------------------------------------------------------------------------

create or replace function public.restaurant_popularity()
returns table (restaurant_id uuid, popularity numeric)
language sql
stable
security definer
set search_path = public
as $$
  with counts as (
    select o.restaurant_id, count(*) as orders
    from public.orders o
    where o.created_at >= now() - interval '30 days'
      and o.status <> 'cancelled'
    group by o.restaurant_id
  )
  select c.restaurant_id, round(c.orders::numeric / nullif(max(c.orders) over (), 0), 2)
  from counts c;
$$;

revoke all on function public.restaurant_popularity() from public;
grant execute on function public.restaurant_popularity() to anon, authenticated;

commit;

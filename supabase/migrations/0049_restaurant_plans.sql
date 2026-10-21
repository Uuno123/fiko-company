-- Uudet ravintolapaketit ilman provisiota (frontend/src/lib/partnerPlans.js):
--   nouto     39,99 €/kk, vain noutotilaukset
--   kuljetus  79,99 €/kk, sisältää 300 kuljetustilausta kuukaudessa
--   iso      199,99 €/kk, sisältää 1 000 kuljetustilausta kuukaudessa
-- Paketin ylittävät kuljetustilaukset 0,49 €/kpl. Hinnat ovat koodissa; kanta
-- tietää vain, missä paketissa ravintola on.
--
-- Olemassa oleville ravintoloille paketti jää tyhjäksi: niillä on vanhat ehdot eli
-- välityspalkkio commission_rate_percent-sarakkeesta (0020, 0040). Henkilökunta
-- asettaa paketin Supabase Studiosta, kuten ennenkin.

alter table public.restaurants
  add column if not exists plan text
    check (plan in ('nouto', 'kuljetus', 'iso'));

-- Uudet ravintolat: Kuljetus-paketti eikä välityspalkkiota. Oletus lisätään vasta
-- sarakkeen luonnin jälkeen, jotta vanhat rivit jäävät tyhjiksi.
alter table public.restaurants
  alter column plan set default 'kuljetus';

alter table public.restaurants
  alter column commission_rate_percent set default 0.00;

comment on column public.restaurants.plan is
  'Ravintolan paketti: nouto, kuljetus tai iso (hinnat partnerPlans.js). Tyhjä = vanhat ehdot commission_rate_percent-sarakkeen mukaan.';

comment on column public.restaurants.commission_rate_percent is
  'Vanhojen ehtojen välityspalkkio prosentteina. Uusissa paketeissa (plan) 0.00, ei provisiota.';

-- Omistajat saavat päivittää ravintolaansa (0009, 0012), mutta eivät omaa
-- pakettiaan tai välityspalkkiotaan: ne muuttaa vain henkilökunta.
create or replace function public.restaurants_protect_billing()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.plan is distinct from old.plan
          or new.commission_rate_percent is distinct from old.commission_rate_percent) then
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

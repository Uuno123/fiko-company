-- delivo: ravintolalla 1,5 min aikaa hyväksyä, perutun tilauksen kuljettaja
-- vapautuu heti, eikä kuljettaja voi pyytää muutosta nykyiseen arvoon
-- (käyttäjän pyynnöt 22.10.2026).
--
-- Kotiinkuljetuksessa kuljettaja ja hinta sovitaan ennen kuin ravintola näkee
-- tilauksen (0058). Jos ravintola sen jälkeen hylkää tilauksen tai ei hyväksy
-- 90 sekunnissa, tilaus peruuntuu: kortin varaus vapautuu (backend) ja
-- kuljettaja saa ilmoituksen sovellukseen.
--
-- Korjaus: peruttuun tilaukseen jäi kuljettajan tila "assigned", jolloin
-- kuljettaja näytti yhä varatulta eikä saanut uusia pyyntöjä tai keikkoja.

begin;

-- 1. Hyväksyntäaika 3 min -> 90 s. Ajastin 15 s välein (pg_cron 1.5+), jotta
--    peruutus tapahtuu ajallaan; vanhemmalla versiolla kerran minuutissa.
create or replace function public.cancel_stale_pending_orders()
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set status = 'cancelled'
  where status = 'pending'
    and coalesce(placed_at, created_at) < now() - interval '90 seconds';
$$;

comment on function public.cancel_stale_pending_orders() is
  'Peruu tilaukset, joita ravintola ei ole hyväksynyt 90 sekunnissa ravintolalle lähtemisestä (placed_at). Pidä samana kuin kojelaudan PENDING_AUTO_CANCEL_MINUTES.';

-- Vain ajastin ajaa tämän. Aiemmin (0028) kuka tahansa, myös kirjautumaton,
-- pystyi kutsumaan sitä REST-rajapinnan kautta.
revoke all on function public.cancel_stale_pending_orders() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cancel-stale-pending-orders') then
    perform cron.unschedule('cancel-stale-pending-orders');
  end if;
  begin
    perform cron.schedule('cancel-stale-pending-orders', '15 seconds', 'select public.cancel_stale_pending_orders();');
  exception when others then
    perform cron.schedule('cancel-stale-pending-orders', '* * * * *', 'select public.cancel_stale_pending_orders();');
  end;
end;
$$;

-- 2. Peruttu tilaus vapauttaa kuljettajan, joka ei ole vielä noutanut ruokaa.
--    courier_id jää historiaa varten, joten kuljettaja näkee peruutuksen.
create or replace function public.release_courier_on_cancel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.courier_status in ('assigned', 'at_restaurant') then
    new.courier_status := null;
    new.courier_arrive_by := null;
    new.delivery_eta := null;
  end if;
  new.dispatch_next_at := null;
  return new;
end;
$$;

drop trigger if exists orders_release_courier_on_cancel on public.orders;
create trigger orders_release_courier_on_cancel
  before update of status on public.orders
  for each row
  when (new.status = 'cancelled' and old.status is distinct from 'cancelled')
  execute function public.release_courier_on_cancel();

-- Varmistus: peruttu tilaus ei koskaan pidä kuljettajaa varattuna.
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
      and status <> 'cancelled'
      and courier_status in ('assigned', 'at_restaurant', 'picked_up')
  );
$$;

revoke all on function public.courier_has_active_job(uuid) from public, anon, authenticated;
revoke all on function public.release_courier_on_cancel() from public, anon, authenticated;

-- 3. Kuljettajan muutospyyntö samaan arvoon kuin nykyinen on turha (esim.
--    kulkuneuvo auto -> auto). Kentän nimi on sama kuin couriers-taulun sarake
--    (0051 rajaa kentät), joten nykyinen arvo luetaan suoraan siitä.
create or replace function public.reject_same_value_courier_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
  v_new text := lower(btrim(new.new_value));
begin
  execute format('select %I::text from public.couriers where id = $1', new.field) into v_current using new.courier_id;
  if new.field = 'iban' then
    v_new := replace(v_new, ' ', '');
    v_current := replace(v_current, ' ', '');
  end if;
  if v_current is not null and lower(btrim(v_current)) = v_new then
    raise exception 'same_value';
  end if;
  return new;
end;
$$;

drop trigger if exists courier_change_requests_reject_same_value on public.courier_change_requests;
create trigger courier_change_requests_reject_same_value
  before insert on public.courier_change_requests
  for each row
  execute function public.reject_same_value_courier_change();

revoke all on function public.reject_same_value_courier_change() from public, anon, authenticated;

-- Jo perutut tilaukset, joihin kuljettajan tila jäi.
update public.orders
set courier_status = null, courier_arrive_by = null, delivery_eta = null
where status = 'cancelled'
  and courier_status in ('assigned', 'at_restaurant');

commit;

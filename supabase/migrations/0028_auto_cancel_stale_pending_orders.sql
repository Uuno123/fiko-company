-- Jos ravintola ei hyväksy tilausta 3 minuutin sisällä, se perutaan automaattisesti - asiakas
-- ei jää odottamaan vastausta joka ei koskaan tule (esim. omistaja ei huomannut tilausta tai
-- kojelauta ei ollut auki). Ajetaan Postgresin omalla ajastimella (pg_cron), jotta peruutus
-- tapahtuu vaikka kenelläkään ei olisi sovellus auki juuri sillä hetkellä.

create extension if not exists pg_cron with schema extensions;

create or replace function public.cancel_stale_pending_orders()
returns void
language sql
security definer
set search_path = public
as $$
  update public.orders
  set status = 'cancelled'
  where status = 'pending'
    and created_at < now() - interval '3 minutes';
$$;

comment on function public.cancel_stale_pending_orders() is
  'Peruu automaattisesti pending-tilaukset jotka ovat odottaneet ravintolan hyväksyntää yli 3 minuuttia. Ajetaan pg_cronilla kerran minuutissa.';

do $$
begin
  if exists (select 1 from cron.job where jobname = 'cancel-stale-pending-orders') then
    perform cron.unschedule('cancel-stale-pending-orders');
  end if;
end;
$$;

select cron.schedule(
  'cancel-stale-pending-orders',
  '* * * * *',
  $$ select public.cancel_stale_pending_orders(); $$
);

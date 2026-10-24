-- Bidrop: onko kuljettajan palkkio maksettu tilille (käyttäjän pyyntö 24.10.2026).
--
-- Kuljettajasovelluksen Ansioissa jokaisella keikalla on vihreä pallo, kun
-- palkkio on maksettu, ja punainen, kun se odottaa maksua. Maksupäivän ja
-- arvion sovellus laskee tilitysjaksosta (kaksi viikkoa, kuljettaja-app
-- lib/payouts.js).
--
-- Merkitse jakso maksetuksi SQL Editorissa, kun maksut on lähetetty pankista:
--   update public.orders
--   set courier_paid_at = now()
--   where courier_status = 'delivered'
--     and courier_paid_at is null
--     and delivered_at < '2026-11-02';   -- jakson viimeistä päivää seuraava päivä

begin;

alter table public.orders
  add column if not exists courier_paid_at timestamptz;

comment on column public.orders.courier_paid_at is
  'Milloin kuljettajan palkkio (courier_fee_cents) maksettiin tilille. null = odottaa maksua. Vain Bidrop asettaa.';

create index if not exists orders_courier_unpaid_idx
  on public.orders (courier_id, delivered_at)
  where courier_status = 'delivered' and courier_paid_at is null;

-- Asiakas, ravintola tai kuljettaja ei voi merkitä palkkiota maksetuksi.
-- Invoker-oikeuksin, jotta current_user kertoo kutsujan (kuten 0058).
create or replace function public.protect_courier_paid_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.courier_paid_at := null;
    elsif new.courier_paid_at is distinct from old.courier_paid_at then
      new.courier_paid_at := old.courier_paid_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_protect_courier_paid_at on public.orders;
create trigger orders_protect_courier_paid_at
  before insert or update on public.orders
  for each row
  execute function public.protect_courier_paid_at();

commit;

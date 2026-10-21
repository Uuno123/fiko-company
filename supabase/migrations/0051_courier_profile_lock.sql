-- Kuljettajan tiedot lukkoon (kuljettaja-app: Profiili, Asetukset, Laskutustiedot).
--
-- Kuljettaja saa muuttaa itse vain puhelinnumeronsa ja sovelluksen kielen.
-- Henkilöllisyyteen, laskutukseen ja keikkojen jakoon vaikuttavat tiedot (nimi,
-- sähköposti, kulkuneuvo, kaupunki, Y-tunnus, laskutustapa, tilinumero)
-- muuttuvat vain muutospyynnöllä, jonka delivo hyväksyy.
--
-- Näin muutospyyntö hyväksytään Supabase Studiossa:
--   1. Table Editor > courier_change_requests, suodata status = pending.
--   2. Tarkista pyyntö. Kulkuneuvon (auto/skootteri) ja tilinumeron muutoksessa
--      katso ensin, että ajokortti tai pankkitodiste on courier_documents-taulussa
--      ja hyväksytty.
--   3. Vaihda status arvoon approved tai rejected. Kirjoita halutessasi syy
--      admin_note-kenttään (kuljettaja näkee sen). Tallenna.
--   Hyväksyttäessä trigger kopioi uuden arvon couriers-riville ja merkitsee
--   decided_at-ajan. Päätettyä pyyntöä ei voi enää muuttaa.
--   Huom: sähköpostin muutos päivittää couriers.email-kentän. Kirjautumistunnus
--   vaihdetaan lisäksi Authentication > Users -näkymästä. Tilinomistajan nimi
--   (iban_holder) päivitetään Studiossa käsin tilinumeron muutoksen yhteydessä.

alter table public.couriers
  add column if not exists email text,
  add column if not exists city text not null default 'kuopio',
  add column if not exists business_id text,
  add column if not exists billing_method text check (billing_method in ('own_company', 'ukko', 'eezy')),
  add column if not exists iban text,
  add column if not exists iban_holder text,
  add column if not exists language text not null default 'fi' check (language in ('fi', 'en'));

-- Kirjautumisen sähköposti valmiiksi kuljettajan riville.
update public.couriers c
set email = u.email
from auth.users u
where u.id = c.id
  and c.email is null;

-- Kuljettaja päivittää itse vain puhelinnumeron ja kielen (0043 salli myös
-- nimen ja kulkuneuvon). Taulutasoinen ja sarakekohtainen oikeus pois ensin.
revoke update on public.couriers from authenticated;
revoke update (name, phone, vehicle) on public.couriers from authenticated;
grant update (phone, language) on public.couriers to authenticated;

-- ---------------------------------------------------------------------------
-- Muutospyynnöt
-- ---------------------------------------------------------------------------

create table if not exists public.courier_change_requests (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.couriers (id) on delete cascade,
  field text not null
    check (field in ('name', 'email', 'vehicle', 'city', 'business_id', 'billing_method', 'iban')),
  new_value text not null check (length(btrim(new_value)) > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

comment on table public.courier_change_requests is
  'Kuljettajan pyynnöt lukittujen tietojen muuttamiseksi. delivo hyväksyy Studiossa vaihtamalla statuksen (ks. 0051).';

-- Yksi avoin pyyntö per kenttä.
create unique index if not exists courier_change_requests_one_pending
  on public.courier_change_requests (courier_id, field)
  where status = 'pending';

create index if not exists courier_change_requests_courier
  on public.courier_change_requests (courier_id, created_at desc);

alter table public.courier_change_requests enable row level security;

drop policy if exists "Couriers can view own change requests" on public.courier_change_requests;
create policy "Couriers can view own change requests"
  on public.courier_change_requests
  for select
  to authenticated
  using (courier_id = auth.uid());

drop policy if exists "Couriers can create own change requests" on public.courier_change_requests;
create policy "Couriers can create own change requests"
  on public.courier_change_requests
  for insert
  to authenticated
  with check (courier_id = auth.uid() and status = 'pending');

-- Kuljettaja lisää vain pyynnön sisällön. Tilaa, delivon huomiota ja
-- päätösaikaa ei voi asettaa, eikä pyyntöä voi muokata tai poistaa.
grant select on public.courier_change_requests to authenticated;
grant insert (courier_id, field, new_value, reason) on public.courier_change_requests to authenticated;

-- Hyväksytty pyyntö kopioi uuden arvon kuljettajan riville. security definer:
-- couriers-taulun lukitut sarakkeet voi päivittää vain tämä funktio (ja Studio).
create or replace function public.apply_courier_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text := btrim(new.new_value);
begin
  if new.status is not distinct from old.status then
    return new;
  end if;
  if old.status <> 'pending' then
    raise exception 'change_request_already_decided';
  end if;

  new.decided_at := now();

  if new.status = 'approved' then
    case new.field
      when 'name' then
        update public.couriers set name = v_value where id = new.courier_id;
      when 'email' then
        update public.couriers set email = lower(v_value) where id = new.courier_id;
      when 'vehicle' then
        update public.couriers set vehicle = lower(v_value) where id = new.courier_id;
      when 'city' then
        update public.couriers set city = lower(v_value) where id = new.courier_id;
      when 'business_id' then
        update public.couriers set business_id = v_value where id = new.courier_id;
      when 'billing_method' then
        update public.couriers set billing_method = v_value where id = new.courier_id;
      when 'iban' then
        update public.couriers set iban = upper(replace(v_value, ' ', '')) where id = new.courier_id;
      else
        raise exception 'change_request_field_not_allowed';
    end case;
  end if;

  return new;
end;
$$;

drop trigger if exists courier_change_requests_apply on public.courier_change_requests;
create trigger courier_change_requests_apply
  before update of status on public.courier_change_requests
  for each row
  execute function public.apply_courier_change_request();


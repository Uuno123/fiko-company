-- Ravintolan tietojen muutos muutospyynnöllä (kumppanikojelauta).
--
-- Ravintola ei voi enää itse muuttaa tunnistetietojaan: nimeä, osoitetta ja
-- sijaintia, kaupunkia, yrityksen nimeä, Y-tunnusta, tilinumeroa eikä
-- pakettia. Muutos pyydetään kojelaudalta (Asetukset > Yritys ja dokumentit),
-- ja pyyntöön liitetään tarvittava dokumentti (esim. kaupparekisteriote tai
-- pankkitodiste). delivo hyväksyy pyynnön Supabase Studiossa, jolloin uusi
-- arvo kopioituu ravintolalle automaattisesti.
--
-- Ensimmäinen täyttö on sallittu: jos tieto puuttuu (NULL), ravintola voi
-- asettaa sen itse. Kuvaus, kategoria, kansikuva, aukiolot, valmistusaika ja
-- ruokalista ovat edelleen vapaasti muokattavissa.
--
-- Näin pyyntö käsitellään Studiossa:
--   1. Table Editor > restaurant_change_requests, suodata status = pending.
--   2. Katso liitteet: restaurant_documents (change_request_id) ja kuva
--      Storage > restaurant-documents > path.
--   3. Vaihda status arvoon approved (tieto päivittyy) tai rejected ja kirjoita
--      syy admin_note-kenttään (ravintola näkee sen).

begin;

-- ---------------------------------------------------------------------------
-- 1. Yritystiedot ravintolalle
-- ---------------------------------------------------------------------------

alter table public.restaurants
  add column if not exists company_name text,
  add column if not exists business_id text,
  add column if not exists iban text;

comment on column public.restaurants.company_name is 'Yrityksen virallinen nimi (laskutus). Muutos muutospyynnöllä (0055).';
comment on column public.restaurants.business_id is 'Y-tunnus, esim. 1234567-8. Muutos muutospyynnöllä (0055).';
comment on column public.restaurants.iban is 'Tilitysten tilinumero (IBAN). Muutos muutospyynnöllä (0055).';

-- ---------------------------------------------------------------------------
-- 2. Lukitus: tunnistetiedot vain muutospyynnöllä
-- ---------------------------------------------------------------------------

-- Sama suojafunktio kuin paketille, provisiolle, sponsoroinnille ja
-- arvosanalle (0049, 0050, 0054), nyt myös tunnistetiedoille. Tyhjän tiedon
-- saa täyttää itse.
create or replace function public.restaurants_protect_billing()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.plan is distinct from old.plan
     or new.commission_rate_percent is distinct from old.commission_rate_percent
     or new.featured_until is distinct from old.featured_until
     or new.rating is distinct from old.rating
     or new.review_count is distinct from old.review_count then
    raise exception 'billing_fields_locked' using errcode = '42501';
  end if;

  if new.name is distinct from old.name
     or new.city is distinct from old.city
     or (old.address is not null and new.address is distinct from old.address)
     or (old.lat is not null and new.lat is distinct from old.lat)
     or (old.lng is not null and new.lng is distinct from old.lng)
     or (old.company_name is not null and new.company_name is distinct from old.company_name)
     or (old.business_id is not null and new.business_id is distinct from old.business_id)
     or (old.iban is not null and new.iban is distinct from old.iban) then
    raise exception 'restaurant_details_locked' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Muutospyynnöt
-- ---------------------------------------------------------------------------

create table if not exists public.restaurant_change_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  requested_by uuid default auth.uid() references auth.users (id) on delete set null,
  field text not null check (field in ('name', 'address', 'city', 'company_name', 'business_id', 'iban', 'plan')),
  new_value text not null check (char_length(new_value) between 1 and 300),
  new_lat numeric(9, 6),
  new_lng numeric(9, 6),
  reason text check (char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

comment on table public.restaurant_change_requests is
  'Ravintolan tunnistetietojen muutospyynnöt. delivo hyväksyy Studiossa vaihtamalla statuksen (ks. 0055).';

-- Yksi avoin pyyntö kerrallaan per tieto.
create unique index if not exists restaurant_change_requests_one_pending
  on public.restaurant_change_requests (restaurant_id, field)
  where status = 'pending';

create index if not exists restaurant_change_requests_restaurant
  on public.restaurant_change_requests (restaurant_id, created_at desc);

alter table public.restaurant_change_requests enable row level security;

drop policy if exists "Owners can view own restaurant change requests" on public.restaurant_change_requests;
create policy "Owners can view own restaurant change requests"
  on public.restaurant_change_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurant_change_requests.restaurant_id and ro.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can create own restaurant change requests" on public.restaurant_change_requests;
create policy "Owners can create own restaurant change requests"
  on public.restaurant_change_requests for insert
  to authenticated
  with check (
    status = 'pending'
    and requested_by = auth.uid()
    and exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurant_change_requests.restaurant_id and ro.owner_id = auth.uid()
    )
  );

revoke all on public.restaurant_change_requests from anon, authenticated;
grant select on public.restaurant_change_requests to authenticated;
grant insert (restaurant_id, field, new_value, new_lat, new_lng, reason) on public.restaurant_change_requests to authenticated;

-- Hyväksyntä (Studiossa): uusi arvo kopioituu ravintolalle. Päätettyä
-- pyyntöä ei voi enää muuttaa.
create or replace function public.apply_restaurant_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value text := btrim(new.new_value);
  v_iban text;
begin
  if old.status <> 'pending' then
    raise exception 'change_request_already_decided';
  end if;
  if new.status = old.status then
    return new;
  end if;
  new.decided_at := now();
  if new.status <> 'approved' then
    return new;
  end if;

  if new.field = 'name' then
    if v_value = '' then raise exception 'invalid_name'; end if;
    update public.restaurants set name = v_value where id = new.restaurant_id;
  elsif new.field = 'address' then
    if v_value = '' then raise exception 'invalid_address'; end if;
    update public.restaurants
    set address = v_value,
        lat = coalesce(new.new_lat, lat),
        lng = coalesce(new.new_lng, lng)
    where id = new.restaurant_id;
  elsif new.field = 'city' then
    if v_value = '' then raise exception 'invalid_city'; end if;
    update public.restaurants set city = v_value where id = new.restaurant_id;
  elsif new.field = 'company_name' then
    if v_value = '' then raise exception 'invalid_company_name'; end if;
    update public.restaurants set company_name = v_value where id = new.restaurant_id;
  elsif new.field = 'business_id' then
    if v_value !~ '^\d{7}-\d$' then raise exception 'invalid_business_id'; end if;
    update public.restaurants set business_id = v_value where id = new.restaurant_id;
  elsif new.field = 'iban' then
    v_iban := upper(regexp_replace(v_value, '\s', '', 'g'));
    if v_iban !~ '^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$' then raise exception 'invalid_iban'; end if;
    update public.restaurants set iban = v_iban where id = new.restaurant_id;
  elsif new.field = 'plan' then
    if v_value not in ('nouto', 'kuljetus', 'iso') then raise exception 'invalid_plan'; end if;
    update public.restaurants set plan = v_value where id = new.restaurant_id;
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_change_requests_apply on public.restaurant_change_requests;
create trigger restaurant_change_requests_apply
  before update of status on public.restaurant_change_requests
  for each row
  execute function public.apply_restaurant_change_request();

revoke all on function public.apply_restaurant_change_request() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Dokumentit
-- ---------------------------------------------------------------------------

create table if not exists public.restaurant_documents (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  change_request_id uuid references public.restaurant_change_requests (id) on delete set null,
  type text not null check (type in ('business_register', 'food_permit', 'bank_proof', 'id_document', 'other')),
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

comment on table public.restaurant_documents is
  'Ravintolan lähettämät dokumentit (kaupparekisteriote, elintarvikeilmoitus, pankkitodiste...). Tarkastus Studiossa (0055).';

create index if not exists restaurant_documents_restaurant
  on public.restaurant_documents (restaurant_id, created_at desc);

alter table public.restaurant_documents enable row level security;

drop policy if exists "Owners can view own restaurant documents" on public.restaurant_documents;
create policy "Owners can view own restaurant documents"
  on public.restaurant_documents for select
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurant_documents.restaurant_id and ro.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can add own restaurant documents" on public.restaurant_documents;
create policy "Owners can add own restaurant documents"
  on public.restaurant_documents for insert
  to authenticated
  with check (
    status = 'pending'
    and path like restaurant_id::text || '/%'
    and exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurant_documents.restaurant_id and ro.owner_id = auth.uid()
    )
  );

revoke all on public.restaurant_documents from anon, authenticated;
grant select on public.restaurant_documents to authenticated;
grant insert (restaurant_id, change_request_id, type, path) on public.restaurant_documents to authenticated;

-- Yksityinen säiliö: kuvat ja PDF:t kansioon <ravintolan id>/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-documents',
  'restaurant-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "Owners can upload restaurant documents" on storage.objects;
create policy "Owners can upload restaurant documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-documents'
    and (storage.foldername(name))[1] in (
      select ro.restaurant_id::text from public.restaurant_owners ro where ro.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can read restaurant documents" on storage.objects;
create policy "Owners can read restaurant documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'restaurant-documents'
    and (storage.foldername(name))[1] in (
      select ro.restaurant_id::text from public.restaurant_owners ro where ro.owner_id = auth.uid()
    )
  );

commit;

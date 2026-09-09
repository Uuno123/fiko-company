-- Fiko: ravintolakumppaneiden (restaurant owner) tilit. Täysin erillinen customers-taulusta/
-- kirjautumisesta - eri käyttäjät, eri tarkoitus. Yksi auth.users-rivi voi omistaa 1+ ravintolaa.

create table if not exists public.restaurant_owners (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  owner_name text not null,
  owner_phone text not null,
  owner_email text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, restaurant_id)
);

comment on table public.restaurant_owners is 'Linkittää auth.users-tilin sen omistamiin ravintoloihin (kumppanidashboard).';

alter table public.restaurant_owners enable row level security;

create index if not exists restaurant_owners_restaurant_id_idx on public.restaurant_owners (restaurant_id);

-- Omistaja näkee vain omat rivinsä. Kirjoitus tapahtuu vain alla olevan
-- SECURITY DEFINER -triggerin kautta rekisteröitymisen yhteydessä, ei suoraan clientistä.
create policy "Owners can view own owner rows"
  on public.restaurant_owners
  for select
  to authenticated
  using (auth.uid() = owner_id);

-- Kumppani saa muokata (vain) omistamansa ravintolan tietoja.
create policy "Owners can update own restaurant"
  on public.restaurants
  for update
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurants.id
        and ro.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = restaurants.id
        and ro.owner_id = auth.uid()
    )
  );

-- Kumppani saa hallita (lisätä/muokata/poistaa) vain omistamansa ravintolan ruokalistarivejä.
create policy "Owners can insert own menu items"
  on public.menu_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = menu_items.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

create policy "Owners can update own menu items"
  on public.menu_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = menu_items.restaurant_id
        and ro.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = menu_items.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

create policy "Owners can delete own menu items"
  on public.menu_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = menu_items.restaurant_id
        and ro.owner_id = auth.uid()
    )
  );

-- Kumppaniksi rekisteröityminen (Register-lomake lähettää raw_user_meta_data:ssa
-- is_restaurant_owner=true + ravintolan perustiedot). Luo sekä uuden restaurants-rivin
-- että sen omistuslinkin atomisesti, samaan tapaan kuin handle_new_customer asiakkaille.
-- Uusi ravintola luodaan is_open=false: kumppani avaa sen itse kojelaudalta kun tiedot on täytetty.
create or replace function public.handle_new_restaurant_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
begin
  if coalesce(new.raw_user_meta_data ->> 'is_restaurant_owner', 'false') <> 'true' then
    return new;
  end if;

  insert into public.restaurants (name, category, city, address, is_open)
  values (
    coalesce(new.raw_user_meta_data ->> 'restaurant_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'restaurant_category', ''), 'Muu'),
    nullif(new.raw_user_meta_data ->> 'restaurant_city', ''),
    nullif(new.raw_user_meta_data ->> 'restaurant_address', ''),
    false
  )
  returning id into v_restaurant_id;

  insert into public.restaurant_owners (owner_id, restaurant_id, owner_name, owner_phone, owner_email)
  values (
    new.id,
    v_restaurant_id,
    coalesce(new.raw_user_meta_data ->> 'owner_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_phone', ''),
    new.email
  )
  on conflict (owner_id, restaurant_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_partner on auth.users;

create trigger on_auth_user_created_partner
  after insert on auth.users
  for each row
  execute function public.handle_new_restaurant_owner();

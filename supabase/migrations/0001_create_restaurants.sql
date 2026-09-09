-- Fiko: ravintolat-taulu etusivun listausta varten
create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  image_url text,
  is_open boolean not null default true,
  address text,
  created_at timestamptz not null default now()
);

comment on table public.restaurants is 'Fikon ravintolalistaus (etusivun kortit)';
comment on column public.restaurants.image_url is 'Julkinen kuva-URL. NULL = frontend näyttää brändivärisen avatar-tilan.';

-- Julkinen data: kuka tahansa (myös kirjautumaton) saa lukea listauksen,
-- mutta kirjoitusoikeutta ei anneta anon/authenticated-rooleille.
alter table public.restaurants enable row level security;

create policy "Restaurants are publicly viewable"
  on public.restaurants
  for select
  to anon, authenticated
  using (true);

create index if not exists restaurants_category_idx on public.restaurants (category);

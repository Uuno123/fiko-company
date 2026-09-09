-- Ravintolan ruokalistan rivit. Ei omaa RLS-kirjoitusoikeutta anon/authenticated-rooleille,
-- sama julkinen lukupolitiikka kuin restaurants-taulussa.
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

comment on column public.menu_items.image_url is 'Julkinen kuva-URL. NULL = frontend näyttää brändivärisen avatar-tilan, kuten ravintolakorteissa.';

alter table public.menu_items enable row level security;

create policy "Menu items are publicly viewable"
  on public.menu_items
  for select
  to anon, authenticated
  using (true);

create index if not exists menu_items_restaurant_id_idx on public.menu_items (restaurant_id);

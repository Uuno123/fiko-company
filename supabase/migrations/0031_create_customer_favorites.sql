-- Fiko: asiakkaiden suosikkiravintolat. Profiilin Omat tiedot -näkymä listaa nämä oikeasti
-- (aiemmin siellä oli vain koriste-esimerkki), ja ravintolan sivun sydän-nappi tallentaa/poistaa
-- rivin täältä sen sijaan että olisi pelkkä paikallinen UI-tila.

create table if not exists public.customer_favorites (
  customer_id uuid not null references public.customers (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, restaurant_id)
);

comment on table public.customer_favorites is 'Asiakkaan suosikiksi merkitsemät ravintolat. Yksi rivi = yksi suosikki.';

alter table public.customer_favorites enable row level security;

create policy "Customers can view own favorites"
  on public.customer_favorites
  for select
  to authenticated
  using (auth.uid() = customer_id);

create policy "Customers can add own favorites"
  on public.customer_favorites
  for insert
  to authenticated
  with check (auth.uid() = customer_id);

create policy "Customers can remove own favorites"
  on public.customer_favorites
  for delete
  to authenticated
  using (auth.uid() = customer_id);

-- "Automatically expose new tables" on pois päältä (ks. 0012) - grantit pitää lisätä käsin,
-- muuten Postgres estää pääsyn ennen kuin RLS-käytännöt edes arvioidaan.
grant select, insert, delete on public.customer_favorites to authenticated;

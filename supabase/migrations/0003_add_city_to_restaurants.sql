-- Lisää kaupunki-sarake etusivun sijaintivalikkoa varten.
-- Oletusarvo pitää olemassa olevat rivit (ja seed-datan) toimivina ilman erillistä backfill-askelta.
alter table public.restaurants
  add column if not exists city text not null default 'Kuopio';

create index if not exists restaurants_city_idx on public.restaurants (city);

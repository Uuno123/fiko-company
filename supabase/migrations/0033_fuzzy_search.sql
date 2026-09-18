-- Haku siedettävä pieniä kirjoitusvirheitä ("pizzta" -> "pizza") - plain ilike vaatii
-- tarkan osuman. pg_trgm-laajennus mahdollistaa trigrammipohjaisen samankaltaisuushaun.

create extension if not exists pg_trgm;

create index if not exists restaurants_name_trgm_idx on public.restaurants using gin (name gin_trgm_ops);
create index if not exists menu_items_name_trgm_idx on public.menu_items using gin (name gin_trgm_ops);

-- security definer koska haluamme hakea myös suljettujen ravintoloiden nimet haussa
-- (näytetään "Kiinni"-tilana asiakkaalle, ei piiloteta niitä hausta), mutta PostgREST-roolien
-- omat RLS-käytännöt eivät estäisi tätäkään - definer vain varmistaa ettei funktio yllättäen
-- hajoa jos joku RLS-käytäntö tiukentuu myöhemmin eri tarkoitukseen.
-- Kynnysarvo annetaan eksplisiittisesti similarity()-kutsussa (set_limit()/'%'-operaattori
-- nojaisi istuntokohtaiseen GUC-asetukseen, joka EI säily migraation ajon jälkeen).
create or replace function public.search_restaurants(search_term text)
returns setof public.restaurants
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.restaurants
  where similarity(name, search_term) > 0.2 or name ilike '%' || search_term || '%'
  order by similarity(name, search_term) desc
  limit 8;
$$;

create or replace function public.search_menu_items(search_term text)
returns table (
  id uuid,
  name text,
  price_cents integer,
  image_url text,
  restaurant_id uuid,
  restaurant_name text,
  restaurant_image_url text,
  restaurant_is_open boolean,
  restaurant_rating numeric,
  restaurant_free_delivery boolean,
  restaurant_pickup_estimate_minutes integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mi.id,
    mi.name,
    mi.price_cents,
    mi.image_url,
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.image_url as restaurant_image_url,
    r.is_open as restaurant_is_open,
    r.rating as restaurant_rating,
    r.free_delivery as restaurant_free_delivery,
    r.pickup_estimate_minutes as restaurant_pickup_estimate_minutes
  from public.menu_items mi
  join public.restaurants r on r.id = mi.restaurant_id
  where similarity(mi.name, search_term) > 0.2 or mi.name ilike '%' || search_term || '%'
  order by similarity(mi.name, search_term) desc
  limit 8;
$$;

grant execute on function public.search_restaurants(text) to anon, authenticated;
grant execute on function public.search_menu_items(text) to anon, authenticated;

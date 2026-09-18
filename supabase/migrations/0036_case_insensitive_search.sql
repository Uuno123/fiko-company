-- word_similarity/ilike ovat kirjainkoosta riippuvaisia - "Pizzeria" (iso P) ei täsmännyt
-- hakusanaan "pizza" (pieni p) koska trigrammit eroavat kirjainkoon takia. Pienennetään
-- molemmat puolet ennen vertailua.

create or replace function public.search_restaurants(search_term text, result_limit integer default 8)
returns setof public.restaurants
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.restaurants
  where word_similarity(lower(search_term), lower(name)) > 0.3 or name ilike '%' || search_term || '%'
  order by word_similarity(lower(search_term), lower(name)) desc
  limit result_limit;
$$;

create or replace function public.search_menu_items(search_term text, result_limit integer default 8)
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
  where word_similarity(lower(search_term), lower(mi.name)) > 0.3 or mi.name ilike '%' || search_term || '%'
  order by word_similarity(lower(search_term), lower(mi.name)) desc
  limit result_limit;
$$;

grant execute on function public.search_restaurants(text, integer) to anon, authenticated;
grant execute on function public.search_menu_items(text, integer) to anon, authenticated;

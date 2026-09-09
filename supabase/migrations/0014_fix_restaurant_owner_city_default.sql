-- Fiko: handle_new_restaurant_owner (0009) saattoi insertoida NULL:in restaurants.city-sarakkeeseen
-- jos raw_user_meta_data.restaurant_city puuttui/oli tyhjä. city on not null (oletus 'Kuopio', ks. 0003),
-- ja koska sarake listataan eksplisiittisesti INSERTissä, Postgres ei käytä oletusarvoa vaan yrittää
-- insertoida NULL:in suoraan - tämä rikkoo not null -rajoitteen ja kaataa KOKO auth.users-insertin
-- (ei vain ravintolan luonnin), eli koko rekisteröityminen epäonnistuisi. Korjataan coalesce-oletuksella.
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
    coalesce(nullif(new.raw_user_meta_data ->> 'restaurant_city', ''), 'Kuopio'),
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

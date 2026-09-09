-- Fiko: asiakkaan osoite kerätään nyt rekisteröitymisessä (kotiinkuljetusta varten).
-- Nullable, koska olemassa olevilla asiakkailla ei vielä ole osoitetta - täytetään
-- lomakkeella profiilin muokkauksessa myöhemmin jos tyhjä.
alter table public.customers
  add column if not exists address text;

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'is_restaurant_owner', 'false') = 'true' then
    return new;
  end if;

  insert into public.customers (id, name, phone, email, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

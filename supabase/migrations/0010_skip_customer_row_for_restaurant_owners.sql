-- Fiko: handle_new_customer (0002) fires on every auth.users insert, including
-- restaurant-owner signups from the partner flow (0009), which sets
-- raw_user_meta_data.is_restaurant_owner = 'true'. That produced a blank,
-- unwanted customers row alongside the owner's real restaurant_owners row.
-- Guard the trigger so it skips restaurant-owner signups.
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

  insert into public.customers (id, name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

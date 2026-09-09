-- Fiko: "Automatically expose new tables" was intentionally disabled when creating the
-- Supabase project (recommended for manual access control), which means Postgres never
-- granted anon/authenticated the base table privileges our RLS policies assume. RLS only
-- filters rows on top of an existing GRANT - without the GRANT, Postgres denies access
-- before RLS is even evaluated ("permission denied for table ..."). This adds the missing
-- grants to match the access each table's policies (0001-0011) already describe.

grant select on public.restaurants to anon, authenticated;
grant update on public.restaurants to authenticated;

grant select, update on public.customers to authenticated;

grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

grant select on public.restaurant_owners to authenticated;

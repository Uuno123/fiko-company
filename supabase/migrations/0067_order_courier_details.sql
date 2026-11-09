-- Tilausnäkymän kuljetustiedot asiakkaalle (käyttäjän pyyntö 9.11.2026):
-- kuljettajan koko nimi ja Y-tunnus. Kuljettajat ovat itsenäisiä
-- yrittäjiä, joten asiakas näkee, kuka kuljetuksen myi. Vain oman
-- tilauksen kuljettaja, ja vain kun kuljettaja on valittu.
create or replace function public.order_courier_details(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', nullif(trim(c.name), ''),
    'business_id', nullif(trim(c.business_id), ''),
    'billing_method', c.billing_method
  )
  from public.orders o
  join public.couriers c on c.id = o.courier_id
  where o.id = p_order_id
    and o.customer_id = auth.uid();
$$;

revoke all on function public.order_courier_details(uuid) from public, anon;
grant execute on function public.order_courier_details(uuid) to authenticated;

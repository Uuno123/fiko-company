-- Kuljettajan puhelinnumero asiakkaalle (käyttäjän pyyntö 20.11.2026):
-- asiakas voi soittaa kuljettajalle seurannasta. Vain oman tilauksen
-- kuljettaja, ja vain toimituksen ollessa käynnissä (kuljettaja valittu,
-- ruokaa ei vielä toimitettu). Muulloin palauttaa null.
create or replace function public.order_courier_phone(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(trim(c.phone), '')
  from public.orders o
  join public.couriers c on c.id = o.courier_id
  where o.id = p_order_id
    and o.customer_id = auth.uid()
    and o.courier_status in ('assigned', 'at_restaurant', 'picked_up');
$$;

revoke all on function public.order_courier_phone(uuid) from public, anon;
grant execute on function public.order_courier_phone(uuid) to authenticated;

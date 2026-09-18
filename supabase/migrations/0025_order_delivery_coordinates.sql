-- Tilauksen tilaushetken toimitusosoitteen koordinaatit talteen, jotta asiakkaan
-- tilausnäkymä (OrderHistory.jsx) voi näyttää kartan ravintolan ja kodin sijainnista
-- - sama tieto joka checkoutissa jo lasketaan (delivery.lat/lng) mutta jota ei aiemmin
-- tallennettu mihinkään.

alter table public.orders add column if not exists delivery_lat double precision;
alter table public.orders add column if not exists delivery_lng double precision;

-- Trigger-funktio uudelleenluotava jotta uudetkin sarakkeet nollautuvat vanhaan arvoonsa
-- jos joku muu kuin tilauksen tehnyt asiakas (eli ravintolan omistaja) yrittäisi muuttaa niitä
-- - sama suoja kuin muillakin toimitustietokentillä.
create or replace function public.prevent_order_field_tampering()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from new.customer_id then
    new.order_number := old.order_number;
    new.restaurant_id := old.restaurant_id;
    new.customer_id := old.customer_id;
    new.delivery_method := old.delivery_method;
    new.delivery_name := old.delivery_name;
    new.delivery_phone := old.delivery_phone;
    new.delivery_address := old.delivery_address;
    new.delivery_lat := old.delivery_lat;
    new.delivery_lng := old.delivery_lng;
    new.delivery_notes := old.delivery_notes;
    new.subtotal_cents := old.subtotal_cents;
    new.delivery_fee_cents := old.delivery_fee_cents;
    new.service_fee_cents := old.service_fee_cents;
    new.discount_cents := old.discount_cents;
    new.promo_code := old.promo_code;
    new.total_cents := old.total_cents;
    new.estimated_ready_at := old.estimated_ready_at;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

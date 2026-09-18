-- Ravintolan omistaja voi hyväksyessään tilauksen asettaa oman arvionsa siitä milloin
-- tilaus on valmis noudettavaksi (aiemmin estimated_ready_at laskettiin vain kertaalleen
-- tilauksen luontihetkellä karkealla ravintolan pickup_estimate_minutes-arvolla).

grant update (status, estimated_ready_at) on public.orders to authenticated;

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
    new.created_at := old.created_at;
    -- estimated_ready_at EI ole enää tässä listassa - ravintolan omistaja saa
    -- nimenomaan päivittää sitä (status-sarakkeen ohella), asiakas ei koske siihen ollenkaan.
  end if;
  new.updated_at := now();
  return new;
end;
$$;

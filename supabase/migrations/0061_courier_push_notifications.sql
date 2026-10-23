-- delivo: push-ilmoitukset kuljettajasovellukseen (käyttäjän pyyntö 23.10.2026).
--
-- Kuljettaja saa ilmoituksen puhelimeen myös silloin, kun sovellus on taustalla
-- tai suljettu:
--   - uusi kuljetuspyyntö lähellä (online, ei keikkaa kesken)
--   - asiakas tarjoaa omaa hintaa pyyntöön, johon kuljettaja on tarjonnut
--   - asiakas valitsi kuljettajan (odota ravintolan vahvistusta)
--   - ravintola hyväksyi tilauksen / tilaus on valmis noudettavaksi
--   - tilaus peruuntui (ravintola ei hyväksynyt tai tilaus peruttiin)
--   - uusi keikkatarjous (keikan uudelleenjako, 0046)
--
-- Sovellus tallentaa puhelimen Expo-push-tunnuksen (register_push_token).
-- Viestit lähtevät Expon push-palveluun (ilmainen) pg_net-laajennuksella
-- taustalla vasta, kun tilauksen muutos on tallentunut. Jos lähetys ei
-- onnistu, tilaus etenee silti normaalisti - ilmoitus vain jää tulematta.

begin;

-- pg_net: HTTP-kutsut tietokannasta (Supabasen oma laajennus, ei maksa).
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Puhelinten push-tunnukset
-- ---------------------------------------------------------------------------

create table if not exists public.courier_push_tokens (
  token text primary key,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.courier_push_tokens is
  'Kuljettajien puhelinten Expo-push-tunnukset. Sovellus päivittää rivin joka käynnistyksessä ja poistaa sen uloskirjautuessa.';

create index if not exists courier_push_tokens_courier_idx on public.courier_push_tokens (courier_id);

-- Ei suoraa luku- eikä kirjoitusoikeutta: vain alla olevat funktiot.
alter table public.courier_push_tokens enable row level security;

-- Tunnus siirtyy kirjautuneelle kuljettajalle (sama puhelin, eri tili).
create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'invalid_token';
  end if;
  insert into public.courier_push_tokens (token, courier_id, platform, updated_at)
  values (p_token, auth.uid(), case when p_platform = 'ios' then 'ios' else 'android' end, now())
  on conflict (token) do update
  set courier_id = excluded.courier_id, platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.courier_push_tokens where token = p_token and courier_id = auth.uid();
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- Uusista pyynnöistä ilmoitetaan online-kuljettajille, joiden viimeisin
-- sijainti on enintään 15 min vanha (sovellus taustalla ei aina lähetä
-- sijaintia). Pyyntölista sovelluksessa vaatii edelleen tuoreen sijainnin.
alter table public.dispatch_settings
  add column if not exists push_location_max_age_seconds int not null default 900;

-- ---------------------------------------------------------------------------
-- 2. Lähetys
-- ---------------------------------------------------------------------------

-- Hinta kuljettajan kielellä: 3,99 € / €3.99.
create or replace function public.push_price(p_cents int, p_language text)
returns text
language sql
immutable
as $$
  select case when p_language = 'en'
    then '€' || to_char(p_cents / 100.0, 'FM990.00')
    else replace(to_char(p_cents / 100.0, 'FM990.00'), '.', ',') || ' €'
  end;
$$;

-- Kellonaika Suomen ajassa (15:42).
create or replace function public.push_time(p_at timestamptz)
returns text
language sql
stable
as $$
  select to_char(p_at at time zone 'Europe/Helsinki', 'HH24:MI');
$$;

-- Yksi viesti jokaiseen kuljettajien puhelimeen. Tekstit ovat jsonb-olioita
-- {"fi": ..., "en": ...}, joista valitaan kuljettajan kieli (couriers.language).
-- Hintaa varten tekstissä voi olla {price}, joka korvataan kielen mukaan.
-- tag/collapseId: saman tilauksen uusi ilmoitus korvaa edellisen puhelimessa.
-- Expo ottaa vastaan enintään 100 viestiä kerrallaan.
create or replace function public.push_to_couriers(
  p_courier_ids uuid[],
  p_title jsonb,
  p_body jsonb,
  p_data jsonb,
  p_ttl_seconds int default 600,
  p_price_cents int default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_messages jsonb;
  v_count int;
  v_offset int := 0;
  v_tag text := 'order-' || coalesce(p_data ->> 'orderId', 'delivo');
begin
  if p_courier_ids is null or cardinality(p_courier_ids) = 0 then
    return 0;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'to', t.token,
      'title', replace(coalesce(p_title ->> c.language, p_title ->> 'fi'), '{price}', coalesce(public.push_price(p_price_cents, c.language), '')),
      'body', replace(coalesce(p_body ->> c.language, p_body ->> 'fi'), '{price}', coalesce(public.push_price(p_price_cents, c.language), '')),
      'data', coalesce(p_data, '{}'::jsonb),
      'sound', 'default',
      'channelId', 'gigs',
      'priority', 'high',
      'ttl', p_ttl_seconds,
      'tag', v_tag,
      'collapseId', v_tag
    )), '[]'::jsonb)
  into v_messages
  from public.courier_push_tokens t
  join public.couriers c on c.id = t.courier_id
  where t.courier_id = any (p_courier_ids)
    and t.updated_at > now() - interval '60 days';

  v_count := jsonb_array_length(v_messages);
  while v_offset < v_count loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (
        select jsonb_agg(m.value order by m.n)
        from jsonb_array_elements(v_messages) with ordinality as m (value, n)
        where m.n > v_offset and m.n <= v_offset + 100
      ),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      timeout_milliseconds := 5000
    );
    v_offset := v_offset + 100;
  end loop;
  return v_count;
exception when others then
  -- Ilmoitus ei saa koskaan estää tilauksen etenemistä.
  raise warning 'push_to_couriers: %', sqlerrm;
  return 0;
end;
$$;

revoke all on function public.push_to_couriers(uuid[], jsonb, jsonb, jsonb, int, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ilmoitukset tilauksen vaiheista
-- ---------------------------------------------------------------------------

-- Uusi kotiinkuljetus odottaa hintaa: lähellä olevat vapaat kuljettajat.
create or replace function public.orders_push_new_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.dispatch_settings;
  v_rest public.restaurants;
  v_ids uuid[];
  v_km text;
begin
  select * into s from public.dispatch_settings limit 1;
  select * into v_rest from public.restaurants where id = new.restaurant_id;
  if v_rest.lat is null or v_rest.lng is null then
    return null;
  end if;

  select array_agg(c.id) into v_ids
  from public.couriers c
  join public.courier_locations l on l.courier_id = c.id
  where c.online
    and l.updated_at > now() - make_interval(secs => coalesce(s.push_location_max_age_seconds, 900))
    and public.distance_km(l.lat, l.lng, v_rest.lat::double precision, v_rest.lng::double precision) <= s.radius_km
    and not public.courier_has_active_job(c.id);

  if new.delivery_lat is not null and new.delivery_lng is not null then
    v_km := to_char(public.distance_km(v_rest.lat::double precision, v_rest.lng::double precision, new.delivery_lat, new.delivery_lng), 'FM990.0');
  end if;

  perform public.push_to_couriers(
    v_ids,
    jsonb_build_object('fi', 'Uusi kuljetuspyyntö', 'en', 'New delivery request'),
    jsonb_build_object(
      'fi', v_rest.name || coalesce(' · toimitus ' || replace(v_km, '.', ',') || ' km', '')
        || case when new.customer_offer_cents is not null then '. Asiakas tarjoaa {price}.' else '. Tee hintatarjous.' end,
      'en', v_rest.name || coalesce(' · ' || v_km || ' km delivery', '')
        || case when new.customer_offer_cents is not null then '. Customer offers {price}.' else '. Make your offer.' end
    ),
    jsonb_build_object('type', 'bid_request', 'orderId', new.id),
    greatest(60, extract(epoch from (new.bidding_expires_at - now()))::int),
    new.customer_offer_cents
  );
  return null;
end;
$$;

drop trigger if exists orders_push_new_request on public.orders;
create trigger orders_push_new_request
  after insert on public.orders
  for each row
  when (new.status = 'awaiting_courier')
  execute function public.orders_push_new_request();

-- Tilan ja asiakkaan hinnan muutokset.
create or replace function public.orders_push_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_ids uuid[];
  v_data jsonb := jsonb_build_object('orderId', new.id);
begin
  select name into v_name from public.restaurants where id = new.restaurant_id;
  v_name := coalesce(v_name, 'delivo');

  -- Asiakas tarjoaa omaa hintaa: kuljettajat, joiden tarjous on sitä korkeampi.
  if new.status = 'awaiting_courier'
     and new.customer_offer_cents is not null
     and new.customer_offer_cents is distinct from old.customer_offer_cents then
    select array_agg(b.courier_id) into v_ids
    from public.delivery_bids b
    where b.order_id = new.id and b.status = 'offered' and b.price_cents > new.customer_offer_cents;
    perform public.push_to_couriers(
      v_ids,
      jsonb_build_object('fi', 'Asiakas tarjoaa {price}', 'en', 'Customer offers {price}'),
      jsonb_build_object('fi', v_name || ': hyväksy {price}, niin keikka on sinun.', 'en', v_name || ': accept {price} and the delivery is yours.'),
      v_data || '{"type": "customer_offer"}',
      greatest(60, extract(epoch from (new.bidding_expires_at - now()))::int),
      new.customer_offer_cents
    );
  end if;

  if new.status is not distinct from old.status or new.courier_id is null then
    return null;
  end if;

  -- Hinnasta sovittiin: kuljettaja odottaa ravintolan vahvistusta.
  if old.status = 'awaiting_courier' and new.status = 'pending' then
    perform public.push_to_couriers(
      array[new.courier_id],
      jsonb_build_object('fi', 'Asiakas valitsi sinut', 'en', 'You got the delivery'),
      jsonb_build_object(
        'fi', v_name || ': kuljetus {price}. Odota, että ravintola vahvistaa tilauksen, ennen kuin lähdet.',
        'en', v_name || ': delivery {price}. Wait for the restaurant to confirm before you leave.'
      ),
      v_data || '{"type": "bid_accepted"}',
      300,
      new.delivery_price_cents
    );

  -- Ravintola hyväksyi: nyt saa lähteä.
  elsif old.status = 'pending' and new.status in ('confirmed', 'preparing', 'ready')
        and old.courier_status in ('assigned', 'at_restaurant') then
    perform public.push_to_couriers(
      array[new.courier_id],
      jsonb_build_object('fi', 'Ravintola hyväksyi tilauksen', 'en', 'Restaurant accepted the order'),
      jsonb_build_object(
        'fi', v_name || coalesce(': ruoka valmiina noin klo ' || public.push_time(new.estimated_ready_at), '') || '. Avaa ajo-ohjeet.',
        'en', v_name || coalesce(': food ready around ' || public.push_time(new.estimated_ready_at), '') || '. Open directions.'
      ),
      v_data || '{"type": "restaurant_accepted"}',
      900
    );

  -- Ruoka valmis noudettavaksi.
  elsif new.status = 'ready' and old.courier_status in ('assigned', 'at_restaurant') then
    perform public.push_to_couriers(
      array[new.courier_id],
      jsonb_build_object('fi', 'Tilaus on valmis', 'en', 'Order is ready'),
      jsonb_build_object(
        'fi', v_name || ': tilaus #' || new.order_number || ' odottaa noutoa.',
        'en', v_name || ': order #' || new.order_number || ' is waiting for pickup.'
      ),
      v_data || '{"type": "order_ready"}',
      900
    );

  -- Peruttu (ravintola hylkäsi, ei vastannut 90 s:ssa tai tilaus peruttiin).
  elsif new.status = 'cancelled' and old.status <> 'awaiting_courier'
        and old.courier_status in ('assigned', 'at_restaurant', 'picked_up') then
    perform public.push_to_couriers(
      array[new.courier_id],
      jsonb_build_object('fi', 'Tilaus peruuntui', 'en', 'Order cancelled'),
      case
        when old.courier_status = 'picked_up' then jsonb_build_object(
          'fi', v_name || ': tilaus #' || new.order_number || ' peruttiin. Ota yhteyttä tukeen.',
          'en', v_name || ': order #' || new.order_number || ' was cancelled. Please contact support.')
        when old.status = 'pending' then jsonb_build_object(
          'fi', v_name || ' ei hyväksynyt tilausta. Olet taas vapaana uusille keikoille.',
          'en', v_name || ' did not accept the order. You are free for new deliveries.')
        else jsonb_build_object(
          'fi', v_name || ': tilaus #' || new.order_number || ' peruttiin. Olet taas vapaana uusille keikoille.',
          'en', v_name || ': order #' || new.order_number || ' was cancelled. You are free for new deliveries.')
      end,
      v_data || '{"type": "order_cancelled"}',
      900
    );
  end if;
  return null;
end;
$$;

drop trigger if exists orders_push_changes on public.orders;
create trigger orders_push_changes
  after update of status, customer_offer_cents on public.orders
  for each row
  when (old.status is distinct from new.status or old.customer_offer_cents is distinct from new.customer_offer_cents)
  execute function public.orders_push_changes();

-- Keikkatarjous yhdelle kuljettajalle (keikan uudelleenjako, 0046).
create or replace function public.courier_offers_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_seconds int := greatest(10, extract(epoch from (new.expires_at - now()))::int);
begin
  select r.name into v_name
  from public.orders o join public.restaurants r on r.id = o.restaurant_id
  where o.id = new.order_id;
  perform public.push_to_couriers(
    array[new.courier_id],
    jsonb_build_object('fi', 'Uusi keikkatarjous', 'en', 'New delivery offer'),
    jsonb_build_object(
      'fi', coalesce(v_name, 'delivo') || coalesce(' · ' || replace(to_char(new.distance_km, 'FM990.0'), '.', ',') || ' km sinusta', '')
        || '. Vastaa ' || v_seconds || ' sekunnin sisällä.',
      'en', coalesce(v_name, 'delivo') || coalesce(' · ' || to_char(new.distance_km, 'FM990.0') || ' km away', '')
        || '. Respond within ' || v_seconds || ' seconds.'
    ),
    jsonb_build_object('type', 'job_offer', 'orderId', new.order_id),
    v_seconds
  );
  return null;
end;
$$;

drop trigger if exists courier_offers_push on public.courier_offers;
create trigger courier_offers_push
  after insert on public.courier_offers
  for each row
  when (new.status = 'pending')
  execute function public.courier_offers_push();

commit;

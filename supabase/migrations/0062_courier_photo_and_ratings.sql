-- Bidrop: kuljettajan profiilikuva ja asiakkaiden arviot (käyttäjän pyyntö 24.10.2026).
--
-- Asiakas näkee hintatarjouksessa kuljettajasta profiilikuvan, nimen
-- ("Janne K."), tähtiarvion, arvioiden määrän ja kulkuneuvon.
--   - Kuljettaja lisää profiilikuvan itse sovelluksessa (julkinen
--     courier-photos-säiliö, oma kansio). Kuva näkyy heti; Bidrop voi poistaa
--     sopimattoman kuvan tyhjentämällä couriers.photo_path-kentän Studiossa.
--   - Asiakas arvioi kuljettajan (1-5 tähteä ja vapaaehtoinen teksti)
--     toimituksen jälkeen. Yksi arvio per tilaus, uusi lähetys muokkaa sitä.
--   - Tarjoukseen kopioidaan kuljettajan kuva ja arvio (asiakas ei näe
--     couriers-taulua), samoin kuin nimi ja kulkuneuvo jo nyt (0058).

begin;

-- ---------------------------------------------------------------------------
-- 1. Profiilikuva
-- ---------------------------------------------------------------------------

alter table public.couriers
  add column if not exists photo_path text,
  add column if not exists rating_count int not null default 0,
  add column if not exists rating_sum int not null default 0;

comment on column public.couriers.photo_path is
  'Profiilikuva courier-photos-säiliössä (<kuljettajan id>/<aikaleima>.jpg). Tyhjennä, jos kuva on sopimaton.';
comment on column public.couriers.rating_count is 'Asiakasarvioiden määrä (courier_reviews, päivittyy automaattisesti).';

-- Julkinen säiliö: asiakkaan selain näyttää kuvan suoraan osoitteesta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('courier-photos', 'courier-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Kuljettaja lisää kuvia vain omaan kansioonsa. Uusi kuva on aina uusi tiedosto.
drop policy if exists "Couriers can upload own photo" on storage.objects;
create policy "Couriers can upload own photo"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'courier-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.couriers c where c.id = auth.uid())
  );

-- Kuvan vaihto tai poisto (null). Kuvan pitää olla kuljettajan omassa kansiossa.
create or replace function public.courier_set_photo(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;
  if p_path is not null and (
    split_part(p_path, '/', 1) <> auth.uid()::text
    or not exists (select 1 from storage.objects o where o.bucket_id = 'courier-photos' and o.name = p_path)
  ) then
    raise exception 'invalid_photo';
  end if;
  update public.couriers set photo_path = p_path where id = auth.uid();
  -- Avoimet tarjoukset saavat uuden kuvan heti (trigger alla).
  update public.delivery_bids set updated_at = now() where courier_id = auth.uid() and status = 'offered';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Arviot
-- ---------------------------------------------------------------------------

create table if not exists public.courier_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  courier_id uuid not null references public.couriers (id) on delete cascade,
  customer_id uuid not null,
  stars int not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.courier_reviews is
  'Asiakkaiden arviot kuljettajista toimituksen jälkeen (submit_courier_review). Asiattoman arvion voi poistaa Studiossa.';

create index if not exists courier_reviews_courier_idx on public.courier_reviews (courier_id, created_at desc);

alter table public.courier_reviews enable row level security;

-- Kuljettaja näkee omat arvionsa, mutta ei sitä, kuka ne antoi.
drop policy if exists "Couriers can view own reviews" on public.courier_reviews;
create policy "Couriers can view own reviews"
  on public.courier_reviews
  for select
  to authenticated
  using (courier_id = auth.uid());

revoke all on public.courier_reviews from anon, authenticated;
grant select (id, order_id, courier_id, stars, comment, created_at, updated_at) on public.courier_reviews to authenticated;

-- Keskiarvo ja määrä kuljettajan riville (lasketaan aina uudelleen).
create or replace function public.courier_reviews_aggregate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier uuid := coalesce(new.courier_id, old.courier_id);
begin
  update public.couriers c
  set rating_count = s.n,
      rating_sum = s.total
  from (
    select count(*)::int as n, coalesce(sum(stars), 0)::int as total
    from public.courier_reviews
    where courier_id = v_courier
  ) s
  where c.id = v_courier;
  return null;
end;
$$;

drop trigger if exists courier_reviews_aggregate on public.courier_reviews;
create trigger courier_reviews_aggregate
  after insert or update or delete on public.courier_reviews
  for each row
  execute function public.courier_reviews_aggregate();

-- "Janne Korhonen" -> "Janne K." (sama kuin tarjouksissa, 0058).
create or replace function public.courier_public_name(p_name text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(trim(
    split_part(trim(coalesce(p_name, '')), ' ', 1)
    || case when split_part(trim(coalesce(p_name, '')), ' ', 2) <> ''
         then ' ' || left(split_part(trim(p_name), ' ', 2), 1) || '.' else '' end
  ), ''), 'Kuljettaja');
$$;

-- Asiakkaan arvio toimitetusta tilauksesta.
create or replace function public.submit_courier_review(p_order_id uuid, p_stars int, p_comment text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = auth.uid();
  if v_order.id is null or v_order.courier_id is null or v_order.courier_status is distinct from 'delivered' then
    raise exception 'review_requires_delivery';
  end if;
  if p_stars is null or p_stars < 1 or p_stars > 5 then
    raise exception 'invalid_rating';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'comment_too_long';
  end if;

  insert into public.courier_reviews (order_id, courier_id, customer_id, stars, comment)
  values (v_order.id, v_order.courier_id, auth.uid(), p_stars, v_comment)
  on conflict (order_id) do update
    set stars = excluded.stars,
        comment = excluded.comment,
        updated_at = now();
  return jsonb_build_object('stars', p_stars);
end;
$$;

-- Arviointipyyntöön: kuljettaja ja asiakkaan aiempi arvio tilauksesta.
-- null, jos tilausta ei ole toimitettu kuljettajalla.
create or replace function public.courier_review_status(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'courier_name', public.courier_public_name(c.name),
    'photo_path', c.photo_path,
    'review', (
      select jsonb_build_object('stars', r.stars, 'comment', r.comment)
      from public.courier_reviews r where r.order_id = o.id
    )
  )
  from public.orders o
  join public.couriers c on c.id = o.courier_id
  where o.id = p_order_id
    and o.customer_id = auth.uid()
    and o.courier_status = 'delivered';
$$;

-- Tarjouksen kuljettajan uusimmat kirjoitetut arviot asiakkaalle (ilman
-- arvioijaa). Vain oman tilauksen tarjouksista.
create or replace function public.bid_courier_reviews(p_bid_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('stars', r.stars, 'comment', r.comment, 'created_at', r.created_at)
    order by r.created_at desc), '[]'::jsonb)
  from (
    select r.*
    from public.delivery_bids b
    join public.orders o on o.id = b.order_id and o.customer_id = auth.uid()
    join public.courier_reviews r on r.courier_id = b.courier_id
    where b.id = p_bid_id and r.comment is not null
    order by r.created_at desc
    limit 5
  ) r;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tarjoukseen kuljettajan kuva ja arvio
-- ---------------------------------------------------------------------------

alter table public.delivery_bids
  add column if not exists courier_photo_path text,
  add column if not exists courier_rating numeric(2, 1),
  add column if not exists courier_review_count int not null default 0;

create or replace function public.delivery_bids_courier_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_courier public.couriers;
begin
  select * into v_courier from public.couriers where id = new.courier_id;
  new.courier_photo_path := v_courier.photo_path;
  new.courier_review_count := coalesce(v_courier.rating_count, 0);
  new.courier_rating := case when v_courier.rating_count > 0
    then round(v_courier.rating_sum::numeric / v_courier.rating_count, 1) end;
  return new;
end;
$$;

drop trigger if exists delivery_bids_courier_profile on public.delivery_bids;
create trigger delivery_bids_courier_profile
  before insert or update on public.delivery_bids
  for each row
  execute function public.delivery_bids_courier_profile();

-- Avoimet tarjoukset ajan tasalle.
update public.delivery_bids set updated_at = updated_at where status = 'offered';

revoke all on function public.courier_set_photo(text) from public, anon;
revoke all on function public.submit_courier_review(uuid, int, text) from public, anon;
revoke all on function public.courier_review_status(uuid) from public, anon;
revoke all on function public.bid_courier_reviews(uuid) from public, anon;
grant execute on function public.courier_set_photo(text) to authenticated;
grant execute on function public.submit_courier_review(uuid, int, text) to authenticated;
grant execute on function public.courier_review_status(uuid) to authenticated;
grant execute on function public.bid_courier_reviews(uuid) to authenticated;

commit;

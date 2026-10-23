-- Ravintolan arvostelut (asiakkaan sivu: ravintolan arvosana > Arvostelut).
--
-- Arvostella voi vain asiakas, jolla on ravintolasta valmis tilaus (status
-- completed tai kuljettaja merkinnyt toimitetuksi). Yksi arvostelu per asiakas
-- ja ravintola - uusi lähetys muokkaa vanhaa. Arvostelut ovat julkisia, mutta
-- kirjoittajasta näytetään vain etunimi ja sukunimen alkukirjain eikä asiakkaan
-- tunnusta paljasteta.
--
-- Kirjoittaminen kulkee submit_restaurant_review-funktion kautta, joka tarkistaa
-- tilauksen palvelimella. Ravintolan arvosana (restaurants.rating) ja
-- arvostelujen määrä (restaurants.review_count) päivittyvät automaattisesti, eikä
-- ravintola voi muuttaa niitä itse.
--
-- Arvostelun poisto Studiossa (esim. asiaton sisältö): Table Editor >
-- restaurant_reviews > poista rivi. Arvosana päivittyy samalla.

begin;

-- ---------------------------------------------------------------------------
-- 1. Taulu
-- ---------------------------------------------------------------------------

create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  reply text check (char_length(reply) <= 500),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, customer_id)
);

comment on table public.restaurant_reviews is
  'Asiakkaiden arvostelut. Kirjoitus vain submit_restaurant_review-funktiolla (vaatii valmiin tilauksen), ks. 0054.';
comment on column public.restaurant_reviews.reply is 'Ravintolan vastaus (kumppanikojelauta, myöhemmin).';

create index if not exists restaurant_reviews_restaurant
  on public.restaurant_reviews (restaurant_id, created_at desc);

alter table public.restaurant_reviews enable row level security;

drop policy if exists "Reviews are public" on public.restaurant_reviews;
create policy "Reviews are public"
  on public.restaurant_reviews for select
  to anon, authenticated
  using (true);

-- Julkiset sarakkeet ilman asiakkaan tunnusta. Ei suoria kirjoitusoikeuksia.
revoke all on public.restaurant_reviews from anon, authenticated;
grant select (id, restaurant_id, author_name, rating, comment, reply, replied_at, created_at, updated_at)
  on public.restaurant_reviews to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Arvostelujen määrä ja keskiarvo ravintolalle
-- ---------------------------------------------------------------------------

alter table public.restaurants add column if not exists review_count integer not null default 0;

comment on column public.restaurants.review_count is
  'Arvostelujen määrä (restaurant_reviews), päivittyy automaattisesti (0054).';

create or replace function public.refresh_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid := coalesce(new.restaurant_id, old.restaurant_id);
begin
  update public.restaurants r
  set rating = stats.average,
      review_count = stats.total
  from (
    select round(avg(rating)::numeric, 1) as average, count(*)::int as total
    from public.restaurant_reviews
    where restaurant_id = v_restaurant
  ) as stats
  where r.id = v_restaurant;
  return null;
end;
$$;

drop trigger if exists restaurant_reviews_refresh_rating on public.restaurant_reviews;
create trigger restaurant_reviews_refresh_rating
  after insert or update of rating or delete on public.restaurant_reviews
  for each row
  execute function public.refresh_restaurant_rating();

-- Ravintola ei voi muuttaa omaa arvosanaansa tai arvostelujen määrää (sama
-- suoja kuin paketille, provisiolle ja sponsoroinnille, 0049 ja 0050).
create or replace function public.restaurants_protect_billing()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.plan is distinct from old.plan
          or new.commission_rate_percent is distinct from old.commission_rate_percent
          or new.featured_until is distinct from old.featured_until
          or new.rating is distinct from old.rating
          or new.review_count is distinct from old.review_count) then
    raise exception 'billing_fields_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Kirjoittaminen
-- ---------------------------------------------------------------------------

-- Onko asiakkaalla ravintolasta valmis tilaus?
create or replace function public.customer_has_completed_order(p_customer_id uuid, p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.customer_id = p_customer_id
      and o.restaurant_id = p_restaurant_id
      and (o.status = 'completed' or o.courier_status = 'delivered')
  );
$$;

-- Kirjautuneen asiakkaan tilanne arvosteluikkunaa varten: voiko arvostella ja
-- oma aiempi arvostelu (muokattavaksi).
create or replace function public.my_review_status(p_restaurant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_review public.restaurant_reviews;
begin
  if auth.uid() is null then
    return jsonb_build_object('can_review', false, 'review', null);
  end if;
  select * into v_review
  from public.restaurant_reviews
  where restaurant_id = p_restaurant_id and customer_id = auth.uid();
  return jsonb_build_object(
    'can_review', public.customer_has_completed_order(auth.uid(), p_restaurant_id),
    'review', case when v_review.id is null then null
              else jsonb_build_object('rating', v_review.rating, 'comment', v_review.comment) end
  );
end;
$$;

-- Uusi arvostelu tai oman muokkaus. Nimi "Etunimi S." asiakastiedoista.
create or replace function public.submit_restaurant_review(
  p_restaurant_id uuid,
  p_rating integer,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_author text;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_review public.restaurant_reviews;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating';
  end if;
  if char_length(v_comment) > 500 then
    raise exception 'comment_too_long';
  end if;
  if not public.customer_has_completed_order(auth.uid(), p_restaurant_id) then
    raise exception 'review_requires_order';
  end if;

  select btrim(coalesce(name, '')) into v_name from public.customers where id = auth.uid();
  if v_name is null then
    raise exception 'not_a_customer';
  end if;
  v_author := case
    when v_name = '' then 'Asiakas'
    when position(' ' in v_name) = 0 then v_name
    else split_part(v_name, ' ', 1) || ' ' || upper(left(regexp_replace(v_name, '^.*\s', ''), 1)) || '.'
  end;

  insert into public.restaurant_reviews (restaurant_id, customer_id, author_name, rating, comment)
  values (p_restaurant_id, auth.uid(), v_author, p_rating, v_comment)
  on conflict (restaurant_id, customer_id) do update
    set rating = excluded.rating,
        comment = excluded.comment,
        author_name = excluded.author_name,
        updated_at = now()
  returning * into v_review;

  return jsonb_build_object(
    'id', v_review.id,
    'author_name', v_review.author_name,
    'rating', v_review.rating,
    'comment', v_review.comment,
    'created_at', v_review.created_at,
    'updated_at', v_review.updated_at
  );
end;
$$;

revoke all on function public.refresh_restaurant_rating() from public, anon, authenticated;
revoke all on function public.customer_has_completed_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.my_review_status(uuid) from public, anon;
revoke all on function public.submit_restaurant_review(uuid, integer, text) from public, anon;
grant execute on function public.my_review_status(uuid) to authenticated;
grant execute on function public.submit_restaurant_review(uuid, integer, text) to authenticated;

commit;

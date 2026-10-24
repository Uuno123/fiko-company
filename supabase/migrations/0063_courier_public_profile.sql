-- Bidrop: kuljettajan koko profiili asiakkaalle (käyttäjän pyyntö 24.10.2026).
--
-- Kun asiakas napauttaa tarjousta, hän näkee kuljettajan profiilin: kuva, nimi
-- ("Janne K."), kulkuneuvo, tähtiarvio, arvioiden määrä ja jakauma,
-- toimitusten määrä, aloitusaika ja uusimmat kirjoitetut arviot (ilman
-- arvioijaa). Vain oman tilauksen tarjouksista. Vaatii migraation 0062.

begin;

create or replace function public.bid_courier_profile(p_bid_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name', public.courier_public_name(c.name),
    'photo_path', c.photo_path,
    'vehicle', c.vehicle,
    'since', c.created_at,
    'rating', case when c.rating_count > 0 then round(c.rating_sum::numeric / c.rating_count, 1) end,
    'review_count', c.rating_count,
    'deliveries', (
      select count(*) from public.orders d
      where d.courier_id = c.id and d.courier_status = 'delivered'
    ),
    'distribution', coalesce((
      select jsonb_object_agg(x.stars::text, x.n)
      from (
        select r.stars, count(*) as n
        from public.courier_reviews r
        where r.courier_id = c.id
        group by r.stars
      ) x
    ), '{}'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('stars', w.stars, 'comment', w.comment, 'created_at', w.created_at)
        order by w.created_at desc)
      from (
        select r.stars, r.comment, r.created_at
        from public.courier_reviews r
        where r.courier_id = c.id and r.comment is not null
        order by r.created_at desc
        limit 10
      ) w
    ), '[]'::jsonb)
  )
  from public.delivery_bids b
  join public.orders o on o.id = b.order_id and o.customer_id = auth.uid()
  join public.couriers c on c.id = b.courier_id
  where b.id = p_bid_id;
$$;

revoke all on function public.bid_courier_profile(uuid) from public, anon;
grant execute on function public.bid_courier_profile(uuid) to authenticated;

commit;

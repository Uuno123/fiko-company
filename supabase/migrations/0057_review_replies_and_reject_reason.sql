-- Kumppanikojelauta ilman esimerkkidataa: ravintola vastaa oikeisiin
-- arvosteluihin ja hylkäyksen syy tallentuu tilaukselle.
--
-- 1. reply_to_review: ravintolan omistaja voi vastata oman ravintolansa
--    arvosteluun (restaurant_reviews.reply, 0054) tai poistaa vastauksen
--    (tyhjä teksti). Asiakas näkee vastauksen arvosteluikkunassa.
-- 2. orders.cancel_reason: ravintola tallentaa hylkäyksen syyn (koodi:
--    sold_out, too_busy, closing, customer_request, other). Asiakkaan
--    ilmoitus kertoo syyn selkokielellä.

begin;

create or replace function public.reply_to_review(p_review_id uuid, p_reply text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_review public.restaurant_reviews;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if char_length(v_reply) > 500 then
    raise exception 'reply_too_long';
  end if;

  select * into v_review from public.restaurant_reviews where id = p_review_id;
  if v_review.id is null
     or not exists (
       select 1 from public.restaurant_owners ro
       where ro.restaurant_id = v_review.restaurant_id and ro.owner_id = auth.uid()
     ) then
    raise exception 'not_your_review';
  end if;

  update public.restaurant_reviews
  set reply = v_reply,
      replied_at = case when v_reply is null then null else now() end
  where id = p_review_id
  returning * into v_review;

  return jsonb_build_object('id', v_review.id, 'reply', v_review.reply, 'replied_at', v_review.replied_at);
end;
$$;

revoke all on function public.reply_to_review(uuid, text) from public, anon;
grant execute on function public.reply_to_review(uuid, text) to authenticated;

-- Omistaja saa jo päivittää oman ravintolansa tilauksen tilan (0019, 0026);
-- nyt myös hylkäyksen syyn. Asiakkaalla ei ole tilausten päivitysoikeutta.
grant update (cancel_reason) on public.orders to authenticated;

comment on column public.orders.cancel_reason is
  'Peruutuksen syy: no_courier (järjestelmä, 0046) tai ravintolan hylkäys: sold_out, too_busy, closing, customer_request, other (0057).';

commit;

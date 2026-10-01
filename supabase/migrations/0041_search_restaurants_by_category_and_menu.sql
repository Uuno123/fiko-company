-- Ravintolahaku vertasi aiemmin VAIN ravintolan nimeä. Haku "pizza" ei siis löytänyt
-- ravintolaa nimeltä "Ateenan Kebab" kategoriassa "Kebab & Pizza", eikä burgeripaikkaa
-- jonka listalla on pizza - ne näkyivät korkeintaan erillisissä ruokalajituloksissa.
--
-- Nyt ravintola tulee mukaan jos hakusana liittyy siihen mitenkään:
--   - ravintolan nimi tai kategoria (sumea + osajono, kuten ennenkin nimelle)
--   - minkä tahansa tuotteen nimi (sumea + osajono)
--   - tuotteen ruokalistaosio, kuvaus tai tagit (pelkkä osajono - pitkässä kuvauksessa
--     sumea vertailu löytäisi liikaa satunnaisia osumia)
--
-- Järjestys: nimiosuma ennen kategoriaosumaa ennen pelkkää tuoteosumaa, tasatilanteessa
-- paremmin arvioitu ensin. Paluutyyppi on sama kuin ennen, joten kutsujat (hakusivu ja
-- hakukentän ehdotusvalikko) eivät vaadi muutoksia.

create or replace function public.search_restaurants(search_term text, result_limit integer default 8)
returns setof public.restaurants
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.restaurants r
  where
    word_similarity(lower(search_term), lower(r.name)) > 0.3
    or r.name ilike '%' || search_term || '%'
    or word_similarity(lower(search_term), lower(r.category)) > 0.3
    or r.category ilike '%' || search_term || '%'
    or exists (
      select 1
      from public.menu_items mi
      where mi.restaurant_id = r.id
        and (
          word_similarity(lower(search_term), lower(mi.name)) > 0.3
          or mi.name ilike '%' || search_term || '%'
          or mi.category ilike '%' || search_term || '%'
          or mi.description ilike '%' || search_term || '%'
          or exists (select 1 from unnest(mi.tags) as tag where tag ilike '%' || search_term || '%')
        )
    )
  order by
    greatest(
      word_similarity(lower(search_term), lower(r.name)),
      word_similarity(lower(search_term), lower(r.category)) * 0.9,
      coalesce(
        (
          select max(word_similarity(lower(search_term), lower(mi.name)))
          from public.menu_items mi
          where mi.restaurant_id = r.id
        ),
        0
      ) * 0.8
    ) desc,
    r.rating desc nulls last
  limit result_limit;
$$;

grant execute on function public.search_restaurants(text, integer) to anon, authenticated;

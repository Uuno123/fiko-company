-- Tilausnumeron etuliite FIKO- -> DELIVO-. Etuliite tulee sarakkeen
-- oletusarvosta (0019), joten se jäi nimenmuutoksessa huomaamatta ja näkyi
-- yhä asiakkaalle tilauksen seurantanäkymässä.
--
-- Vain oletusarvo muuttuu: olemassa olevien tilausten numerot jäävät
-- FIKO-alkuisiksi. Ne ovat asiakkaan kuiteissa ja Stripen metadatassa, joten
-- niiden muuttaminen jälkikäteen katkaisisi viittaukset. Jos tuotannossa on
-- vain testitilauksia, ne voi nimetä uudelleen erikseen:
--
--   update public.orders
--   set order_number = 'DELIVO-' || substring(order_number from 6)
--   where order_number like 'FIKO-%';

alter table public.orders
  alter column order_number
  set default ('DELIVO-' || lpad(nextval('public.order_number_seq')::text, 4, '0'));

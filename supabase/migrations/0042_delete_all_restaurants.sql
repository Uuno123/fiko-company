-- Poistaa kaikki kahdeksan tietokannan ravintolaa käyttäjän pyynnöstä. Etusivulla,
-- haussa ja kategoriasivuilla näkyvät tästä eteenpäin vain frontendin mallit
-- (FILLER_TEMPLATES_BY_CATEGORY, lib/categories.js).
--
-- Rajattu id:llä, jotta poisto ei osu ravintolaan joka liittyy ennen kuin tämä ajetaan.
--
-- Tilaukset poistetaan ensin, koska orders.restaurant_id ei ole on delete cascade (0019).
-- Tilausrivit lähtevät tilausten mukana; ruokalistat, lisävalinnat, omistajalinkit
-- (restaurant_owners) ja asiakkaiden suosikit lähtevät ravintolan mukana cascadella.
-- Kirjautumistunnukset (auth.users) ja kumppanihakemukset jäävät: kumppanitili näkee
-- "ei kumppanitili" -ilmoituksen, kunnes sille liitetään uusi ravintola.
begin;

delete from public.orders
where restaurant_id in (
  'c735adcd-ec46-4222-bb3a-865f01277e97', -- Törnävän Kebab Pizzeria
  '986ab0df-bf51-48f9-bf82-615fdd77744c', -- Ravintola Myllynkivi
  '0b135302-d424-4518-bd9a-81e2ff008af1', -- Sushi Bar Sato
  '3e34b072-39d8-4f9a-adaa-4d9262c3e492', -- Burger Talli
  '07f6bec8-43ee-486a-9dad-83d264940e5b', -- Kahvila Kulma
  '5587665c-2dcc-4cfc-8f63-43312da3e096', -- Salaattibaari Vihreä
  'b00324cc-a408-4887-9921-3173ceeafb49', -- Trattoria Bella
  '9dfd6b11-f243-49e7-a874-7995671993ff'  -- Petosenkulman Pizzeria
);

delete from public.restaurants
where id in (
  'c735adcd-ec46-4222-bb3a-865f01277e97', -- Törnävän Kebab Pizzeria
  '986ab0df-bf51-48f9-bf82-615fdd77744c', -- Ravintola Myllynkivi
  '0b135302-d424-4518-bd9a-81e2ff008af1', -- Sushi Bar Sato
  '3e34b072-39d8-4f9a-adaa-4d9262c3e492', -- Burger Talli
  '07f6bec8-43ee-486a-9dad-83d264940e5b', -- Kahvila Kulma
  '5587665c-2dcc-4cfc-8f63-43312da3e096', -- Salaattibaari Vihreä
  'b00324cc-a408-4887-9921-3173ceeafb49', -- Trattoria Bella
  '9dfd6b11-f243-49e7-a874-7995671993ff'  -- Petosenkulman Pizzeria
);

commit;

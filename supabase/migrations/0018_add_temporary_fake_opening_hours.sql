-- Fiko: VÄLIAIKAISET keksityt aukioloajat esimerkkiravintoloille, jotta
-- fiko-e3:n RestaurantPage-näyttö on nähtävissä ennen kuin oikeat kumppanit
-- ehtivät asettaa omat aikansa dashboardilta. Käyttäjä pyysi nämä eksplisiittisesti
-- ("lisää feikit hetkellisesti"). Korvautuvat oikealla datalla kun kumppani tallentaa
-- omat aukioloaikansa PartnerDashboardista (sama sarake, ei erillistä "onko feikkiä" -lippua).
update public.restaurants set opening_hours = '{
  "mon": {"open": "10:00", "close": "22:00", "closed": false},
  "tue": {"open": "10:00", "close": "22:00", "closed": false},
  "wed": {"open": "10:00", "close": "22:00", "closed": false},
  "thu": {"open": "10:00", "close": "22:00", "closed": false},
  "fri": {"open": "10:00", "close": "23:00", "closed": false},
  "sat": {"open": "11:00", "close": "23:00", "closed": false},
  "sun": {"open": "12:00", "close": "21:00", "closed": false}
}'::jsonb where id = 'c735adcd-ec46-4222-bb3a-865f01277e97'; -- Törnävän Kebab Pizzeria

update public.restaurants set opening_hours = '{
  "mon": {"open": "10:30", "close": "20:00", "closed": false},
  "tue": {"open": "10:30", "close": "20:00", "closed": false},
  "wed": {"open": "10:30", "close": "20:00", "closed": false},
  "thu": {"open": "10:30", "close": "20:00", "closed": false},
  "fri": {"open": "10:30", "close": "20:00", "closed": false},
  "sat": {"open": "11:00", "close": "18:00", "closed": false},
  "sun": {"open": "00:00", "close": "00:00", "closed": true}
}'::jsonb where id = '986ab0df-bf51-48f9-bf82-615fdd77744c'; -- Ravintola Myllynkivi

update public.restaurants set opening_hours = '{
  "mon": {"open": "11:00", "close": "21:00", "closed": false},
  "tue": {"open": "11:00", "close": "21:00", "closed": false},
  "wed": {"open": "11:00", "close": "21:00", "closed": false},
  "thu": {"open": "11:00", "close": "21:00", "closed": false},
  "fri": {"open": "11:00", "close": "22:00", "closed": false},
  "sat": {"open": "12:00", "close": "22:00", "closed": false},
  "sun": {"open": "12:00", "close": "20:00", "closed": false}
}'::jsonb where id = '0b135302-d424-4518-bd9a-81e2ff008af1'; -- Sushi Bar Sato

update public.restaurants set opening_hours = '{
  "mon": {"open": "11:00", "close": "21:00", "closed": false},
  "tue": {"open": "11:00", "close": "21:00", "closed": false},
  "wed": {"open": "11:00", "close": "21:00", "closed": false},
  "thu": {"open": "11:00", "close": "21:00", "closed": false},
  "fri": {"open": "11:00", "close": "23:00", "closed": false},
  "sat": {"open": "11:00", "close": "23:00", "closed": false},
  "sun": {"open": "12:00", "close": "21:00", "closed": false}
}'::jsonb where id = '3e34b072-39d8-4f9a-adaa-4d9262c3e492'; -- Burger Talli

update public.restaurants set opening_hours = '{
  "mon": {"open": "07:00", "close": "17:00", "closed": false},
  "tue": {"open": "07:00", "close": "17:00", "closed": false},
  "wed": {"open": "07:00", "close": "17:00", "closed": false},
  "thu": {"open": "07:00", "close": "17:00", "closed": false},
  "fri": {"open": "07:00", "close": "17:00", "closed": false},
  "sat": {"open": "09:00", "close": "16:00", "closed": false},
  "sun": {"open": "10:00", "close": "16:00", "closed": false}
}'::jsonb where id = '07f6bec8-43ee-486a-9dad-83d264940e5b'; -- Kahvila Kulma

update public.restaurants set opening_hours = '{
  "mon": {"open": "10:30", "close": "19:00", "closed": false},
  "tue": {"open": "10:30", "close": "19:00", "closed": false},
  "wed": {"open": "10:30", "close": "19:00", "closed": false},
  "thu": {"open": "10:30", "close": "19:00", "closed": false},
  "fri": {"open": "10:30", "close": "19:00", "closed": false},
  "sat": {"open": "11:00", "close": "17:00", "closed": false},
  "sun": {"open": "00:00", "close": "00:00", "closed": true}
}'::jsonb where id = '5587665c-2dcc-4cfc-8f63-43312da3e096'; -- Salaattibaari Vihreä

update public.restaurants set opening_hours = '{
  "mon": {"open": "00:00", "close": "00:00", "closed": true},
  "tue": {"open": "11:00", "close": "21:00", "closed": false},
  "wed": {"open": "11:00", "close": "21:00", "closed": false},
  "thu": {"open": "11:00", "close": "21:00", "closed": false},
  "fri": {"open": "11:00", "close": "22:00", "closed": false},
  "sat": {"open": "12:00", "close": "22:00", "closed": false},
  "sun": {"open": "12:00", "close": "20:00", "closed": false}
}'::jsonb where id = 'b00324cc-a408-4887-9921-3173ceeafb49'; -- Trattoria Bella (maanantaisin kiinni)

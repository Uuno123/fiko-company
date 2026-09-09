-- Fiko: esimerkkidata (fiktiivisiä ravintoloita, kuopiolainen tunnelma).
-- Kiinteät UUID:t pidetään samoina kuin backend/src/data/seedRestaurants.js,
-- jotta ravintolan sivun linkit toimivat identtisesti sekä paikallisella
-- fallback-datalla että oikealla Supabase-datalla.

insert into public.restaurants (id, name, category, image_url, is_open, address, city, pickup_estimate_minutes, rating, free_delivery) values
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Törnävän Kebab Pizzeria', 'Kebab & Pizza', 'https://images.unsplash.com/photo-1633436375795-12b3b339712f?auto=format&fit=crop&w=1600&q=80', true, 'Törnäväntie 1, 70460 Kuopio', 'Kuopio', 15, 4.7, false),
  ('986ab0df-bf51-48f9-bf82-615fdd77744c', 'Ravintola Myllynkivi', 'Kotiruoka', 'https://images.unsplash.com/photo-1712594533988-13a401974b44?auto=format&fit=crop&w=1600&q=80', true, 'Myllykatu 4, 70100 Kuopio', 'Kuopio', 20, 4.8, true),
  ('0b135302-d424-4518-bd9a-81e2ff008af1', 'Sushi Bar Sato', 'Aasialainen', 'https://images.unsplash.com/photo-1564489563601-c53cfc451e93?auto=format&fit=crop&w=1600&q=80', false, 'Kauppakatu 25, 70100 Kuopio', 'Kuopio', 15, 4.6, false),
  ('3e34b072-39d8-4f9a-adaa-4d9262c3e492', 'Burger Talli', 'Burgerit', 'https://images.unsplash.com/photo-1636907229111-a8ac768fe6c9?auto=format&fit=crop&w=1600&q=80', true, 'Puijonkatu 15, 70100 Kuopio', 'Kuopio', 10, 4.5, false),
  ('07f6bec8-43ee-486a-9dad-83d264940e5b', 'Kahvila Kulma', 'Kahvila', 'https://images.unsplash.com/photo-1744638628542-12578d73179b?auto=format&fit=crop&w=1600&q=80', true, 'Kauppakatu 8, 70100 Kuopio', 'Kuopio', 8, 4.9, true),
  ('5587665c-2dcc-4cfc-8f63-43312da3e096', 'Salaattibaari Vihreä', 'Salaatit', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1600&q=80', true, 'Puistokatu 2, 70110 Kuopio', 'Kuopio', 10, 4.6, false),
  ('b00324cc-a408-4887-9921-3173ceeafb49', 'Trattoria Bella', 'Italialainen', 'https://images.unsplash.com/photo-1680405229153-a753d043c4ec?auto=format&fit=crop&w=1600&q=80', true, 'Satamakatu 5, 70100 Kuopio', 'Kuopio', 20, 4.7, true)
on conflict (id) do nothing;

insert into public.menu_items (restaurant_id, name, description, price_cents, image_url, category) values
  -- Törnävän Kebab Pizzeria: täysi esimerkkiruokalista, tyypillinen suomalainen kebab-pizzeria-valikoima.
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kebabranska', 'Ranskalaiset, kebabliha, valkosipuli- ja chilikastike', 990, null, 'Kebabateriat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kebablautanen', 'Riisi, salaatti, kebabliha ja kastikkeet', 1090, null, 'Kebabateriat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kebabrulla', 'Pitaleipään rullattu kebabannos', 890, null, 'Kebabateriat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kebabsalaatti', 'Raikas salaatti, kebabliha ja fetajuusto', 1050, null, 'Kebabateriat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kinkkupizza', 'Tomaatti, juusto, kinkku', 990, null, 'Pizzat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Amerikana', 'Tomaatti, juusto, meetvursti, pepperoni', 1090, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80', 'Pizzat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kapteeninpizza', 'Tomaatti, juusto, kinkku, katkarapu, ananas', 1190, 'https://images.unsplash.com/photo-1562835155-a7c2a225e97d?auto=format&fit=crop&w=800&q=80', 'Pizzat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kasvispizza', 'Tomaatti, juusto, paprika, sipuli, oliivi, herkkusieni', 990, 'https://images.unsplash.com/photo-1551978129-b73f45d132eb?auto=format&fit=crop&w=800&q=80', 'Pizzat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Kebabpizza', 'Tomaatti, juusto, kebabliha, sipuli, jalapeno', 1190, null, 'Pizzat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Ranskalaiset', 'Isoannos talon ranskalaisia', 450, null, 'Lisukkeet ja juomat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Valkosipulikastike', 'Talon oma resepti', 150, null, 'Lisukkeet ja juomat'),
  ('c735adcd-ec46-4222-bb3a-865f01277e97', 'Virvoitusjuoma 0,33l', 'Valikoima Coca-Cola-juomia', 350, null, 'Lisukkeet ja juomat'),

  ('986ab0df-bf51-48f9-bf82-615fdd77744c', 'Lihapullat ja muusi', 'Perunamuusi, ruskea kastike, puolukka', 1290, 'https://images.unsplash.com/photo-1712594533988-13a401974b44?auto=format&fit=crop&w=800&q=80', 'Perinneruoat'),
  ('986ab0df-bf51-48f9-bf82-615fdd77744c', 'Lohikeitto', 'Kotimaista lohta ja tilliä', 1190, 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=800&q=80', 'Perinneruoat'),
  ('986ab0df-bf51-48f9-bf82-615fdd77744c', 'Karjalanpaisti', 'Hitaasti haudutettu, keitettyjä perunoita', 1390, 'https://images.unsplash.com/photo-1689860892307-7db54ab276ba?auto=format&fit=crop&w=800&q=80', 'Perinneruoat'),

  ('0b135302-d424-4518-bd9a-81e2ff008af1', 'Lohimaki 8kpl', 'Lohi, avokado, kurkku', 990, 'https://images.unsplash.com/photo-1562436260-126d541901e0?auto=format&fit=crop&w=800&q=80', 'Sushi'),
  ('0b135302-d424-4518-bd9a-81e2ff008af1', 'California roll 8kpl', 'Surimi, avokado, kurkku, tobiko', 890, 'https://images.unsplash.com/photo-1713453018516-b08018818c0c?auto=format&fit=crop&w=800&q=80', 'Sushi'),
  ('0b135302-d424-4518-bd9a-81e2ff008af1', 'Misokeitto', 'Tofu, wakame, kevätsipuli', 550, 'https://images.unsplash.com/photo-1744116927815-a04ba6629cf3?auto=format&fit=crop&w=800&q=80', 'Keitot'),

  ('3e34b072-39d8-4f9a-adaa-4d9262c3e492', 'Fiko Cheeseburger', 'Naudanliha, cheddar, burgerikastike', 1290, 'https://images.unsplash.com/photo-1636907229111-a8ac768fe6c9?auto=format&fit=crop&w=800&q=80', 'Burgerit'),
  ('3e34b072-39d8-4f9a-adaa-4d9262c3e492', 'Bacon Burger', 'Naudanliha, pekoni, BBQ-kastike', 1390, 'https://images.unsplash.com/photo-1700835880402-434acb82fca9?auto=format&fit=crop&w=800&q=80', 'Burgerit'),
  ('3e34b072-39d8-4f9a-adaa-4d9262c3e492', 'Ranskalaiset', 'Isoannos, talon kastike', 490, 'https://images.unsplash.com/photo-1707773726979-4b87cd1c838a?auto=format&fit=crop&w=800&q=80', 'Lisukkeet'),

  ('07f6bec8-43ee-486a-9dad-83d264940e5b', 'Munkki', 'Talon tuore munkki sokerilla', 320, 'https://images.unsplash.com/photo-1535568824865-a801351e8483?auto=format&fit=crop&w=800&q=80', 'Leivonnaiset'),
  ('07f6bec8-43ee-486a-9dad-83d264940e5b', 'Voisilmäpulla', 'Perinteinen kahvipulla', 290, 'https://images.unsplash.com/photo-1522442123868-2634f4c8e8b7?auto=format&fit=crop&w=800&q=80', 'Leivonnaiset'),
  ('07f6bec8-43ee-486a-9dad-83d264940e5b', 'Cappuccino', 'Espresso ja vaahdotettu maito', 450, 'https://images.unsplash.com/photo-1720214931419-7cb11ee42c59?auto=format&fit=crop&w=800&q=80', 'Juomat'),

  ('5587665c-2dcc-4cfc-8f63-43312da3e096', 'Kana-avokadosalaatti', 'Grillikana, avokado, cherrytomaatti', 1190, 'https://images.unsplash.com/photo-1544378828-5a7e2e02c2fd?auto=format&fit=crop&w=800&q=80', 'Salaatit'),
  ('5587665c-2dcc-4cfc-8f63-43312da3e096', 'Falafelsalaatti', 'Falafel, hummus, salaatti', 1090, 'https://images.unsplash.com/photo-1768812910769-d037b90aee77?auto=format&fit=crop&w=800&q=80', 'Salaatit'),
  ('5587665c-2dcc-4cfc-8f63-43312da3e096', 'Caesarsalaatti', 'Kana, parmesan, krutongit', 1150, 'https://images.unsplash.com/photo-1556386734-4227a180d19e?auto=format&fit=crop&w=800&q=80', 'Salaatit'),

  ('b00324cc-a408-4887-9921-3173ceeafb49', 'Spagetti Bolognese', 'Naudanliha-tomaattikastike, parmesan', 1290, 'https://images.unsplash.com/photo-1680405229153-a753d043c4ec?auto=format&fit=crop&w=800&q=80', 'Pastat'),
  ('b00324cc-a408-4887-9921-3173ceeafb49', 'Lasagne', 'Uunissa paistettu, jauheliha ja bechamel', 1350, 'https://images.unsplash.com/photo-1561841224-9719c8989db2?auto=format&fit=crop&w=800&q=80', 'Pastat'),
  ('b00324cc-a408-4887-9921-3173ceeafb49', 'Margherita', 'Tomaatti, mozzarella, basilika', 1090, 'https://images.unsplash.com/photo-1664309641932-0e03e0771b97?auto=format&fit=crop&w=800&q=80', 'Pizzat')
on conflict (restaurant_id, name) do nothing;

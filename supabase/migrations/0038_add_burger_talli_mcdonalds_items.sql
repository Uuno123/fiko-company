-- Lisää Burger Tallille (id 3e34b072-39d8-4f9a-adaa-4d9262c3e492) uusia tuotteita
-- käyttäjän antaman referenssikuvan mukaisesti. image_url:t käyttäjän itse antamia
-- linkkejä (annettu yksi kerrallaan chatissa).
insert into public.menu_items (restaurant_id, name, description, price_cents, category, image_url)
values
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Maple BBQ & Bacon Double Quarter Pounder®',
    'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.',
    1265,
    'Burgerit',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca81f3ee-affb-11f1-984a-fe269514dbf4_fi3180.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Maple BBQ & Bacon Double Quarter Pounder® -ateria',
    'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.',
    1900,
    'Ateriat',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca830c16-affb-11f1-984a-fe269514dbf4_fi3181.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Maple BBQ & Bacon Quarter Pounder®',
    'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.',
    995,
    'Burgerit',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca842538-affb-11f1-984a-fe269514dbf4_fi3177.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Maple BBQ & Bacon Quarter Pounder® -ateria',
    'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.',
    1495,
    'Ateriat',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca855516-affb-11f1-984a-fe269514dbf4_fi3178.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Big Arch®',
    'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta.',
    1380,
    'Burgerit',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca871676-affb-11f1-984a-fe269514dbf4_fi3183.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Big Arch® -ateria',
    'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta. Ateriaan kuuluu ranskalaiset ja juoma.',
    1915,
    'Ateriat',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca8931a4-affb-11f1-984a-fe269514dbf4_fi3184.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Double Big Tasty® Bacon',
    'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia.',
    1380,
    'Burgerit',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c33cf9c-63c2-11f1-8c5c-724a2a819d31_fi6069.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Double Big Tasty® Bacon -ateria',
    'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia. Ateriaan kuuluu ranskalaiset ja juoma.',
    1915,
    'Ateriat',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c4aadb6-63c2-11f1-aa97-724a2a819d31_fi2800.png?w=960'
  ),
  (
    '3e34b072-39d8-4f9a-adaa-4d9262c3e492',
    'Double Quarter Pounder® with Cheese',
    'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, cheddarsulatejuustoa, tuoretta sipulia, suolakurkkua ja ketsuppia.',
    1120,
    'Burgerit',
    'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c5436d8-63c2-11f1-aa97-724a2a819d31_fi8011.png?w=960'
  )
on conflict (restaurant_id, name) do nothing;

-- Poistaa Burger Tallin kaksi alkuperäistä esimerkkituotetta, jotka on korvattu
-- oikeilla McDonald's-tuotteilla (0038). Rajattu id:llä eikä nimellä/ravintolalla,
-- jotta poisto ei osu vahingossa muihin ravintoloihin tai tuleviin samannimisiin riveihin.
delete from public.menu_items
where id in (
  '6323dff7-216d-4c58-942c-e0ff3ae0f0b1', -- Fiko Cheeseburger
  '93ef890b-f052-4642-af0f-5367f4ede37d'  -- Bacon Burger
);

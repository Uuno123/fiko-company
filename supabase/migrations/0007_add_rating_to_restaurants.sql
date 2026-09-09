-- HUOM: fiktiivinen näytearvosana - ei oikeaa arvostelu/arvostelujärjestelmää taustalla.
-- Käyttäjä hyväksyi tämän eksplisiittisesti ("lisää keksittynä").
alter table public.restaurants
  add column if not exists rating numeric(2, 1);

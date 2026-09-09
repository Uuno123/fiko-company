-- Antaa ravintolan omistajalle mahdollisuuden merkitä yksittäinen tuote tilapäisesti
-- loppuneeksi valikoimasta ilman että sitä tarvitsee poistaa ruokalistalta kokonaan.
alter table public.menu_items
  add column if not exists is_available boolean not null default true;

comment on column public.menu_items.is_available is
  'false = tuote merkitty tilapäisesti loppuneeksi valikoimasta, ei tilattavissa juuri nyt.';

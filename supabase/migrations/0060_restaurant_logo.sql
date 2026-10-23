-- delivo: ravintolan logo (käyttäjän pyyntö 22.10.2026: tilauksen seurannan
-- kuplassa ravintolan logo). Ravintola lataa logon kojelaudan asetuksista samaan
-- julkiseen restaurant-images-säiliöön kuin kansikuvan (0056). Omistajan
-- päivitysoikeus ravintolan riviin on jo olemassa (0012), eikä logo ole
-- lukittu tieto (0055), joten muuta ei tarvita.

alter table public.restaurants add column if not exists logo_url text;

comment on column public.restaurants.logo_url is
  'Ravintolan logo (neliö, julkinen URL). NULL = kuplassa näytetään kansikuva tai delivon merkki.';

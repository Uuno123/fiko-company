-- HUOM: "ilmainen kuljetus" on samoin fiktiivinen näytetieto kuin kiinteä 5,99€ kuljetusmerkintä
-- frontendissä - ei oikeaa toimitusjärjestelmää taustalla. Käyttäjä hyväksynyt tämän eksplisiittisesti.
alter table public.restaurants
  add column if not exists free_delivery boolean not null default false;

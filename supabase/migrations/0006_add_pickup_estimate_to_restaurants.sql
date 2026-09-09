-- Oikea, tietokantapohjainen nouto-arvio (minuuttia) info-riville.
-- Ei arvosanaa/aukioloaikaa/minimitilausta - niille ei ole oikeaa dataa/järjestelmää.
alter table public.restaurants
  add column if not exists pickup_estimate_minutes integer not null default 15;

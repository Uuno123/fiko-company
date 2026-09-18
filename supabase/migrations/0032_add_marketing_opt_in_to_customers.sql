-- Fiko: profiiliin lisätään oikea (ei vain UI:ssa esitetty) ilmoitusasetus. Tilausvahvistukset ja
-- -päivitykset lähetetään aina eikä niitä voi kytkeä pois, joten ainoa tässä vaiheessa tarvittava
-- kytkin on markkinointiviestien suostumus - oletus pois päältä (GDPR: ei valmiiksi rastitettu).
alter table public.customers
  add column if not exists marketing_opt_in boolean not null default false;

-- Fiko: kumppanuushakemus. Ravintola ei enää saa kirjautumistunnuksia/dashboard-pääsyä
-- suoraan rekisteröitymällä - sen sijaan hakemus tallennetaan tähän tauluun odottamaan
-- käsittelyä. Hyväksyntämekanismia (kuka hyväksyy, miten tili sen jälkeen luodaan) ei ole
-- vielä rakennettu - tämä migraatio kattaa vain hakemuksen jättämisen.
--
-- Ei auth.users-riviä, ei salasanaa: hakija ei voi kirjautua sisään ennen kuin hakemus on
-- hyväksytty ja joku (myöhemmin rakennettava prosessi) kutsuu hänet luomaan tilin - ks.
-- handle_new_restaurant_owner (0009/0014), joka jo osaa luoda ravintolan + omistuslinkin
-- atomisesti auth.users-triggerissä ja soveltuu todennäköisesti hyväksynnän jälkeiseen
-- kutsuvaiheeseen sellaisenaan.
create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null,
  legal_name text not null,
  website text,
  owner_name text not null,
  owner_phone text not null,
  owner_email text not null,
  restaurant_name text not null,
  restaurant_category text not null,
  restaurant_city text not null,
  restaurant_address text not null,
  restaurant_postal_code text not null,
  restaurant_description text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.partner_applications is
  'Kumppanuushakemukset. business_id = Y-tunnus. Ei linkkiä auth.users:iin vielä - tili luodaan vasta hyväksynnän jälkeen (prosessi rakennetaan myöhemmin).';
comment on column public.partner_applications.business_id is 'Y-tunnus (Finnish Business ID), esim. 1234567-8.';
comment on column public.partner_applications.legal_name is 'Yrityksen virallinen (rekisteröity) nimi - voi erota ravintolan asiakkaille näkyvästä nimestä.';
comment on column public.partner_applications.website is 'Valinnainen: verkkosivu tai somelinkki hakemuksen arviointia varten.';

alter table public.partner_applications enable row level security;

-- Kuka tahansa (myös kirjautumaton) saa jättää hakemuksen. Ei select/update/delete-politiikkaa
-- clientille - hakija ei näe omaa tai muiden hakemuksia, eikä voi muuttaa tilaa itse.
-- Fiko-henkilökunta käsittelee hakemukset toistaiseksi suoraan Supabase Studiosta (service role,
-- ohittaa RLS:n), ei erillistä admin-UI:ta vielä.
create policy "Anyone can submit a partner application"
  on public.partner_applications
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.partner_applications to anon, authenticated;

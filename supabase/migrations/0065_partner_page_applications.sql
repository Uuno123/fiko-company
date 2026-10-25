-- Uuden kumppanisivun (24.10.2026) lyhyet hakemukset.
--
-- 1. Ravintolat: restaurant_leads - nimi, ravintola, puhelin, sähköposti ja
--    kuukauden tilausmäärä (käyttäjän päätös: lyhyt hakemus + tilausmäärä).
--    Vanha partner_applications (0015) vaati Y-tunnuksen, osoitteen ym. heti,
--    joten lyhyt lomake tarvitsee oman taulun. Bidrop kysyy loput tiedot
--    yhteydenotossa ja tekee sopimuksen.
-- 2. Kuljettajat: driver_applications (0027) saa laskutustavan ja kielen.
--
-- Kuka tahansa (myös kirjautumaton) saa jättää hakemuksen. Lukeminen ja
-- käsittely: Supabase Studio (Table Editor), kuten muissakin hakemuksissa.

begin;

create table if not exists public.restaurant_leads (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null check (length(btrim(contact_name)) between 2 and 120),
  restaurant_name text not null check (length(btrim(restaurant_name)) between 2 and 160),
  phone text not null check (length(btrim(phone)) between 5 and 40),
  email text not null check (length(email) <= 200 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  monthly_orders text not null check (monthly_orders in ('under_100', '100_300', '300_1000', 'over_1000')),
  language text not null default 'fi' check (language in ('fi', 'en')),
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);

comment on table public.restaurant_leads is
  'Kumppanisivun lyhyet ravintolahakemukset (0065). monthly_orders: arvio tilauksista kuukaudessa. status: Bidropin käsittely (new -> contacted -> won/lost).';

alter table public.restaurant_leads enable row level security;

drop policy if exists "Anyone can submit a restaurant lead" on public.restaurant_leads;
create policy "Anyone can submit a restaurant lead"
  on public.restaurant_leads
  for insert
  to anon, authenticated
  with check (status = 'new');

-- Vain hakemuksen sisältö; tila, id ja aika tulevat oletuksista. Ei lukuoikeutta.
grant insert (contact_name, restaurant_name, phone, email, monthly_orders, language)
  on public.restaurant_leads to anon, authenticated;

alter table public.driver_applications
  add column if not exists billing_method text check (billing_method in ('own_company', 'light_entrepreneur')),
  add column if not exists language text not null default 'fi' check (language in ('fi', 'en'));

comment on column public.driver_applications.billing_method is
  'own_company = oma Y-tunnus, light_entrepreneur = kevytyrittäjä laskutuspalvelun kautta (0065).';

commit;

-- Fiko: kuljettajahakemus (/kuljettajille-sivun kiinnostuslomake). Sama malli kuin
-- partner_applications (0015) - kevyt yhteystietojen talteenotto, ei auth.users-riviä eikä
-- kirjautumista. Fikolla ei ole tässä vaiheessa mitään oikeaa kuljettajajärjestelmää
-- (ei kuskitilejä, ei kuljetusten yhdistämistä, ei kuljettajakojelautaa) - kotiinkuljetus on
-- toistaiseksi vain kosmeettinen ominaisuus ravintolakorteissa. Tämä taulu kerää vain
-- kiinnostuneiden yhteystiedot myöhempää, erikseen rakennettavaa prosessia varten.
create table if not exists public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  city text not null,
  vehicle_type text not null check (vehicle_type in ('polkupyora', 'sahkopyora', 'mopo', 'auto')),
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

comment on table public.driver_applications is
  'Kuljettajakiinnostuksen yhteystiedot /kuljettajille-sivulta. Ei linkkiä auth.users:iin - Fikolla ei ole vielä kuljettajatilejä tai -kojelautaa, tämä on vain kiinnostuneiden yhteystietojen talteenotto.';
comment on column public.driver_applications.vehicle_type is 'polkupyora, sahkopyora, mopo tai auto.';

alter table public.driver_applications enable row level security;

-- Kuka tahansa (myös kirjautumaton) saa jättää kiinnostuksensa. Ei select/update/delete-
-- politiikkaa clientille - sama malli kuin partner_applications: Fiko-henkilökunta käsittelee
-- nämä toistaiseksi suoraan Supabase Studiosta.
create policy "Anyone can submit a driver application"
  on public.driver_applications
  for insert
  to anon, authenticated
  with check (true);

grant insert on public.driver_applications to anon, authenticated;

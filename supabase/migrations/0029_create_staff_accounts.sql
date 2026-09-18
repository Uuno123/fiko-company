-- Fiko: sisäisen henkilökunnan tilit (oma admin-kojelauta - EI ravintolakumppani eikä asiakas).
-- Ei itserekisteröitymistä missään muodossa: rivi lisätään käsin (Supabase Studio / service role)
-- sen jälkeen kun henkilölle on jo olemassa auth.users-tili (esim. luotu Studiosta suoraan tai
-- kutsuttu sähköpostilla) - sama "käsin Studiosta" -malli kuin partner_applications/
-- driver_applications-hakemusten käsittelyssä (0015, 0027) tässä vaiheessa.
create table if not exists public.staff_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.staff_accounts is
  'Fikon oman henkilökunnan tilit sisäistä admin-kojelautaa varten. Ei itserekisteröitymistä - rivi lisätään käsin Supabase Studiosta. Läsnäolo tässä taulussa = pääsy /henkilokunta/dashboard-näkymään ja koko alustan dataan (ks. is_staff() ja 0030).';

alter table public.staff_accounts enable row level security;

-- Henkilökunta näkee vain oman rivinsä clientistä (StaffAuthContext tarkistaa tällä onko
-- kirjautunut käyttäjä ylipäätään henkilökuntaa) - ei koko henkilökuntalistaa clientille.
create policy "Staff can view own staff row"
  on public.staff_accounts
  for select
  to authenticated
  using (auth.uid() = id);

grant select on public.staff_accounts to authenticated;

-- Apufunktio muiden taulujen RLS-politiikoihin (0030 ym.): onko annettu auth.users-id
-- Fikon henkilökuntaa. security definer, jotta funktio voi lukea staff_accounts-taulua
-- politiikan sisältä riippumatta kutsujan omista select-oikeuksista tauluun.
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.staff_accounts where id = uid);
$$;

comment on function public.is_staff(uuid) is
  'Palauttaa true jos uid on Fikon henkilökuntaa (rivi staff_accounts-taulussa). Käytetään RLS-politiikoissa antamaan henkilökunnalle luku-/hallintaoikeus koko alustan dataan.';

grant execute on function public.is_staff(uuid) to authenticated;

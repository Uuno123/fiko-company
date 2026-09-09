-- Fiko: asiakastilit (vapaaehtoinen tili guest checkoutin rinnalle).
-- Täysin erillinen ravintoloiden/adminin datasta - tämä on kuluttajapuolen taulu.

create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now()
);

comment on table public.customers is 'Fikon asiakastilit. id = auth.users.id. Ei sisällä salasanoja, ne hoitaa Supabase Auth.';

alter table public.customers enable row level security;

-- Asiakas näkee ja muokkaa vain omaa riviään. Ei anon-pääsyä, ei pääsyä toisten tietoihin.
create policy "Customers can view own profile"
  on public.customers
  for select
  to authenticated
  using (auth.uid() = id);

create policy "Customers can update own profile"
  on public.customers
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Rivi luodaan automaattisesti kun auth.users saa uuden käyttäjän (rekisteröityminen),
-- SECURITY DEFINER-triggerillä. Tämä välttää RLS-ongelman, joka syntyisi jos frontend
-- yrittäisi itse insertoida customers-riviä ennen kuin sähköposti on vahvistettu
-- (jolloin auth.uid() ei vielä vastaa kirjautunutta sessiota).
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_customer();

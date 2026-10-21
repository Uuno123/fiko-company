-- Kuljettajan dokumentit (kuljettaja-app: Dokumentit-näkymä).
--
-- Kuljettaja kuvaa henkilökortin, ajokortin, kaupparekisteriotteen tai
-- pankkitodisteen. Kuva tallentuu yksityiseen courier-documents-säiliöön
-- polkuun <kuljettajan id>/<tyyppi>-<aikaleima>.jpg ja siitä syntyy rivi
-- courier_documents-tauluun tilassa pending. Kuljettaja ei voi poistaa eikä
-- korvata kuvia, eikä muuttaa tilaa: uusi kuva on aina uusi tarkastettava rivi.
--
-- Näin dokumentti tarkastetaan Supabase Studiossa:
--   1. Table Editor > courier_documents, suodata status = pending.
--   2. Avaa kuva: Storage > courier-documents > path-sarakkeen polku.
--   3. Vaihda status arvoon approved tai rejected. Hylätessä kirjoita syy
--      admin_note-kenttään (kuljettaja näkee sen).

create table if not exists public.courier_documents (
  id uuid primary key default gen_random_uuid(),
  courier_id uuid not null references public.couriers (id) on delete cascade,
  type text not null check (type in ('id_card', 'driving_licence', 'business_register', 'bank_proof')),
  path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

comment on table public.courier_documents is
  'Kuljettajan lähettämät dokumentit. delivo tarkastaa Studiossa vaihtamalla statuksen (ks. 0052).';

create index if not exists courier_documents_courier
  on public.courier_documents (courier_id, type, created_at desc);

alter table public.courier_documents enable row level security;

drop policy if exists "Couriers can view own documents" on public.courier_documents;
create policy "Couriers can view own documents"
  on public.courier_documents
  for select
  to authenticated
  using (courier_id = auth.uid());

drop policy if exists "Couriers can add own documents" on public.courier_documents;
create policy "Couriers can add own documents"
  on public.courier_documents
  for insert
  to authenticated
  with check (
    courier_id = auth.uid()
    and status = 'pending'
    and path like auth.uid()::text || '/%'
  );

grant select on public.courier_documents to authenticated;
grant insert (courier_id, type, path) on public.courier_documents to authenticated;

-- ---------------------------------------------------------------------------
-- Yksityinen säiliö kuville: vain kuvat, enintään 10 Mt.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('courier-documents', 'courier-documents', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Kuljettaja lisää ja lukee vain omaa kansiotaan. Poisto- ja päivitysoikeutta
-- ei ole, joten tarkastettua kuvaa ei voi vaihtaa jälkikäteen.
drop policy if exists "Couriers can upload own documents" on storage.objects;
create policy "Couriers can upload own documents"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'courier-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.couriers c where c.id = auth.uid())
  );

drop policy if exists "Couriers can read own documents" on storage.objects;
create policy "Couriers can read own documents"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'courier-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

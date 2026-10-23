-- Ravintolan kuvat suoraan laitteelta (kumppanikojelauta: kansikuva ja
-- ruokalistan tuotekuvat).
--
-- Julkinen säiliö restaurant-images: asiakkaat näkevät kuvat ilman
-- kirjautumista. Ravintola voi lisätä ja poistaa kuvia vain oman ravintolansa
-- kansioon <ravintolan id>/. Kojelauta pienentää kuvat ennen latausta
-- (enintään 1600 px, JPEG), joten ne vievät vähän tilaa.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('restaurant-images', 'restaurant-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Owners can upload restaurant images" on storage.objects;
create policy "Owners can upload restaurant images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] in (
      select ro.restaurant_id::text from public.restaurant_owners ro where ro.owner_id = auth.uid()
    )
  );

-- Lukuoikeus omaan kansioon tarvitaan poistoon (julkiset osoitteet toimivat
-- ilman sitäkin).
drop policy if exists "Owners can list restaurant images" on storage.objects;
create policy "Owners can list restaurant images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] in (
      select ro.restaurant_id::text from public.restaurant_owners ro where ro.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete restaurant images" on storage.objects;
create policy "Owners can delete restaurant images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'restaurant-images'
    and (storage.foldername(name))[1] in (
      select ro.restaurant_id::text from public.restaurant_owners ro where ro.owner_id = auth.uid()
    )
  );

commit;

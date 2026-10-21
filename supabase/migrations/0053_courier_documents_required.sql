-- Online-tilaan vain hyväksytyillä dokumenteilla (kuljettaja-app).
--
-- Kuljettaja pääsee online-tilaan (ja saa keikkatarjouksia) vasta, kun
-- delivo on hyväksynyt pakolliset dokumentit (0052):
--   - henkilökortti tai passi: aina
--   - ajokortti: kun kulkuneuvo on auto tai skootteri
--   - pankkitodiste: kun laskutustapa on oma yritys
-- Sama sääntö on appissa (kuljettaja-app/src/lib/documents.js), joka näyttää
-- puuttuvat dokumentit liukukytkimen tilalla. Tämä tarkistus palvelimella
-- estää online-tilan, vaikka appia kierrettäisiin.
--
-- Uusi kuva ei vie jo hyväksyttyä pois: riittää, että tyypille on yksi
-- hyväksytty dokumentti. Hyväksynnän voi perua Studiossa vaihtamalla sen
-- dokumentin statukseksi rejected.
--
-- Lisäksi courier_set_online ei enää vaihda kulkuneuvoa (p_vehicle):
-- kulkuneuvo on lukittu (0051) ja vaihtuu vain hyväksytyllä muutospyynnöllä.
-- Parametri jää, jotta vanhat appiversiot toimivat.

begin;

-- Pakolliset dokumentit, joista puuttuu hyväksytty kuva (tyhjä = kunnossa).
create or replace function public.courier_missing_documents(p_courier_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(required.type order by required.ord), '{}')
  from public.couriers c
  cross join lateral (
    values
      (1, 'id_card', true),
      (2, 'driving_licence', c.vehicle in ('car', 'scooter')),
      (3, 'bank_proof', c.billing_method = 'own_company')
  ) as required (ord, type, needed)
  where c.id = p_courier_id
    and required.needed
    and not exists (
      select 1 from public.courier_documents d
      where d.courier_id = c.id and d.type = required.type and d.status = 'approved'
    );
$$;

comment on function public.courier_missing_documents(uuid) is
  'Kuljettajan pakolliset dokumentit ilman hyväksyntää. Tyhjä taulukko = saa mennä online-tilaan (0053).';

create or replace function public.courier_set_online(
  p_online boolean,
  p_lat double precision default null,
  p_lng double precision default null,
  p_vehicle text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.courier_offers;
  v_missing text[];
begin
  if not exists (select 1 from public.couriers where id = auth.uid()) then
    raise exception 'not_a_courier';
  end if;

  if p_online then
    v_missing := public.courier_missing_documents(auth.uid());
    if cardinality(v_missing) > 0 then
      raise exception 'documents_not_approved'
        using detail = array_to_string(v_missing, ',');
    end if;
  end if;

  if p_lat is not null and p_lng is not null then
    insert into public.courier_locations (courier_id, lat, lng, updated_at)
    values (auth.uid(), p_lat, p_lng, now())
    on conflict (courier_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = excluded.updated_at;
  end if;

  update public.couriers
  set online = p_online,
      online_since = case when p_online then coalesce(online_since, now()) else null end,
      missed_offers = case when p_online then 0 else missed_offers end
  where id = auth.uid();

  if not p_online then
    for v_offer in
      update public.courier_offers
      set status = 'withdrawn', responded_at = now()
      where courier_id = auth.uid() and status = 'pending'
      returning *
    loop
      perform public.dispatch_order(v_offer.order_id);
    end loop;
  end if;

  return jsonb_build_object('online', p_online);
end;
$$;

-- Vain palvelimen funktioiden käyttöön (kuljettaja näkee omat dokumenttinsa
-- muutenkin, 0052).
revoke all on function public.courier_missing_documents(uuid) from public, anon, authenticated;

-- Nyt online-tilassa olevat, joilta dokumentit puuttuvat, offline-tilaan.
update public.couriers
set online = false, online_since = null
where online and cardinality(public.courier_missing_documents(id)) > 0;

commit;

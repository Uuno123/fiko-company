-- Fiko: tuotteiden valintaryhmät (esim. koko/pohjavalinta, täytteet) hinta-lisineen.
-- Kumppani määrittelee nämä PartnerDashboard.jsx:n ruokalistan tuotemuokkausnäkymässä.
-- Asiakkaan valinta tilausta tehdessä (Cart/checkout) on erillinen, myöhemmin rakennettava
-- kokonaisuus - tämä migraatio kattaa vain tietomallin ja kumppanin hallinnan.
create table if not exists public.menu_item_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  name text not null,
  selection_type text not null default 'single' check (selection_type in ('single', 'multi')),
  min_selections int not null default 0,
  max_selections int,
  free_selections int not null default 0,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.menu_item_option_groups is
  'Tuotteen valintaryhmät (esim. "Koko", "Omat täytteet"). selection_type: single = yksi valittavissa (esim. koko), multi = useita valittavissa (esim. täytteet).';
comment on column public.menu_item_option_groups.max_selections is 'NULL = rajaton määrä valittavissa.';
comment on column public.menu_item_option_groups.free_selections is
  'Kuinka monta valittua vaihtoehtoa on ilmaisia (esim. "ensimmäiset 2 ilmaisia") - tarkka hinnoittelulogiikka (mitkä valinnat lasketaan ilmaisiksi) toteutetaan tilauksen teko-/ostoskorilogiikassa, ei tässä.';

create table if not exists public.menu_item_options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.menu_item_option_groups (id) on delete cascade,
  name text not null,
  price_delta_cents int not null default 0,
  is_default boolean not null default false,
  display_order int not null default 0
);

comment on table public.menu_item_options is 'Yksittäiset valittavat vaihtoehdot valintaryhmän sisällä, hintalisineen.';

create index if not exists menu_item_option_groups_menu_item_id_idx on public.menu_item_option_groups (menu_item_id);
create index if not exists menu_item_options_group_id_idx on public.menu_item_options (group_id);

alter table public.menu_item_option_groups enable row level security;
alter table public.menu_item_options enable row level security;

-- Kaikki (myös kirjautumattomat) saavat lukea valintaryhmät/-vaihtoehdot - samat oikeudet
-- kuin menu_items-taululla, koska asiakkaan pitää nähdä nämä tilausta tehdessä.
create policy "Anyone can view option groups"
  on public.menu_item_option_groups
  for select
  to anon, authenticated
  using (true);

create policy "Anyone can view options"
  on public.menu_item_options
  for select
  to anon, authenticated
  using (true);

-- Kumppani saa hallita vain omistamansa ravintolan tuotteiden valintaryhmiä/-vaihtoehtoja,
-- sama omistuskaava kuin menu_items-policyissa (0009).
create policy "Owners can manage own option groups"
  on public.menu_item_option_groups
  for all
  to authenticated
  using (
    exists (
      select 1 from public.menu_items mi
      join public.restaurant_owners ro on ro.restaurant_id = mi.restaurant_id
      where mi.id = menu_item_option_groups.menu_item_id
        and ro.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.menu_items mi
      join public.restaurant_owners ro on ro.restaurant_id = mi.restaurant_id
      where mi.id = menu_item_option_groups.menu_item_id
        and ro.owner_id = auth.uid()
    )
  );

create policy "Owners can manage own options"
  on public.menu_item_options
  for all
  to authenticated
  using (
    exists (
      select 1 from public.menu_item_option_groups g
      join public.menu_items mi on mi.id = g.menu_item_id
      join public.restaurant_owners ro on ro.restaurant_id = mi.restaurant_id
      where g.id = menu_item_options.group_id
        and ro.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.menu_item_option_groups g
      join public.menu_items mi on mi.id = g.menu_item_id
      join public.restaurant_owners ro on ro.restaurant_id = mi.restaurant_id
      where g.id = menu_item_options.group_id
        and ro.owner_id = auth.uid()
    )
  );

grant select on public.menu_item_option_groups to anon, authenticated;
grant insert, update, delete on public.menu_item_option_groups to authenticated;
grant select on public.menu_item_options to anon, authenticated;
grant insert, update, delete on public.menu_item_options to authenticated;

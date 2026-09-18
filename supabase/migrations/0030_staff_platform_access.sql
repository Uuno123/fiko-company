-- Fiko: henkilökunnan pääsy koko alustan dataan sisäistä admin-kojelautaa varten.
-- Owner-/customer-politiikat (0009, 0019) rajaavat näkyvyyden aina oman ravintolan tai oman
-- tilin dataan - henkilökunta tarvitsee näkyvyyden KAIKKIIN ravintoloihin/tilauksiin kerralla
-- (kokonaiskuva, tilastot), sekä oikeuden käsitellä kumppanuus-/kuljettajahakemuksia, jotka
-- eivät tähän asti näkyneet clientille ollenkaan (ks. 0015, 0027 - "Fiko-henkilökunta käsittelee
-- nämä toistaiseksi suoraan Supabase Studiosta"). Käyttää 0029:n is_staff()-apufunktiota.
--
-- Tilausten status-kenttää EI avata henkilökunnalle tässä migraatiossa - se pysyy ravintolan
-- omistajan hallinnassa (0019/0026); henkilökunnalla on vain luku-/seurantaoikeus tilauksiin.

create policy "Staff can view all orders"
  on public.orders
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy "Staff can view all order items"
  on public.order_items
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

-- Kumppanuushakemukset: henkilökunta näkee kaikki ja voi merkitä ne hyväksytyksi/hylätyksi.
-- Huom: hyväksyntä päivittää tässä vaiheessa vain status-sarakkeen - varsinaisen
-- ravintola+omistajatilin luonti (ks. 0015:n kommentti handle_new_restaurant_owner-triggeristä)
-- on yhä erikseen rakennettava, service role -tason prosessi.
create policy "Staff can view partner applications"
  on public.partner_applications
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy "Staff can update partner applications"
  on public.partner_applications
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

grant select, update (status) on public.partner_applications to authenticated;

-- Kuljettajahakemukset (kiinnostuneiden kuskien yhteystiedot, ks. 0027 - ei vielä oikeaa
-- kuljettajajärjestelmää): sama malli kuin kumppanuushakemuksille.
create policy "Staff can view driver applications"
  on public.driver_applications
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy "Staff can update driver applications"
  on public.driver_applications
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

grant select, update (status) on public.driver_applications to authenticated;

-- Ravintolat: "update on public.restaurants to authenticated" on jo myönnetty kokonaisuudessaan
-- (0012), rajattuna tähän asti pelkästään omistaja-politiikalla (0009) - tämä lisää
-- rinnakkaisen (permissive) politiikan, joka päästää henkilökunnan tekemään saman esim.
-- auki/kiinni-tilan hätäkorjaukseen tai palkkioprosentin (commission_rate_percent) säätöön
-- ilman että omistajan omaa oikeutta pitää laajentaa.
create policy "Staff can update restaurants"
  on public.restaurants
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

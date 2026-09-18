-- Fiko: ravintolan välityspalkkioprosentti (näytetään omistajan kojelaudan Talous-välilehdellä).
-- Vastaa PartnerLanding.jsx:n hinnoittelua: Peruspaketti = 15 %, Pro = 8 %. Ei vielä
-- subscription-taulua joka seuraisi kumpaa pakettia ravintola käyttää - Fiko-henkilökunta
-- säätää arvon manuaalisesti Supabase Studiosta kun kumppani vaihtaa pakettia, samaan tapaan
-- kuin partner_applications-hyväksyntä hoidetaan (ks. 0015).
alter table public.restaurants
  add column if not exists commission_rate_percent numeric(4, 2) not null default 15.00;

comment on column public.restaurants.commission_rate_percent is
  'Fikon välityspalkkio prosentteina tilauksen summasta. 15.00 = Peruspaketti (oletus), 8.00 = Pro.';

grant select on public.restaurants to anon, authenticated;

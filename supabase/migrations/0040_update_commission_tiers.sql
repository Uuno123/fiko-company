-- Uusi hinnoittelu (PartnerLanding.jsx): Peruspaketti 49,99 €/kk + 25 %, Pro 79,99 €/kk + 10 %,
-- Business 169,99 €/kk + 0 %. Oletus vastaa halvinta pakettia, kuten ennenkin.
--
-- Olemassa olevien ravintoloiden arvoihin ei kosketa: niille on sovittu vanhat ehdot, ja
-- henkilökunta päivittää ne käsin Supabase Studiosta kuten ennenkin (ks. 0020).
alter table public.restaurants
  alter column commission_rate_percent set default 25.00;

comment on column public.restaurants.commission_rate_percent is
  'Välityspalkkio prosentteina tilauksen summasta. 25.00 = Peruspaketti (oletus), 10.00 = Pro, 0.00 = Business.';

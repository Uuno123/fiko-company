-- Ravintolan dashboard (PartnerDashboard.jsx) tilaa postgres_changes-tapahtumia orders-taulusta
-- jotta uudet tilaukset ilmestyvät automaattisesti ilman sivun päivitystä. Supabase Realtime
-- lähettää postgres_changes-tapahtumia vain tauluille jotka on lisätty supabase_realtime-julkaisuun
-- - ilman tätä koodi on oikein mutta mitään ei koskaan saavu.

alter publication supabase_realtime add table public.orders;

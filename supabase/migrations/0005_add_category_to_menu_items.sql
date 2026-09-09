-- Ryhmittelee ruokalistan Wolt-tyyliseen tapaan otsikoiduiksi osioiksi (esim. "Pizzat", "Kebabateriat").
alter table public.menu_items
  add column if not exists category text not null default 'Ruokalista';

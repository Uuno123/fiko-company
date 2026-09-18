-- Fiko: order_items tarvitsee paikan tallentaa valitut lisäoptiot (koko/täytteet, ks. migraatio
-- 0022 menu_item_option_groups/menu_item_options) ja niiden vaikutuksesta lasketun yksikköhinnan.
-- Snapshot tilaushetkeltä - ei viittaa menu_item_options-riveihin, koska ravintola voi myöhemmin
-- muuttaa tai poistaa vaihtoehtoja eikä vanhojen tilausten pidä muuttua sen mukana.

alter table public.order_items
  add column if not exists unit_price_cents int,
  add column if not exists selected_options jsonb not null default '[]'::jsonb;

comment on column public.order_items.unit_price_cents is
  'Tilausrivin yksikköhinta (perushinta + valittujen optioiden hintalisät) tilaushetkellä. NULL ennen tätä migraatiota tehdyillä riveillä - käytä price_cents fallbackina.';
comment on column public.order_items.selected_options is
  'Tilaushetken snapshot valituista vaihtoehdoista: [{"groupName": "Koko", "name": "Iso", "priceDeltaCents": 200}, ...]. Tyhjä taulukko jos tuotteella ei ollut valintoja.';

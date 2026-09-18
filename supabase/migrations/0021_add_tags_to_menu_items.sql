-- Fiko: rakenteiset ainesosa-/tagimerkinnät ruokalistan tuotteille. Kumppani valitsee
-- tuotteelle tageja ennalta määritellystä listasta kojelaudalla (PartnerDashboard.jsx) sen
-- sijaan että kirjoittaisi ne käsin - vapaamuotoinen description-kenttä säilyy ennallaan
-- rinnalla, tätä ei poisteta.
alter table public.menu_items
  add column if not exists tags text[] not null default '{}';

comment on column public.menu_items.tags is
  'Ainesosa-/ominaisuustagit (esim. "Pihvi", "Sipuli", "Gluteeniton"). Vapaamuotoisia merkkijonoja, ei viittausta erilliseen tagitauluun - kumppani voi lisätä myös omia tageja ennalta määritellyn listan lisäksi.';

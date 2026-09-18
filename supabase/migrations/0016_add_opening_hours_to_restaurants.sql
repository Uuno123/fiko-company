-- Fiko: viikoittaiset aukioloajat. restaurants.is_open on jo (auki/kiinni juuri nyt -kytkin,
-- ravintola vaihtaa itse) - tämä lisää varsinaisen "avoinna klo X-Y" -aikataulun sen rinnalle.
-- Kumppani muokkaa tätä kojelaudalta (PartnerDashboard.jsx), julkinen puoli lukee tätä
-- RestaurantPage.jsx:ssä näyttääkseen oikeat aukioloajat asiakkaalle.
--
-- Muoto: jsonb-objekti viikonpäivittäin, avaimet ma/englanninkielisiä lyhenteitä (mon..sun),
-- jotta avaimet pysyvät yksiselitteisinä koodissa. Jokainen päivä: {"open": "11:00", "close": "21:00", "closed": false}.
-- NULL = aukioloaikoja ei ole vielä asetettu, jolloin näytetään vain is_open-tila kuten ennenkin.
alter table public.restaurants
  add column if not exists opening_hours jsonb;

comment on column public.restaurants.opening_hours is
  'Viikoittainen aukiolo per päivä, esim. {"mon": {"open": "11:00", "close": "21:00", "closed": false}, "tue": ..., ...}. Avaimet: mon,tue,wed,thu,fri,sat,sun. NULL = ei asetettu.';

-- Fiko: karkeat sijaintikoordinaatit ravintoloille, jotta ostoskorin kartta
-- (ravintola + toimitusosoite + reitti/ETA) voi piirtää ravintolan sijainnin.
-- Nämä ovat likimääräisiä, käsin valittuja koordinaatteja demo-ravintoloiden
-- osoitteiden mukaisella alueella Kuopiossa - ei tarkkaa geokoodausta.
alter table public.restaurants
  add column if not exists lat numeric(9, 6),
  add column if not exists lng numeric(9, 6);

comment on column public.restaurants.lat is 'Likimääräinen leveysaste (demo-data, ei tarkkaa geokoodausta).';
comment on column public.restaurants.lng is 'Likimääräinen pituusaste (demo-data, ei tarkkaa geokoodausta).';

update public.restaurants set lat = 62.870961, lng = 27.686987 where id = 'c735adcd-ec46-4222-bb3a-865f01277e97';
update public.restaurants set lat = 62.889012, lng = 27.680015 where id = '986ab0df-bf51-48f9-bf82-615fdd77744c';
update public.restaurants set lat = 62.892980, lng = 27.678463 where id = '0b135302-d424-4518-bd9a-81e2ff008af1';
update public.restaurants set lat = 62.894527, lng = 27.675981 where id = '3e34b072-39d8-4f9a-adaa-4d9262c3e492';
update public.restaurants set lat = 62.892014, lng = 27.679012 where id = '07f6bec8-43ee-486a-9dad-83d264940e5b';
update public.restaurants set lat = 62.895967, lng = 27.671984 where id = '5587665c-2dcc-4cfc-8f63-43312da3e096';
update public.restaurants set lat = 62.897498, lng = 27.684972 where id = 'b00324cc-a408-4887-9921-3173ceeafb49';

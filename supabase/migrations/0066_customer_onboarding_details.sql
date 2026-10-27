-- Bidrop: rekisteröitymisen lisätiedot (käyttäjän pyyntö 27.10.2026).
-- Ensimmäinen vaihe kysyy nimen, puhelimen ja syntymäajan, erillinen
-- osoitesivu asunnon tyypin, tarkan osoitteen ja ohjeet kuljettajalle, kuten
-- Woltissa. Kaikki sarakkeet ovat vapaaehtoisia, koska vanhoilla asiakkailla
-- niitä ei vielä ole. Kassa esitäyttää porras/asunto- ja ohjekentät näistä.
--
-- Syntymäaika eikä ikä: ikä vanhenisi, syntymäajasta se lasketaan aina oikein.
-- address (teksti) on jo olemassa (0013); koordinaatit tallennetaan nyt sen
-- rinnalle, jottei osoitetta tarvitse paikantaa kassalla uudelleen.
-- address_details: tyyppikohtaiset kentät { staircase, floor, apartment,
-- doorCode, company } - jsonb, koska kentät riippuvat asunnon tyypistä.

alter table public.customers
  add column if not exists birth_date date,
  add column if not exists address_type text,
  add column if not exists address_lat double precision,
  add column if not exists address_lng double precision,
  add column if not exists address_details jsonb not null default '{}'::jsonb,
  add column if not exists courier_instructions text;

alter table public.customers
  drop constraint if exists customers_birth_date_check,
  add constraint customers_birth_date_check
    check (birth_date is null or birth_date between date '1900-01-01' and date '2100-01-01'),
  drop constraint if exists customers_address_type_check,
  add constraint customers_address_type_check
    check (address_type is null or address_type in ('apartment', 'terraced', 'house', 'office', 'other')),
  drop constraint if exists customers_address_coords_check,
  add constraint customers_address_coords_check
    -- Molemmat tai ei kumpaakaan. "is not null" erikseen, koska null-vertailu
    -- antaisi CHECKille tuloksen null, joka päästää rivin läpi.
    check (
      (address_lat is null and address_lng is null)
      or (
        address_lat is not null and address_lng is not null
        and address_lat between -90 and 90 and address_lng between -180 and 180
      )
    ),
  drop constraint if exists customers_address_details_check,
  add constraint customers_address_details_check
    check (jsonb_typeof(address_details) = 'object' and pg_column_size(address_details) <= 2000),
  drop constraint if exists customers_courier_instructions_check,
  add constraint customers_courier_instructions_check
    check (courier_instructions is null or char_length(courier_instructions) <= 300);

comment on column public.customers.birth_date is 'Syntymäaika (rekisteröityminen). Ikä lasketaan tästä.';
comment on column public.customers.address_type is 'Asunnon tyyppi: apartment = kerrostalo, terraced = rivitalo, house = omakotitalo, office = toimisto, other = muu.';
comment on column public.customers.address_details is 'Tyyppikohtaiset osoitetiedot: { staircase, floor, apartment, doorCode, company }.';
comment on column public.customers.courier_instructions is 'Asiakkaan pysyvät ohjeet kuljettajalle (enintään 300 merkkiä).';

-- Oikeudet: authenticated-roolilla on jo select ja update koko tauluun (0012),
-- ja RLS sallii vain oman rivin (0002), joten uudet sarakkeet eivät tarvitse
-- omia sääntöjä.

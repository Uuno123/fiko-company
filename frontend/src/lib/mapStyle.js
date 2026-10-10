// delivon karttatyyli: OpenFreeMapin Positron uudelleen väritettynä.
// Sellaisenaan Positron on harmaa ja haalea (käyttäjästä ruma), joten pohja
// vaihdetaan neutraalin vaaleaksi ilman kellertävää sävyä, vesi siniseksi,
// puistot ja metsät vihreiksi ja tiet valkoisiksi ohuin reunaviivoin - samaa
// linjaa kuin Woltin ja Uber Eatsin kartoissa. Värit vaihdetaan tyylin
// JSONiin ennen kuin kartta piirtää mitään (mapView.js: setStyle +
// transformStyle), joten harmaa versio ei välähdä ruudulla.

const COLORS = {
  land: '#f2f3f5',
  residential: '#eef0f3',
  building: '#e8eaee',
  buildingOutline: '#dde0e5',
  park: '#cde8bf',
  wood: '#d7eccc',
  water: '#a9d4f3',
  road: '#ffffff',
  roadCasing: '#d7dbe1',
  rail: '#d3d7dd',
  placeLabel: '#2f343a',
  districtLabel: '#5b6169',
  roadLabel: '#646a72',
  waterLabel: '#3b79a8',
}

const PAINT = {
  background: { 'background-color': COLORS.land },
  road_area_pier: { 'fill-color': COLORS.land },
  road_pier: { 'line-color': COLORS.land },
  park: { 'fill-color': COLORS.park },
  landcover_wood: { 'fill-color': COLORS.wood },
  landuse_residential: { 'fill-color': COLORS.residential },
  water: { 'fill-color': COLORS.water },
  waterway: { 'line-color': COLORS.water },
  building: { 'fill-color': COLORS.building, 'fill-outline-color': COLORS.buildingOutline },
  highway_path: { 'line-color': COLORS.road, 'line-opacity': 0.75 },
  highway_minor: { 'line-color': COLORS.road, 'line-opacity': 1 },
  highway_major_casing: { 'line-color': COLORS.roadCasing },
  highway_motorway_casing: { 'line-color': COLORS.roadCasing },
  highway_motorway_bridge_casing: { 'line-color': COLORS.roadCasing },
  tunnel_motorway_casing: { 'line-color': COLORS.roadCasing },
  railway: { 'line-color': COLORS.rail },
  railway_service: { 'line-color': COLORS.rail },
  railway_transit: { 'line-color': COLORS.rail },
  label_other: { 'text-color': COLORS.districtLabel },
  label_village: { 'text-color': COLORS.placeLabel },
  label_town: { 'text-color': COLORS.placeLabel },
  label_city: { 'text-color': COLORS.placeLabel },
  label_city_capital: { 'text-color': COLORS.placeLabel },
  'highway-name-path': { 'text-color': COLORS.roadLabel, 'text-halo-color': COLORS.road },
  'highway-name-minor': { 'text-color': COLORS.roadLabel, 'text-halo-color': COLORS.road },
  'highway-name-major': { 'text-color': COLORS.roadLabel, 'text-halo-color': COLORS.road },
  water_name_point_label: { 'text-color': COLORS.waterLabel },
  water_name_line_label: { 'text-color': COLORS.waterLabel },
  waterway_line_label: { 'text-color': COLORS.waterLabel },
}

// Nimet suomeksi: Positron näyttää ensisijaisesti englanninkielisen nimen
// (name_en), jolloin esim. maat ja merialueet olisivat englanniksi.
const FINNISH_NAME = ['coalesce', ['get', 'name:fi'], ['get', 'name:latin'], ['get', 'name']]

// Positronissa pienillä kaduilla ei ole reunaviivaa, jolloin valkoinen katu
// hukkuu vaaleaan pohjaan. Lisätään sen alle hieman leveämpi harmaa viiva -
// pienillä zoomeilla yhtä leveä, ettei kaupungin yleiskuva tummu.
function minorRoadCasing(minorRoad) {
  return {
    ...minorRoad,
    id: 'delivo_minor_casing',
    paint: {
      'line-color': COLORS.roadCasing,
      'line-width': ['interpolate', ['exponential', 1.55], ['zoom'], 12, 1.8, 13, 3, 20, 24],
    },
  }
}

// Tienumerot (9, 5555 ...) ovat ruoan toimituksessa pelkkää kohinaa.
const HIDDEN = new Set(['highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us'])

// Kaupungin ja kylän nimi katutasolla jäi keskelle karttaa (seurannassa
// kohteen päälle) - lähellä riittävät kaupunginosien ja katujen nimet.
const PLACE_LABEL_MAX_ZOOM = 14
const PLACE_LABELS = new Set(['label_village', 'label_town', 'label_city', 'label_city_capital'])

export function tuneMapStyle(style) {
  const layers = []
  for (const layer of style.layers) {
    if (HIDDEN.has(layer.id)) continue
    const paint = PAINT[layer.id]
    const next = paint ? { ...layer, paint: { ...layer.paint, ...paint } } : { ...layer }
    if (JSON.stringify(layer.layout?.['text-field'] ?? '').includes('name_en')) {
      next.layout = { ...layer.layout, 'text-field': FINNISH_NAME }
    }
    if (PLACE_LABELS.has(layer.id)) next.maxzoom = Math.min(layer.maxzoom ?? 24, PLACE_LABEL_MAX_ZOOM)
    if (layer.id === 'highway_minor') layers.push(minorRoadCasing(layer))
    layers.push(next)
  }
  return { ...style, layers }
}

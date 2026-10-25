import { useEffect, useState } from 'react'
import { tuneMapStyle } from '../../../frontend/src/lib/mapStyle'
import { tr } from './i18n'

// Kartta piirretään WebView'n sisällä MapLibrellä samalla OpenFreeMap-pohjalla
// ja delivon väreillä kuin verkkosivulla: ilmainen, ei avainta eikä laskua, ja
// toimii Expo Gossa sekä iPhonella että Androidilla ilman omaa käännöstä.
//
// Kartan HTML ladataan vain kerran. Myöhemmät muutokset (haalistus, oma
// sijainti, keikan reitti, palkkien peittämät reunat) välitetään sivun window.delivoSync-funktiolle (MapView:
// injectJavaScript / iframe), koska HTML:n vaihtaminen lataisi kartan alusta.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const MAPLIBRE_URL = 'https://unpkg.com/maplibre-gl@5.24.0/dist'
export const LAND_COLOR = '#f2f3f5'

export const KUOPIO = { lat: 62.8924, lng: 27.677 }

// Kartan nappien ruudunlukijatekstit valitulla kielellä.
function mapLocale() {
  return {
    'Map.Title': tr('common.map'),
    'NavigationControl.ZoomIn': tr('map.zoomIn'),
    'NavigationControl.ZoomOut': tr('map.zoomOut'),
    'AttributionControl.ToggleAttribution': tr('map.attribution'),
  }
}

// Tyyli haetaan ja väritetään kerran, ja sama tulos käy kaikille kartoille.
let stylePromise = null

function loadStyle() {
  stylePromise ??= fetch(STYLE_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Karttatyylin haku epäonnistui (${response.status})`)
      return response.json()
    })
    .then(tuneMapStyle)
    .catch((err) => {
      stylePromise = null
      throw err
    })
  return stylePromise
}

// JSON <script>-tagin sisään: "<" escapetaan, ettei mikään merkkijono voi
// sulkea tagia kesken.
function inlineJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

function buildMapHtml(style, { center, zoom, dimmed, interactive }) {
  const options = {
    container: 'map',
    style,
    center: [center.lng, center.lat],
    zoom,
    maxZoom: 18,
    interactive,
    // Kartta pysyy pohjoinen ylöspäin: ei kiertoa eikä kallistusta.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    attributionControl: false,
    locale: mapLocale(),
  }
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE_URL}/maplibre-gl.css">
<script src="${MAPLIBRE_URL}/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; width: 100%; height: 100%; background: ${LAND_COLOR}; }
  body { overflow: hidden; -webkit-tap-highlight-color: transparent; }
  .maplibregl-canvas { transition: filter 0.4s ease; }
  /* Tekijätietonappi seuraa yläpalkin alareunaa (ks. delivoSync). */
  .maplibregl-ctrl-top-right { transition: top 0.26s ease; }
  /* Offline-tilassa kartta haalistuu harmaaksi kuten Woltissa. */
  body.dimmed .maplibregl-canvas { filter: grayscale(1) opacity(0.7); }
  /* Kuljettajan oma sijainti: sininen piste kuten puhelimen kartoissa. */
  .me {
    width: 20px; height: 20px; box-sizing: border-box; border-radius: 50%;
    background: #2f80ed; border: 3px solid #fff;
    box-shadow: 0 0 0 9px rgba(47, 128, 237, 0.18), 0 1px 4px rgba(0, 0, 0, 0.35);
  }
  /* Keikan reitti: ravintola mustana ja asiakas oranssina merkkinä kuvakkeineen. */
  .pin {
    display: flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; box-sizing: border-box; border-radius: 50%;
    border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .pin svg { width: 16px; height: 16px; }
  .pin--from { background: #14150f; }
  .pin--to { background: #f4501e; }
</style>
</head>
<body class="${dimmed ? 'dimmed' : ''}">
<div id="map"></div>
<script>
  const map = new maplibregl.Map(${inlineJson(options)});
  map.touchZoomRotate.disableRotation();
  // Tekijätiedot (OpenFreeMap, OpenMapTiles, OpenStreetMap) ovat lisenssiehto.
  // Yläkulmassa ne eivät jää alapaneelin alle.
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');
  // Tiivis tekijätietonappi alkaa auki ja peittäisi osan kartasta.
  const collapse = () => document.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact')?.classList.remove('maplibregl-compact-show');
  map.once('load', collapse);
  map.once('idle', collapse);
  window.delivoMap = map;

  // Keikan reitti { start?, from, to }: harmaa katkoviiva kuljettajalta (start)
  // ravintolaan (from) ja musta ravintolasta asiakkaalle (to). Viivat ovat
  // karttatyylin tasoja, joten ne voi lisätä vasta kun tyyli on ladattu.
  const ICONS = {
    from: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    to: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  };
  // Pisteet ilman koordinaatteja (esim. osoite, jota ei ole paikannettu) ohitetaan.
  const valid = (point) => Boolean(point) && Number.isFinite(point.lat) && Number.isFinite(point.lng);
  const LINES = [
    { id: 'route-approach', color: '#8b9099', width: 3, opacity: 0.9, dash: [1.2, 1.8], points: (r) => (valid(r.start) && valid(r.from) ? [r.start, r.from] : null) },
    { id: 'route', color: '#14150f', width: 3.5, opacity: 0.75, dash: [2, 2.2], points: (r) => (valid(r.from) && valid(r.to) ? [r.from, r.to] : null) },
  ];
  let styleReady = false;
  let route = null;
  let routeKey = null;
  let routePins = [];
  function pin(point, kind) {
    const element = document.createElement('div');
    element.className = 'pin pin--' + kind;
    element.innerHTML = ICONS[kind];
    return new maplibregl.Marker({ element }).setLngLat([point.lng, point.lat]).addTo(map);
  }
  function drawRouteLines() {
    LINES.forEach((line) => {
      if (map.getLayer(line.id)) map.removeLayer(line.id);
      if (map.getSource(line.id)) map.removeSource(line.id);
      const points = route && line.points(route);
      if (!points) return;
      map.addSource(line.id, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) } },
      });
      map.addLayer({
        id: line.id,
        type: 'line',
        source: line.id,
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': line.color, 'line-width': line.width, 'line-opacity': line.opacity, 'line-dasharray': line.dash },
      });
    });
  }
  map.once('load', () => {
    styleReady = true;
    drawRouteLines();
  });
  // Palauttaa true jos reitti vaihtui.
  function setRoute(nextRoute) {
    const key = nextRoute ? JSON.stringify(nextRoute) : null;
    if (key === routeKey) return false;
    routeKey = key;
    route = nextRoute;
    routePins.forEach((marker) => marker.remove());
    routePins = route ? [valid(route.from) && pin(route.from, 'from'), valid(route.to) && pin(route.to, 'to')].filter(Boolean) : [];
    if (styleReady) drawRouteLines();
    return true;
  }
  // Koko reitti näkyviin palkkien väliin (fitBounds lisää marginaalin kartan
  // padding-arvon päälle).
  function fitRoute(animate) {
    const points = [route.from, route.to, route.start].filter(valid);
    if (!points.length) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 15, duration: animate ? 500 : 0 });
      return;
    }
    const bounds = new maplibregl.LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]);
    points.forEach((p) => bounds.extend([p.lng, p.lat]));
    map.fitBounds(bounds, { padding: 56, maxZoom: 16, duration: animate ? 500 : 0 });
  }

  let me = null;
  let centered = false;
  let synced = false;
  let inset = { top: 0, bottom: 0 };
  window.delivoSync = (state) => {
    const firstSync = !synced;
    synced = true;
    document.body.classList.toggle('dimmed', Boolean(state.dimmed));
    const routeChanged = setRoute(state.route || null);
    // Yläpalkki ja alapaneeli peittävät kartan reunoja: keskikohta lasketaan
    // näkyvästä osasta, jotta oma sijainti tai reitti ei jää niiden alle.
    const padding = { top: state.topInset || 0, right: 0, bottom: state.bottomInset || 0, left: 0 };
    const insetChanged = padding.top !== inset.top || padding.bottom !== inset.bottom;
    inset = { top: padding.top, bottom: padding.bottom };
    const topRight = document.querySelector('.maplibregl-ctrl-top-right');
    if (topRight) topRight.style.top = padding.top + 'px';
    const position = state.position;
    if (position) {
      const lngLat = [position.lng, position.lat];
      if (!me) {
        const element = document.createElement('div');
        element.className = 'me';
        me = new maplibregl.Marker({ element }).setLngLat(lngLat).addTo(map);
      } else {
        me.setLngLat(lngLat);
      }
    }
    if (route) {
      if (routeChanged || insetChanged) {
        map.setPadding(padding);
        fitRoute(!firstSync);
      }
      return;
    }
    if (position) {
      // Kartta keskitetään kuljettajaan ensimmäisellä kerralla ja kun reitti
      // poistuu - ei muuten, ettei se hyppää kun kuljettaja on itse siirtänyt karttaa.
      if (!centered || routeChanged) {
        centered = true;
        map.easeTo({ center: [position.lng, position.lat], zoom: 15, padding, duration: routeChanged ? 500 : 0 });
        return;
      }
    }
    if (insetChanged) map.easeTo({ padding, duration: 250 });
  };
</script>
</body>
</html>`
}

// Komento, joka vie tilan (dimmed, position, route { start?, from, to }, topInset,
// bottomInset) jo ladatulle kartalle (WebView).
export function syncScript(state) {
  return `window.delivoSync && window.delivoSync(${inlineJson(state)}); true;`
}

// Palauttaa kartan HTML:n, tai null kunnes tyyli on ladattu. Asetukset
// luetaan vain kerran (ks. yllä).
// interactive: false = pelkkä esikatselukuva (ei vetämistä eikä zoomausta).
export function useMapHtml({ center = KUOPIO, zoom = 13, dimmed = false, interactive = true } = {}) {
  const [html, setHtml] = useState(null)

  useEffect(() => {
    let cancelled = false
    loadStyle().then(
      (style) => !cancelled && setHtml(buildMapHtml(style, { center, zoom, dimmed, interactive })),
      // Ilman väritettyä tyyliä näytetään tavallinen Positron - kartta toimii silti.
      () => !cancelled && setHtml(buildMapHtml(STYLE_URL, { center, zoom, dimmed, interactive })),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return html
}

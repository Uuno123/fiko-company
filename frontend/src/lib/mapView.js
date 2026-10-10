import { useEffect, useState } from 'react'
import 'maplibre-gl/dist/maplibre-gl.css'
import './mapView.css'
import { tuneMapStyle } from './mapStyle.js'

// Yhteinen karttapohja osoitevalitsimelle, sijainnin tarkennukselle ja
// reittikartalle: MapLibre GL + OpenFreeMapin "Positron"-vektorikartta
// (käyttäjän valinta: ilmainen, ei avainta, ei käyttörajaa, ei koskaan laskua)
// delivon väreillä (lib/mapStyle.js).
// Aiemmin Google Maps Demo Keyllä (100 latausta päivässä) ja varalla
// OpenStreetMapin raskas perustaso, joka näkyi aina kun päiväraja täyttyi.
//
// Googlen osoitehaku (lib/geocode.js) jatkaa ennallaan. Googlen ETA-alueen
// ehdoista on poistettu kielto käyttää Googlen tietoja muiden kuin Googlen
// karttojen kanssa projekteilta, joiden laskutusosoite on ETA-alueella
// (Google sitoutui olemaan palauttamatta sitä 8.7.2035 asti).
//
// Rajapinta on sama kuin ennen, joten komponentit eivät muuttuneet:
//   onClick(handler) -> poista, onMoveEnd(handler) -> poista,
//   setView(point, zoom), panTo(point), panBy(x, y),
//   fitBounds(points, padding, maxZoom), addPin(point, kind, title) -> { remove },
//   addDashedLine(points) -> { remove }, destroy()
//
// gestures:
//   'auto'   - sivun sisällä: yksi sormi / hiiri liikuttaa karttaa, mutta hiiren
//              rulla vierittää sivua eikä zoomaa karttaa
//   'greedy' - koko näytön ikkuna: myös rulla zoomaa
//   'none'   - pelkkä esikatselu
// Kahden sormen pakkoa ("Siirrä karttaa kahdella sormella") ei käytetä missään -
// Googlen kartassa se oli käyttäjästä ongelma tilauksen seurannassa.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

const LINE_COLOR = '#14150f'

const LOCALE = {
  'Map.Title': 'Kartta',
  'Marker.Title': 'Karttamerkki',
  'NavigationControl.ZoomIn': 'Lähennä',
  'NavigationControl.ZoomOut': 'Loitonna',
  'AttributionControl.ToggleAttribution': 'Näytä kartan tekijätiedot',
}

const PINS = {
  store: {
    size: 30,
    anchor: [15, 15],
    html: '<span><svg viewBox="0 0 20 20" fill="none"><path d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>',
  },
  dest: {
    size: 26,
    anchor: [13, 24],
    html: '<span><svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"/></svg></span>',
  },
}

// MapLibre (noin megatavu JavaScriptiä) ladataan vasta kun ensimmäinen kartta
// tarvitaan - omana tiedostonaan eikä pääpaketissa, joten etusivu ja
// ravintolasivut eivät lataa sitä turhaan.
let maplibrePromise = null

function loadMapLibre() {
  maplibrePromise ??= import('maplibre-gl').then((mod) => mod.default ?? mod)
  return maplibrePromise
}

// MapLibre käyttää järjestystä [lng, lat], ja koordinaatit voivat tulla
// tietokannasta merkkijonoina.
function lngLat(point) {
  return [Number(point.lng), Number(point.lat)]
}

let lineCounter = 0

function maplibreView(maplibregl, container, { center, zoom, maxZoom, controls, gestures }) {
  const interactive = gestures !== 'none'
  const map = new maplibregl.Map({
    container,
    center: lngLat(center),
    zoom,
    maxZoom,
    interactive,
    // Ruoan toimituksessa kartta pysyy pohjoinen ylöspäin: ei kiertoa eikä kallistusta.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    scrollZoom: gestures === 'greedy',
    // Tekijätiedot (OpenFreeMap, OpenMapTiles, OpenStreetMap) ovat karttojen
    // lisenssiehto, joten ne näkyvät aina - tiiviinä i-nappina.
    attributionControl: { compact: true },
    locale: LOCALE,
  })
  // Tyyli ladataan erikseen, jotta värit vaihtuvat ennen ensimmäistä piirtoa.
  map.setStyle(STYLE_URL, { transformStyle: (_previous, next) => tuneMapStyle(next) })
  if (interactive) map.touchZoomRotate.disableRotation()
  if (controls) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')

  // Tiivis tekijätietonappi alkaa MapLibressa auki (ja sulkeutuu vasta karttaa
  // vedettäessä), jolloin pitkä teksti peitti kartan alareunan. Suljetaan se
  // heti - tiedot saa auki i-napista.
  function collapseAttribution() {
    container.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact')?.classList.remove('maplibregl-compact-show')
  }
  map.once('load', collapseAttribution)
  map.once('idle', collapseAttribution)

  // Viivat ovat karttatyylin tasoja, joten ne voi lisätä vasta kun tyyli on ladattu.
  function whenStyleReady(callback) {
    if (map.isStyleLoaded()) callback()
    else map.once('load', callback)
  }

  return {
    onClick(handler) {
      const listener = (e) => handler({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      map.on('click', listener)
      return () => map.off('click', listener)
    },
    onMoveEnd(handler) {
      const listener = () => {
        const { lat, lng } = map.getCenter()
        handler({ lat, lng })
      }
      map.on('moveend', listener)
      return () => map.off('moveend', listener)
    },
    setView(point, nextZoom) {
      map.jumpTo({ center: lngLat(point), zoom: nextZoom })
    },
    panTo(point) {
      map.panTo(lngLat(point))
    },
    panBy(x, y) {
      map.panBy([x, y], { animate: false })
    },
    fitBounds(points, padding, nextMaxZoom) {
      const bounds = new maplibregl.LngLatBounds()
      points.forEach((point) => bounds.extend(lngLat(point)))
      map.fitBounds(bounds, { padding, maxZoom: nextMaxZoom, animate: false })
    },
    addPin(point, kind, title) {
      const pin = PINS[kind]
      const element = document.createElement('div')
      element.className = `map-pin map-pin--${kind}`
      element.innerHTML = pin.html
      element.style.width = `${pin.size}px`
      element.style.height = `${pin.size}px`
      if (title) element.title = title
      // anchor top-left + negatiivinen siirto: merkin kärki (pin.anchor) osuu pisteeseen.
      const marker = new maplibregl.Marker({ element, anchor: 'top-left', offset: [-pin.anchor[0], -pin.anchor[1]] })
        .setLngLat(lngLat(point))
        .addTo(map)
      return { remove: () => marker.remove() }
    },
    addDashedLine(points) {
      const id = `delivo-line-${++lineCounter}`
      let removed = false
      whenStyleReady(() => {
        if (removed) return
        map.addSource(id, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points.map(lngLat) } },
        })
        // Katkoviiva viivan leveyden kerrannaisina: 3 px viiva -> 6 px viiva, 8 px väli.
        map.addLayer({
          id,
          type: 'line',
          source: id,
          paint: { 'line-color': LINE_COLOR, 'line-width': 3, 'line-opacity': 0.55, 'line-dasharray': [2, 2.7] },
        })
      })
      return {
        remove() {
          removed = true
          try {
            if (map.getLayer(id)) map.removeLayer(id)
            if (map.getSource(id)) map.removeSource(id)
          } catch {
            // Kartta purettiin jo (komponentti poistui) - poistettavaa ei ole.
          }
        },
      }
    },
    destroy() {
      map.remove()
    },
  }
}

// Luo kartan containerRef-elementtiin ja palauttaa sen rajapinnan, tai null
// kun kartta ei ole vielä valmis (MapLibre latautuu). Asetukset luetaan vain
// luonnissa.
export function useMapView(containerRef, { center, zoom, maxZoom = 18, controls = true, gestures = 'auto' }) {
  const [mapView, setMapView] = useState(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    let cancelled = false
    let created = null

    loadMapLibre().then(
      (maplibregl) => {
        if (cancelled) return
        created = maplibreView(maplibregl, container, { center, zoom, maxZoom, controls, gestures })
        setMapView(created)
      },
      (err) => console.error('[delivo] Kartan lataus epäonnistui:', err),
    )

    return () => {
      cancelled = true
      created?.destroy()
      setMapView(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return mapView
}

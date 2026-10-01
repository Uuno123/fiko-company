import { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { hasGoogleMaps, loadGoogleMaps, onGoogleMapsFailure } from './googleMaps.js'
import './mapView.css'

// Yhteinen karttapohja osoitevalitsimelle, sijainnin tarkennukselle ja
// reittikartalle. Google Maps kun avain on (lib/googleMaps.js), muuten Leaflet +
// OpenStreetMapin ilmainen pohjakartta. Molemmat toteuttavat saman pienen
// rajapinnan, joten komponenttien ei tarvitse tietää kumpi on käytössä:
//   onClick(handler) -> poista, onMoveEnd(handler) -> poista,
//   setView(point, zoom), panTo(point), panBy(x, y),
//   fitBounds(points, padding, maxZoom), addPin(point, kind, title) -> { remove },
//   addDashedLine(points) -> { remove }, destroy()
//
// gestures: 'auto' (sivun sisällä), 'greedy' (koko näytön ikkunassa - yhden
// sormen veto liikuttaa karttaa eikä sivua) tai 'none' (pelkkä esikatselu).
//
// Google-kartta pitää olla aina, kun kartalla näytetään Googlen osoitehaun
// tuloksia - Googlen ehdot kieltävät niiden näyttämisen muiden karttojen päällä.

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

const LINE_COLOR = '#14150f'

// Tavallinen värillinen Google-kartta, mutta yritysten (esim. kilpailevien
// ravintoloiden) kuvakkeet piiloon.
const GOOGLE_STYLES = [{ featureType: 'poi.business', stylers: [{ visibility: 'off' }] }]

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

function leafletView(container, { center, zoom, maxZoom, controls, gestures }) {
  const movable = gestures !== 'none'
  const map = L.map(container, {
    zoomControl: controls,
    attributionControl: controls,
    dragging: movable,
    touchZoom: movable,
    scrollWheelZoom: movable,
    doubleClickZoom: movable,
    boxZoom: movable,
    keyboard: movable,
  }).setView([center.lat, center.lng], zoom)
  L.tileLayer(OSM_TILES, { maxZoom, attribution: '&copy; OpenStreetMap' }).addTo(map)

  // animate: false sivun sisäisissä siirroissa - valinta vaihtaa näkymän usein pois
  // kartasta lähes saman tien, ja kesken jäävä animaatio kaataisi sivun puretun DOM:in päällä.
  return {
    onClick(handler) {
      const listener = (e) => handler({ lat: e.latlng.lat, lng: e.latlng.lng })
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
      map.setView([point.lat, point.lng], nextZoom, { animate: false })
    },
    panTo(point) {
      map.panTo([point.lat, point.lng])
    },
    panBy(x, y) {
      map.panBy([x, y], { animate: false })
    },
    fitBounds(points, padding, nextMaxZoom) {
      map.fitBounds(
        points.map((point) => [point.lat, point.lng]),
        {
          paddingTopLeft: [padding.left, padding.top],
          paddingBottomRight: [padding.right, padding.bottom],
          maxZoom: nextMaxZoom,
          animate: false,
        },
      )
    },
    addPin(point, kind, title) {
      const pin = PINS[kind]
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: `map-pin map-pin--${kind}`,
          html: pin.html,
          iconSize: [pin.size, pin.size],
          iconAnchor: pin.anchor,
        }),
        title,
      }).addTo(map)
      return { remove: () => marker.remove() }
    },
    addDashedLine(points) {
      const line = L.polyline(
        points.map((point) => [point.lat, point.lng]),
        { color: LINE_COLOR, weight: 3, opacity: 0.55, dashArray: '6 8' },
      ).addTo(map)
      return { remove: () => line.remove() }
    },
    destroy() {
      // map.stop() ennen remove():a - muuten kesken jäävä pan/zoom-animaatio
      // kaatuu ("Cannot read properties of undefined (reading '_leaflet_pos')").
      map.stop()
      map.remove()
    },
  }
}

// Googlen LatLngLiteral ei salli ylimääräisiä kenttiä (esim. { address, lat, lng }
// heittää virheen), ja koordinaatit voivat tulla tietokannasta merkkijonoina.
function latLng(point) {
  return { lat: Number(point.lat), lng: Number(point.lng) }
}

function googleView(maps, container, { center, zoom, maxZoom, controls, gestures }) {
  const map = new maps.Map(container, {
    center: latLng(center),
    zoom,
    maxZoom,
    styles: GOOGLE_STYLES,
    disableDefaultUI: true,
    zoomControl: controls,
    keyboardShortcuts: gestures !== 'none',
    gestureHandling: gestures,
    clickableIcons: false,
  })

  return {
    onClick(handler) {
      const listener = map.addListener('click', (e) => handler({ lat: e.latLng.lat(), lng: e.latLng.lng() }))
      return () => listener.remove()
    },
    onMoveEnd(handler) {
      const listener = map.addListener('idle', () => handler(map.getCenter().toJSON()))
      return () => listener.remove()
    },
    setView(point, nextZoom) {
      map.setCenter(latLng(point))
      map.setZoom(nextZoom)
    },
    panTo(point) {
      map.panTo(latLng(point))
    },
    panBy(x, y) {
      // Juuri luotu kartta ei vielä tiedä pikselimittojaan.
      if (map.getProjection()) map.panBy(x, y)
      else maps.event.addListenerOnce(map, 'projection_changed', () => map.panBy(x, y))
    },
    fitBounds(points, padding, nextMaxZoom) {
      const bounds = new maps.LatLngBounds()
      points.forEach((point) => bounds.extend(latLng(point)))
      map.fitBounds(bounds, padding)
      // Googlen fitBounds ei tunne maxZoomia - lähekkäiset pisteet zoomattaisiin
      // korttelitasolle asti.
      maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > nextMaxZoom) map.setZoom(nextMaxZoom)
      })
    },
    // Oma HTML-merkki OverlayView'lla: Googlen AdvancedMarkerElement vaatisi
    // map ID:n, eikä karttatyyli (styles) toimi map ID:n kanssa.
    addPin(point, kind, title) {
      const pin = PINS[kind]
      const element = document.createElement('div')
      element.className = `map-pin map-pin--${kind}`
      element.innerHTML = pin.html
      if (title) element.title = title
      Object.assign(element.style, { position: 'absolute', width: `${pin.size}px`, height: `${pin.size}px` })

      const position = new maps.LatLng(latLng(point))
      const overlay = new maps.OverlayView()
      overlay.onAdd = () => overlay.getPanes().overlayMouseTarget.appendChild(element)
      overlay.draw = () => {
        const pixel = overlay.getProjection().fromLatLngToDivPixel(position)
        element.style.left = `${pixel.x - pin.anchor[0]}px`
        element.style.top = `${pixel.y - pin.anchor[1]}px`
      }
      overlay.onRemove = () => element.remove()
      overlay.setMap(map)
      return { remove: () => overlay.setMap(null) }
    },
    addDashedLine(points) {
      // Katkoviiva toistuvana viivasymbolina: 6 px viiva, 8 px väli.
      const line = new maps.Polyline({
        map,
        path: points.map(latLng),
        strokeOpacity: 0,
        clickable: false,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeColor: LINE_COLOR, strokeOpacity: 0.55, strokeWeight: 3, scale: 3 },
            offset: '0',
            repeat: '14px',
          },
        ],
      })
      return { remove: () => line.setMap(null) }
    },
    destroy() {
      maps.event.clearInstanceListeners(map)
      container.replaceChildren()
    },
  }
}

// Luo kartan containerRef-elementtiin ja palauttaa sen rajapinnan, tai null
// kun kartta ei ole vielä valmis (Google latautuu). Asetukset luetaan vain
// luonnissa. Jos Google hylkää avaimen jälkikäteen, kartta vaihtuu Leafletiin.
export function useMapView(containerRef, { center, zoom, maxZoom = 18, controls = true, gestures = 'auto' }) {
  const [mapView, setMapView] = useState(null)
  const [googleFailed, setGoogleFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const options = { center, zoom, maxZoom, controls, gestures }
    let cancelled = false
    let created = null
    let unsubscribe = () => {}

    function mount(maps) {
      if (cancelled) return
      created = maps ? googleView(maps, container, options) : leafletView(container, options)
      setMapView(created)
    }

    if (hasGoogleMaps && !googleFailed) {
      loadGoogleMaps().then(mount, () => mount(null))
      unsubscribe = onGoogleMapsFailure(() => setGoogleFailed(true))
    } else {
      mount(null)
    }

    return () => {
      cancelled = true
      unsubscribe()
      created?.destroy()
      setMapView(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleFailed])

  return mapView
}

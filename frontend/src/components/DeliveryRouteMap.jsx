import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './DeliveryRouteMap.css'

const AVERAGE_SPEED_KMH = 22 // karkea arvio: mopo/pyörälähetti kaupunkiliikenteessä
const PREP_TIME_MIN = 8 // arvioitu keittiön valmistusaika ennen kuin kuljetus edes lähtee

export function haversineKm(a, b) {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function estimateEtaMinutes(distanceKm) {
  const travelMin = (distanceKm / AVERAGE_SPEED_KMH) * 60
  const low = Math.round(PREP_TIME_MIN + travelMin)
  const high = low + Math.max(8, Math.round(travelMin * 0.35))
  return { low, high }
}

function storeIcon() {
  return L.divIcon({
    className: 'route-pin route-pin--store',
    html: `<span><svg viewBox="0 0 20 20" fill="none"><path d="M3 6h9l3 4h2v4h-1M3 6v8h1m0 0a2 2 0 1 0 4 0m-4 0h4m6 0a2 2 0 1 0 4 0m-4 0h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function pinIcon() {
  return L.divIcon({
    className: 'route-pin route-pin--dest',
    html: `<span><svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"/></svg></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 24],
  })
}

function DeliveryRouteMap({ restaurant, destination, pickupOnly = false }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef(null)

  const hasRoute = Boolean(restaurant?.lat && restaurant?.lng && destination?.lat && destination?.lng)
  const hasRestaurantOnly = pickupOnly && Boolean(restaurant?.lat && restaurant?.lng)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
      [restaurant?.lat ?? 62.8924, restaurant?.lng ?? 27.677],
      13,
    )
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
    mapRef.current = map
    return () => {
      // map.stop() ennen remove():a estää Leafletin kesken jäävän fitBounds-animaation
      // kaatumasta puretun DOM:in päälle - sama korjaus kuin AddressMapPicker.jsx:ssä.
      map.stop()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layersRef.current) {
      layersRef.current.forEach((layer) => map.removeLayer(layer))
      layersRef.current = null
    }

    if (hasRestaurantOnly) {
      const storeLatLng = [restaurant.lat, restaurant.lng]
      const storeMarker = L.marker(storeLatLng, { icon: storeIcon(), title: restaurant.name }).addTo(map)
      layersRef.current = [storeMarker]
      map.setView(storeLatLng, 15, { animate: false })
      return
    }

    if (!hasRoute) return

    const storeLatLng = [restaurant.lat, restaurant.lng]
    const destLatLng = [destination.lat, destination.lng]

    const storeMarker = L.marker(storeLatLng, { icon: storeIcon(), title: restaurant.name }).addTo(map)
    const destMarker = L.marker(destLatLng, { icon: pinIcon(), title: destination.address }).addTo(map)
    const line = L.polyline([storeLatLng, destLatLng], {
      color: '#14150f',
      weight: 3,
      opacity: 0.55,
      dashArray: '6 8',
    }).addTo(map)

    layersRef.current = [storeMarker, destMarker, line]
    // animate: false - sama syy kuin AddressMapPicker.jsx:ssä: estää kesken jäävää
    // zoom/pan-animaatiota kaatamasta sivua jos komponentti puretaan pian tämän jälkeen.
    map.fitBounds(line.getBounds(), { padding: [28, 28], maxZoom: 15, animate: false })
  }, [
    hasRoute,
    hasRestaurantOnly,
    restaurant?.lat,
    restaurant?.lng,
    destination?.lat,
    destination?.lng,
    restaurant?.name,
    destination?.address,
  ])

  const distanceKm = hasRoute ? haversineKm(restaurant, destination) : null
  const eta = distanceKm != null ? estimateEtaMinutes(distanceKm) : null
  const hasDestination = Boolean(destination?.lat && destination?.lng)
  const placeholderText = hasDestination
    ? 'Karttaa ei voida näyttää tälle ravintolalle juuri nyt'
    : 'Valitse toimitusosoite nähdäksesi reitin kartalla'

  return (
    <div className="delivery-route-map">
      <div ref={containerRef} className="delivery-route-map__canvas" />
      {!hasRoute && !hasRestaurantOnly && <div className="delivery-route-map__placeholder">{placeholderText}</div>}
      {eta && (
        <span className="delivery-route-map__eta">
          n. {eta.low}-{eta.high} min · {distanceKm.toFixed(1)} km
        </span>
      )}
    </div>
  )
}

export default DeliveryRouteMap

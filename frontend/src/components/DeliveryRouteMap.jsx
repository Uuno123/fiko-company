import { useEffect, useRef } from 'react'
import { haversineKm } from '../lib/geocode.js'
import { useMapView } from '../lib/mapView.js'
import './DeliveryRouteMap.css'

const AVERAGE_SPEED_KMH = 22 // karkea arvio: mopo/pyörälähetti kaupunkiliikenteessä
const PREP_TIME_MIN = 8 // arvioitu keittiön valmistusaika ennen kuin kuljetus edes lähtee
const DEFAULT_CENTER = { lat: 62.8924, lng: 27.677 } // Kuopio - delivon esimerkkidatan kaupunki

function estimateEtaMinutes(distanceKm) {
  const travelMin = (distanceKm / AVERAGE_SPEED_KMH) * 60
  const low = Math.round(PREP_TIME_MIN + travelMin)
  const high = low + Math.max(8, Math.round(travelMin * 0.35))
  return { low, high }
}

// bottomInset: kartan alareunan päällä on jotain (seurantanäkymän aikalaskuri),
// joten merkit rajataan sen yläpuolelle. showEta: kartan oma matka-arvio pois,
// kun näkymässä on jo koko tilauksen aika-arvio.
function DeliveryRouteMap({ restaurant, destination, pickupOnly = false, bottomInset = 0, showEta = true }) {
  const containerRef = useRef(null)

  const hasRestaurantCoords = Boolean(restaurant?.lat && restaurant?.lng)
  const hasRoute = hasRestaurantCoords && Boolean(destination?.lat && destination?.lng)
  // Ilman määränpään koordinaatteja (esim. profiilista esitäytetty osoite, jota ei
  // ole paikannettu kartalla) näytetään ainakin ravintola - ei tyhjää karttaa.
  const hasRestaurantOnly = hasRestaurantCoords && (pickupOnly || !hasRoute)

  const mapView = useMapView(containerRef, {
    center: hasRestaurantCoords ? { lat: Number(restaurant.lat), lng: Number(restaurant.lng) } : DEFAULT_CENTER,
    zoom: 13,
    maxZoom: 16,
    controls: false,
  })

  useEffect(() => {
    if (!mapView || !hasRestaurantCoords) return
    const store = { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }

    if (hasRestaurantOnly) {
      const storePin = mapView.addPin(store, 'store', restaurant.name)
      mapView.setView(store, 15)
      if (bottomInset) mapView.panBy(0, bottomInset / 2)
      return () => storePin.remove()
    }

    if (!hasRoute) return
    const dest = { lat: Number(destination.lat), lng: Number(destination.lng) }
    const layers = [
      mapView.addPin(store, 'store', restaurant.name),
      mapView.addPin(dest, 'dest', destination.address),
      mapView.addDashedLine([store, dest]),
    ]
    mapView.fitBounds([store, dest], { top: 28, right: 28, bottom: 28 + bottomInset, left: 28 }, 15)
    return () => layers.forEach((layer) => layer.remove())
  }, [
    mapView,
    hasRestaurantCoords,
    hasRoute,
    hasRestaurantOnly,
    bottomInset,
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
      {showEta && eta && (
        <span className="delivery-route-map__eta">
          n. {eta.low}-{eta.high} min · {distanceKm.toFixed(1)} km
        </span>
      )}
    </div>
  )
}

export default DeliveryRouteMap

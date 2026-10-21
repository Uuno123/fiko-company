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
// kun näkymässä on jo koko tilauksen aika-arvio. gestures: 'auto' (hiiren rulla
// vierittää sivua) tai 'greedy' (rulla zoomaa karttaa), ks. lib/mapView.js.
// Zoomausnapit näkyvät hiirellä käytettäessä, puhelimella zoomataan nipistämällä.
// courier: kuljettajan sijainti { lat, lng } (asiakkaan seuranta, päivittyy
// reaaliajassa) tai null. hideRestaurant: kuljettaja on noutanut tilauksen -
// ravintola ja sen reitti pois kartalta, jäljelle kuljettaja ja koti (kuten Woltissa).
function DeliveryRouteMap({
  restaurant,
  destination,
  pickupOnly = false,
  bottomInset = 0,
  showEta = true,
  gestures = 'auto',
  courier = null,
  hideRestaurant = false,
}) {
  const containerRef = useRef(null)
  const courierPinRef = useRef(null)
  // Viimeisin kuljettajan sijainti rajausta varten (ei riippuvuutena, ettei
  // kartta rajaudu uudelleen joka liikahduksella).
  const courierPointRef = useRef(null)

  const hasRestaurantCoords = Boolean(restaurant?.lat && restaurant?.lng)
  const hasDestination = Boolean(destination?.lat && destination?.lng)
  const hasRoute = hasRestaurantCoords && hasDestination
  // Ilman määränpään koordinaatteja (esim. profiilista esitäytetty osoite, jota ei
  // ole paikannettu kartalla) näytetään ainakin ravintola - ei tyhjää karttaa.
  const hasRestaurantOnly = hasRestaurantCoords && (pickupOnly || !hasRoute)

  const mapView = useMapView(containerRef, {
    center:
      hideRestaurant && hasDestination
        ? { lat: Number(destination.lat), lng: Number(destination.lng) }
        : hasRestaurantCoords
          ? { lat: Number(restaurant.lat), lng: Number(restaurant.lng) }
          : DEFAULT_CENTER,
    zoom: 13,
    gestures,
  })

  // Noudon jälkeen: vain koti (ja kuljettaja, ks. alla). Kartta rajataan kotiin ja
  // kuljettajan viimeisimpään sijaintiin.
  useEffect(() => {
    if (!mapView || !hideRestaurant || !hasDestination) return
    const dest = { lat: Number(destination.lat), lng: Number(destination.lng) }
    const destPin = mapView.addPin(dest, 'dest', destination.address)
    const courierPoint = courierPointRef.current
    if (courierPoint) mapView.fitBounds([courierPoint, dest], { top: 28, right: 28, bottom: 28 + bottomInset, left: 28 }, 16)
    else {
      mapView.setView(dest, 15)
      if (bottomInset) mapView.panBy(0, bottomInset / 2)
    }
    return () => destPin.remove()
  }, [mapView, hideRestaurant, hasDestination, bottomInset, destination?.lat, destination?.lng, destination?.address])

  useEffect(() => {
    if (!mapView || hideRestaurant || !hasRestaurantCoords) return
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
    hideRestaurant,
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

  // Kuljettajan merkki liikkuu sijainnin mukana. Ensimmäisellä kerralla kartta
  // rajataan niin, että kuljettaja näkyy ravintolan ja kodin kanssa.
  const courierLat = courier?.lat
  const courierLng = courier?.lng
  const hasCourier = courierLat != null && courierLng != null
  useEffect(() => {
    if (!mapView || !hasCourier) return
    const point = { lat: courierLat, lng: courierLng }
    courierPointRef.current = point
    if (courierPinRef.current) {
      courierPinRef.current.move(point)
      return
    }
    courierPinRef.current = mapView.addPin(point, 'courier', 'Kuljettaja')
    const points = [point]
    if (hasRestaurantCoords && !hideRestaurant) points.push({ lat: Number(restaurant.lat), lng: Number(restaurant.lng) })
    if (hasDestination) points.push({ lat: Number(destination.lat), lng: Number(destination.lng) })
    if (points.length > 1) mapView.fitBounds(points, { top: 28, right: 28, bottom: 28 + bottomInset, left: 28 }, 16)
    else mapView.setView(point, 15)
    // Rajaus vain ensimmäisellä kerralla - sen jälkeen merkki vain liikkuu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapView, hasCourier, courierLat, courierLng])

  // Kuljettaja poistuu kartalta kun toimitus on valmis tai kartta puretaan.
  useEffect(() => {
    if (hasCourier) return
    courierPinRef.current?.remove()
    courierPinRef.current = null
    courierPointRef.current = null
  }, [hasCourier])
  useEffect(
    () => () => {
      courierPinRef.current?.remove()
      courierPinRef.current = null
    },
    [mapView],
  )

  const distanceKm = hasRoute ? haversineKm(restaurant, destination) : null
  const eta = distanceKm != null ? estimateEtaMinutes(distanceKm) : null
  const showPlaceholder = hideRestaurant ? !hasDestination && !hasCourier : !hasRoute && !hasRestaurantOnly
  const placeholderText = hasDestination
    ? 'Karttaa ei voida näyttää tälle ravintolalle juuri nyt'
    : 'Valitse toimitusosoite nähdäksesi reitin kartalla'

  return (
    <div className="delivery-route-map">
      <div ref={containerRef} className="delivery-route-map__canvas" />
      {showPlaceholder && <div className="delivery-route-map__placeholder">{placeholderText}</div>}
      {showEta && eta && (
        <span className="delivery-route-map__eta">
          n. {eta.low}-{eta.high} min · {distanceKm.toFixed(1)} km
        </span>
      )}
    </div>
  )
}

export default DeliveryRouteMap

import { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { Bike, Store } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Seurannan kartta (käyttäjän mallikuva 20.11.2026): vaalea pohja kallistettuna
// 3D-näkymäksi, musta reitti oikeita teitä pitkin ja kuljettajan auto ajaa
// reittiä (sijainti liukuu pehmeästi päivitysten välillä ja kääntyy tien
// suuntaan). Tiereitti haetaan OSRM:n ilmaisesta julkisesta palvelusta ilman
// avainta; jos se ei vastaa, piirretään kaari kuten ennen.
// react-native-maps: iPhonella Apple Maps, Androidilla Google Maps
// (kauppaversio tarvitsee avaimen). Verkkoversiossa TrackingMap.web.jsx.
const PITCH = 55
const OSRM = 'https://router.project-osrm.org/route/v1/driving/'

export default function TrackingMap({ restaurant, destination, courier, courierVehicle, hideRestaurant, distanceLabel, bottomInset = 40, style }) {
  const mapRef = useRef(null)
  const shop = !hideRestaurant && valid(restaurant) ? toLatLng(restaurant) : null
  const home = valid(destination) ? toLatLng(destination) : null
  const bike = valid(courier) ? toLatLng(courier) : null

  // Musta reitti koko toimituksen ajan (20.11.2026): aina ravintolasta kotiin
  // teitä pitkin, yksi viiva. Noudon jälkeen auto kulkee viivaa pitkin ja jo
  // ajettu osa häviää; ennen noutoa auto näkyy omalla paikallaan matkalla
  // ravintolaan. Ilman ravintolan sijaintia reitti kuljettajalta kotiin.
  const shopPoint = valid(restaurant) ? toLatLng(restaurant) : null
  const routeFrom = shopPoint ?? bike
  const routeTo = home
  const stops = routeFrom && routeTo ? [routeFrom, routeTo] : []
  const routeKey = stops.map((p) => round(p, shopPoint ? 5 : 2)).join('|')
  const road = useRoadRoute(stops, routeKey)
  const fallback = useMemo(() => (routeFrom && routeTo ? curve(routeFrom, routeTo) : null), [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const full = road ?? fallback

  // Auto liukuu uuteen sijaintiin; noudon jälkeen se tarttuu reitille.
  const car = useGlidingPosition(bike)
  const onRoute = Boolean(hideRestaurant || !shopPoint)
  const snapped = car && full && onRoute ? snapToRoute(car, full) : null
  const carPos = snapped?.point ?? car
  // Koko reitti näkyy aina: ajettu osa harmaana, jäljellä oleva mustana (20.11.2026).
  const line = full && snapped ? [snapped.point, ...full.slice(snapped.index + 1)] : full
  const passed = full && snapped ? [...full.slice(0, snapped.index + 1), snapped.point] : null
  const target = onRoute ? home : shopPoint
  const heading = snapped ? snapped.heading : car && target ? bearing(car, target) : 0

  const fitKey = [shop, home, bike ? round(bike, 2) : '-', road ? road.length : 0].join('|')
  const first = bike ?? shop ?? home ?? { latitude: 62.8924, longitude: 27.677 }

  // Rajataan kaikki näkyviin ja kallistetaan kamera 3D-näkymäksi.
  useEffect(() => {
    const pts = [...(line ?? []), shop, home, carPos].filter(Boolean)
    if (pts.length < 2) return undefined
    const timer = setTimeout(async () => {
      const map = mapRef.current
      if (!map) return
      map.fitToCoordinates(pts, {
        edgePadding: { top: 90, right: 50, bottom: bottomInset + 20, left: 50 },
        animated: false,
      })
      setTimeout(async () => {
        try {
          const cam = await map.getCamera()
          map.animateCamera({ ...cam, pitch: PITCH, heading: 0 }, { duration: 700 })
        } catch {
          // kamera ei vielä valmis
        }
      }, 120)
    }, 300)
    return () => clearTimeout(timer)
  }, [fitKey, bottomInset]) // eslint-disable-line react-hooks/exhaustive-deps

  // Android piirtää oman merkkinäkymän kuvaksi: annetaan SVG:n ensin valmistua.
  const [carReady, setCarReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setCarReady(true), 600)
    return () => clearTimeout(t)
  }, [])

  const isCar = courierVehicle === 'car'

  return (
    <MapView
      ref={mapRef}
      style={[StyleSheet.absoluteFill, style]}
      initialCamera={{ center: first, pitch: PITCH, heading: 0, zoom: 14, altitude: 2500 }}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      customMapStyle={Platform.OS === 'android' ? MUTED_STYLE : undefined}
      showsPointsOfInterest={false}
      showsBuildings
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled
    >
      {passed && passed.length > 1 ? (
        <Polyline key="passed" coordinates={passed} strokeColor="#a9adb3" strokeWidth={5} lineCap="round" lineJoin="round" zIndex={1} />
      ) : null}
      {line && line.length > 1 ? (
        <Polyline key="ahead" coordinates={line} strokeColor={colors.black} strokeWidth={5} lineCap="round" lineJoin="round" zIndex={2} />
      ) : null}
      {line && distanceLabel ? (
        <Marker coordinate={line[Math.floor(line.length / 2)]} anchor={{ x: 0.5, y: 1.2 }} tracksViewChanges={false}>
          <View style={styles.label}>
            <Text style={styles.labelText}>{distanceLabel}</Text>
          </View>
        </Marker>
      ) : null}
      {shop ? (
        <Marker coordinate={shop} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.shopPin}>
            <Store size={14} strokeWidth={2.2} color="#ffffff" />
          </View>
        </Marker>
      ) : null}
      {home ? (
        <Marker coordinate={home} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.endPin} />
        </Marker>
      ) : null}
      {carPos ? (
        <Marker coordinate={carPos} anchor={{ x: 0.5, y: 0.5 }} flat rotation={isCar ? heading : 0} tracksViewChanges={!carReady}>
          {isCar ? (
            <TopCar />
          ) : (
            <View style={styles.bikePin}>
              <Bike size={18} strokeWidth={2.2} color={colors.black} />
            </View>
          )}
        </Marker>
      ) : null}
    </MapView>
  )
}

// Tiereitti OSRM:stä (ilmainen julkinen palvelu, ei avainta). null = ei reittiä.
function useRoadRoute(stops, key) {
  const [route, setRoute] = useState(null)
  useEffect(() => {
    if (stops.length < 2) {
      setRoute(null)
      return undefined
    }
    let cancelled = false
    const coords = stops.map((p) => `${p.longitude},${p.latitude}`).join(';')
    fetch(`${OSRM}${coords}?overview=full&geometries=geojson`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const pts = json?.routes?.[0]?.geometry?.coordinates
        if (!cancelled) setRoute(Array.isArray(pts) && pts.length > 1 ? pts.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) : null)
      })
      .catch(() => {
        if (!cancelled) setRoute(null)
      })
    return () => {
      cancelled = true
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return route
}

// Sijainti liukuu edellisestä uuteen ~2 sekunnissa, jotta auto näyttää ajavan.
function useGlidingPosition(target) {
  const [pos, setPos] = useState(target)
  const posRef = useRef(target)
  const key = target ? `${target.latitude},${target.longitude}` : '-'
  useEffect(() => {
    if (!target) {
      posRef.current = null
      setPos(null)
      return undefined
    }
    const start = posRef.current
    if (!start) {
      posRef.current = target
      setPos(target)
      return undefined
    }
    const began = Date.now()
    const duration = 2000
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - began) / duration)
      const e = t * (2 - t)
      const next = {
        latitude: start.latitude + (target.latitude - start.latitude) * e,
        longitude: start.longitude + (target.longitude - start.longitude) * e,
      }
      posRef.current = next
      setPos(next)
      if (t >= 1) clearInterval(timer)
    }, 50)
    return () => clearInterval(timer)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return pos
}

// Lähin piste reitillä + tien suunta siinä kohdassa.
function snapToRoute(p, route) {
  const kx = Math.cos((p.latitude * Math.PI) / 180)
  let best = null
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i]
    const b = route[i + 1]
    const ax = a.longitude * kx
    const ay = a.latitude
    const dx = b.longitude * kx - ax
    const dy = b.latitude - ay
    const len2 = dx * dx + dy * dy
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.longitude * kx - ax) * dx + (p.latitude - ay) * dy) / len2)) : 0
    const qx = ax + dx * t
    const qy = ay + dy * t
    const d2 = (p.longitude * kx - qx) ** 2 + (p.latitude - qy) ** 2
    if (!best || d2 < best.d2) best = { d2, index: i, point: { latitude: qy, longitude: qx / kx }, heading: bearing(a, b) }
  }
  // Yli ~150 m reitiltä: näytetään todellinen sijainti, ei vedetä tielle.
  return best && Math.sqrt(best.d2) * 111000 < 150 ? best : null
}

const round = (p, digits) => `${p.latitude.toFixed(digits)},${p.longitude.toFixed(digits)}`

// Kaari kahden pisteen välille (toisen asteen Bezier, nousee reitin sivulle).
function curve(a, b, steps = 32) {
  const midLat = (a.latitude + b.latitude) / 2
  const midLng = (a.longitude + b.longitude) / 2
  const dLat = b.latitude - a.latitude
  const dLng = b.longitude - a.longitude
  const control = { latitude: midLat + dLng * 0.25, longitude: midLng - dLat * 0.25 }
  const out = []
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const u = 1 - t
    out.push({
      latitude: u * u * a.latitude + 2 * u * t * control.latitude + t * t * b.latitude,
      longitude: u * u * a.longitude + 2 * u * t * control.longitude + t * t * b.longitude,
    })
  }
  return out
}

// Kuljettaja: valkoinen auto ylhäältä päin, varjo ja sävytys antavat
// kolmiulotteisuutta (käyttäjän mallikuva 20.11.2026). Piirretty keula ylös;
// Marker kääntää sen ajosuuntaan.
function TopCar() {
  return (
    <Svg width={34} height={62} viewBox="0 0 44 80">
      <Defs>
        <LinearGradient id="carBody" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#bfc2c6" />
          <Stop offset="0.18" stopColor="#eceef0" />
          <Stop offset="0.5" stopColor="#ffffff" />
          <Stop offset="0.82" stopColor="#eceef0" />
          <Stop offset="1" stopColor="#bfc2c6" />
        </LinearGradient>
        <LinearGradient id="carRoof" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#dfe1e4" />
          <Stop offset="0.5" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#dfe1e4" />
        </LinearGradient>
        <LinearGradient id="carGlass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#4a525c" />
          <Stop offset="1" stopColor="#1b1f24" />
        </LinearGradient>
      </Defs>
      {/* pehmeä varjo kahdessa kerroksessa */}
      <Path d="M22 5 C32 5 39 8 40 15 L41 64 C41 74 35 79 22 79 C9 79 3 74 3 64 L4 15 C5 8 12 5 22 5 Z" fill="#000000" opacity={0.1} />
      <Path d="M22 4 C31 4 37 7 38 14 L39 63 C39 72 34 77 22 77 C10 77 5 72 5 63 L6 14 C7 7 13 4 22 4 Z" fill="#000000" opacity={0.12} />
      {/* peilit */}
      <Path d="M4 27 L1.5 26.5 C0.8 26.4 0.8 29.6 1.5 29.5 L5 29 Z" fill="#d7dade" />
      <Path d="M40 27 L42.5 26.5 C43.2 26.4 43.2 29.6 42.5 29.5 L39 29 Z" fill="#d7dade" />
      {/* kori */}
      <Path
        d="M22 2 C31 2 36.5 4.5 37.5 11 L38.5 24 C39.3 30 39.3 36 38.5 42 L38.5 63 C38.5 72 33 76 22 76 C11 76 5.5 72 5.5 63 L5.5 42 C4.7 36 4.7 30 5.5 24 L6.5 11 C7.5 4.5 13 2 22 2 Z"
        fill="url(#carBody)"
        stroke="#b3b6ba"
        strokeWidth={0.5}
      />
      <Path d="M15 6 L14 20 M29 6 L30 20" stroke="#d9dce0" strokeWidth={0.6} fill="none" />
      {/* ajovalot */}
      <Path d="M8.5 4.8 C10 3.6 13 3.2 15 3.4 L14 5.6 C12 5.6 10 6 8.5 6.8 Z" fill="#fffbe6" stroke="#d6d2b8" strokeWidth={0.3} />
      <Path d="M35.5 4.8 C34 3.6 31 3.2 29 3.4 L30 5.6 C32 5.6 34 6 35.5 6.8 Z" fill="#fffbe6" stroke="#d6d2b8" strokeWidth={0.3} />
      {/* tuulilasi heijastuksineen */}
      <Path d="M9 25 C15 20.5 29 20.5 35 25 L33 35.5 C27 33.8 17 33.8 11 35.5 Z" fill="url(#carGlass)" />
      <Path d="M12 25.5 C15 23.4 18 22.7 21 22.6 L16 31 C14 31.3 12.5 31.8 11.5 32.3 Z" fill="#ffffff" opacity={0.12} />
      {/* sivuikkunat */}
      <Path d="M7 38 L9.8 36.5 L9.8 56 L7 57.5 Z" fill="url(#carGlass)" />
      <Path d="M37 38 L34.2 36.5 L34.2 56 L37 57.5 Z" fill="url(#carGlass)" />
      {/* katto */}
      <Path d="M11 36.5 C17 35 27 35 33 36.5 L33 56.5 C27 58 17 58 11 56.5 Z" fill="url(#carRoof)" stroke="#d3d6da" strokeWidth={0.4} />
      {/* takalasi ja takavalot */}
      <Path d="M11 59 C17 60.8 27 60.8 33 59 L34.5 67 C28 69.5 16 69.5 9.5 67 Z" fill="url(#carGlass)" />
      <Path d="M8 73 C9.5 74.4 12 75.2 15 75.4 L15 74 C12.5 73.8 10.2 73.2 8.6 72.2 Z" fill="#e0453c" />
      <Path d="M36 73 C34.5 74.4 32 75.2 29 75.4 L29 74 C31.5 73.8 33.8 73.2 35.4 72.2 Z" fill="#e0453c" />
    </Svg>
  )
}

// Suunta asteina pohjoisesta myötäpäivään.
function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude))
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const valid = (p) => p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
const toLatLng = (p) => ({ latitude: Number(p.lat), longitude: Number(p.lng) })

const MUTED_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#eef0f2' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9aa0a6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#eef0f2' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#e6ebe8' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#e3e6ea' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#dde1e5' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d3d8dd' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cfdbe5' }] },
]

const styles = StyleSheet.create({
  // Reitin pää: valkoinen ympyrä paksulla mustalla reunalla
  endPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 5,
    borderColor: colors.black,
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 6px rgba(20, 21, 15, 0.25)',
  },
  bikePin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    boxShadow: '0 3px 8px rgba(20, 21, 15, 0.28)',
  },
  shopPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: colors.black,
    boxShadow: '0 2px 6px rgba(20, 21, 15, 0.25)',
  },
  label: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 4px rgba(20, 21, 15, 0.25)',
  },
  labelText: { fontFamily: fonts.semibold, fontSize: 12.5, color: colors.black },
})

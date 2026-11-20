import { useEffect, useMemo, useRef } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { Bike, House, Store } from 'lucide-react-native'
import { colors, fonts } from '../theme'

// Seurannan kartta (20.11.2026, Uber Eatsin karttakortin mallista):
// hillitty pohja, kaareva musta reitti ravintolasta (tai noutaneesta
// kuljettajasta) kotiin, matka reitin keskellä ja omat merkit. Kuljettaja
// näkyy oranssina reaaliajassa. react-native-maps: iPhonella Apple Maps
// (ilmainen), Androidilla Google Maps (kauppaversio tarvitsee avaimen).
// Verkkoversiossa TrackingMap.web.jsx.
export default function TrackingMap({ restaurant, destination, courier, hideRestaurant, distanceLabel, bottomInset = 40, style }) {
  const mapRef = useRef(null)
  const shop = !hideRestaurant && valid(restaurant) ? toLatLng(restaurant) : null
  const home = valid(destination) ? toLatLng(destination) : null
  const bike = valid(courier) ? toLatLng(courier) : null
  const from = shop ?? bike
  const key = [shop, bike, home].map((p) => (p ? `${p.latitude},${p.longitude}` : '-')).join('|')

  const arc = useMemo(() => (from && home ? curve(from, home) : null), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const points = useMemo(() => [shop, bike, home].filter(Boolean), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const first = points[0] ?? { latitude: 62.8924, longitude: 27.677 }

  useEffect(() => {
    if (points.length < 2) return undefined
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(arc ? [...points, arc[Math.floor(arc.length / 2)]] : points, {
        edgePadding: { top: 50, right: 50, bottom: bottomInset, left: 50 },
        animated: true,
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [points, arc, bottomInset])

  return (
    <MapView
      ref={mapRef}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={{ ...first, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      customMapStyle={Platform.OS === 'android' ? MUTED_STYLE : undefined}
      showsPointsOfInterest={false}
      showsBuildings={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      {arc ? <Polyline coordinates={arc} strokeColor={colors.black} strokeWidth={3} lineCap="round" /> : null}
      {arc && distanceLabel ? (
        <Marker coordinate={arc[Math.floor(arc.length / 2)]} anchor={{ x: 0.5, y: 1.2 }} tracksViewChanges={false}>
          <View style={styles.label}>
            <Text style={styles.labelText}>{distanceLabel}</Text>
          </View>
        </Marker>
      ) : null}
      {shop ? (
        <Marker coordinate={shop} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <Pin Icon={Store} />
        </Marker>
      ) : null}
      {home ? (
        <Marker coordinate={home} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <Pin Icon={House} />
        </Marker>
      ) : null}
      {bike ? (
        <Marker coordinate={bike} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <Pin Icon={Bike} courier />
        </Marker>
      ) : null}
    </MapView>
  )
}

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

// Päätepisteet: valkoinen pyöreä merkki mustalla reunalla; kuljettaja oranssi.
function Pin({ Icon, courier = false }) {
  const size = courier ? 40 : 32
  return (
    <View
      style={[
        styles.pin,
        { width: size, height: size, borderRadius: size / 2 },
        courier && { backgroundColor: colors.orange, borderColor: '#ffffff' },
      ]}
    >
      <Icon size={courier ? 19 : 15} strokeWidth={2.2} color={courier ? '#ffffff' : colors.black} />
    </View>
  )
}

const valid = (p) => p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
const toLatLng = (p) => ({ latitude: Number(p.lat), longitude: Number(p.lng) })

const MUTED_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f3f3f1' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a86' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f3f3f1' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6e6e3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dfe6ea' }] },
]

const styles = StyleSheet.create({
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.black,
    backgroundColor: '#ffffff',
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

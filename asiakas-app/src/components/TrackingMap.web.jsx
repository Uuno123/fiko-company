import { StyleSheet, View } from 'react-native'

// Verkkoversion (esikatselu) kartta: react-native-maps ei toimi selaimessa,
// joten OpenStreetMapin upotus samoilla pisteillä. Puhelimessa käytetään
// TrackingMap.jsx:ää (Apple / Google Maps).
// eslint-disable-next-line no-unused-vars
export default function TrackingMap({ restaurant, destination, courier, hideRestaurant, bottomInset, distanceLabel, style }) {
  const points = [!hideRestaurant ? restaurant : null, destination, courier].filter(
    (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)),
  )
  const lats = points.map((p) => Number(p.lat))
  const lngs = points.map((p) => Number(p.lng))
  const pad = 0.006
  const bbox = points.length
    ? [Math.min(...lngs) - pad, Math.min(...lats) - pad, Math.max(...lngs) + pad, Math.max(...lats) + pad]
    : [27.66, 62.885, 27.69, 62.9]
  const marker = destination && Number.isFinite(Number(destination.lat)) ? `&marker=${destination.lat},${destination.lng}` : ''
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.join(',')}&layer=mapnik${marker}`
  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <iframe title="Kartta" src={src} style={{ width: '100%', height: '100%', border: 0 }} />
    </View>
  )
}

import { useEffect, useRef } from 'react'
import { Linking, StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { LAND_COLOR, syncScript, useMapHtml } from '../lib/mapHtml'

// Puhelimen kartta: MapLibre WebView'ssä (ks. lib/mapHtml.js). Selaimessa
// käytetään MapView.web.jsx:ää. dimmed: kartta haalistettuna (offline-tila).
// position: kuljettajan sijainti { lat, lng } sinisenä pisteenä. route:
// keikan reitti { from, to }. topInset / bottomInset: kuinka paljon kartan ylä-
// ja alareunasta on palkkien alla (px). interactive: false = esikatselukuva.
export default function MapView({
  center,
  zoom,
  dimmed = false,
  position = null,
  route = null,
  topInset = 0,
  bottomInset = 0,
  interactive = true,
  style,
}) {
  const html = useMapHtml({ center, zoom, dimmed, interactive })
  const webRef = useRef(null)
  const script = syncScript({ dimmed, position, route, topInset, bottomInset })
  const scriptRef = useRef(script)
  scriptRef.current = script

  useEffect(() => {
    webRef.current?.injectJavaScript(script)
  }, [script])

  return (
    <View style={[styles.container, style]}>
      {html && (
        <WebView
          ref={webRef}
          source={{ html }}
          originWhitelist={['*']}
          style={styles.web}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          setSupportMultipleWindows={false}
          // Tila on voinut muuttua ennen kuin kartta ehti latautua.
          onLoadEnd={() => webRef.current?.injectJavaScript(scriptRef.current)}
          // Tekijätietojen linkit avataan selaimessa - muuten WebView siirtyisi
          // pois kartalta.
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith('http')) {
              Linking.openURL(request.url)
              return false
            }
            return true
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LAND_COLOR,
  },
  web: {
    flex: 1,
    backgroundColor: LAND_COLOR,
  },
})

import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { LAND_COLOR, useMapHtml } from '../lib/mapHtml'
import { tr } from '../lib/i18n'

// Selainversio (esikatselu tietokoneella): WebView ei toimi selaimessa, joten
// sama kartan HTML näytetään iframessa.
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
  const frameRef = useRef(null)

  function sync() {
    frameRef.current?.contentWindow?.delivoSync?.({ dimmed, position, route, topInset, bottomInset })
  }
  useEffect(() => {
    sync()
  })

  return (
    <View style={[styles.container, style]}>
      {html && (
        <iframe
          ref={frameRef}
          title={tr('common.map')}
          srcDoc={html}
          onLoad={sync}
          style={{ border: 0, width: '100%', height: '100%' }}
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
})

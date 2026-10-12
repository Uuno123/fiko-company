import { useEffect, useState } from 'react'
import { Keyboard, Platform } from 'react-native'

// Näppäimistön korkeus (px), jotta kentät ja napit eivät jää sen alle.
// Puhelimen koko näytön tilassa (edge-to-edge) näkymä ei pienene itsestään.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0))
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return height
}

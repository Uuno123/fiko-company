import { useEffect } from 'react'
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio'

// Lyhyt ääni uudesta keikkatarjouksesta (Asetukset > Ääni uudesta keikasta).
// Soi myös äänettömällä tilalla, ettei tarjous mene ohi.
const OFFER_SOUND = require('../../assets/sounds/new-offer.wav')

let audioModeSet = false

export function useOfferSound(offerId, enabled) {
  const player = useAudioPlayer(OFFER_SOUND)

  useEffect(() => {
    if (!offerId || !enabled) return
    if (!audioModeSet) {
      audioModeSet = true
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    }
    try {
      Promise.resolve(player.seekTo(0)).catch(() => {})
      player.play()
    } catch {
      // Ääni ei ole välttämätön - tarjous näkyy silti.
    }
  }, [offerId, enabled, player])
}

import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import LocationModal from './LocationModal.jsx'
import { CONSENT_CHANGED_EVENT, getCookieConsent } from '../lib/cookieConsent.js'
import { OPEN_ADDRESS_PICKER_EVENT, getDeliveryAddress } from '../lib/deliveryAddress.js'

// Osoite kysytään vasta kun käyttäjä avaa ravintolan - etusivulla, haussa ja
// kategorioissa saa selata rauhassa ilman ikkunaa (käyttäjän toive).
function isRestaurantPage(pathname) {
  return pathname.startsWith('/ravintola/')
}

// Ensin evästevalinta (CookieConsent), sitten osoite. Ilman tallennettua osoitetta
// kysytään JOKA kerta kun ravintola avataan - "Selaa ilman osoitetta" sulkee
// ikkunan vain tältä ravintolalta. Ikkunan voi avata myös headerin osoitenapista
// (openAddressPicker).
function AddressGate() {
  const { pathname } = useLocation()
  const [consentDecided, setConsentDecided] = useState(() => getCookieConsent() !== null)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    function onConsent() {
      setConsentDecided(true)
    }
    function onOpen() {
      setMode('change')
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsent)
    window.addEventListener(OPEN_ADDRESS_PICKER_EVENT, onOpen)
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onConsent)
      window.removeEventListener(OPEN_ADDRESS_PICKER_EVENT, onOpen)
    }
  }, [])

  // promptedForRef: sama ravintola ei kysy uudelleen heti ikkunan sulkeuduttua,
  // mutta seuraava ravintola (tai paluu samaan muualta) kysyy taas.
  const promptedForRef = useRef(null)
  useEffect(() => {
    if (!isRestaurantPage(pathname)) {
      promptedForRef.current = null
      return
    }
    if (mode || !consentDecided || getDeliveryAddress() || promptedForRef.current === pathname) return
    promptedForRef.current = pathname
    setMode('welcome')
  }, [consentDecided, pathname, mode])

  if (!mode) return null

  return <LocationModal mode={mode} onClose={() => setMode(null)} />
}

export default AddressGate

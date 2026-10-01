import { useEffect, useRef, useState } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import {
  SEARCH_DEBOUNCE_MS,
  currentPosition,
  geocodeAddress,
  resolveSuggestion,
  reverseGeocode,
  searchAddresses,
} from '../lib/geocode.js'
import { getDeliveryAddress, saveDeliveryAddress } from '../lib/deliveryAddress.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './LocationModal.css'

// Toimitusosoitteen valinta. Kaksi tilaa:
//   welcome - aukeaa itsestään kun ravintola avataan ilman tallennettua
//             osoitetta (AddressGate). Ohitettavissa - kysytään taas seuraavalla
//             ravintolalla.
//   change  - headerin osoitenapista, vaihtaa tallennetun osoitteen.
//
// Osoite tallennetaan selaimeen (lib/deliveryAddress.js), ei tilille - se
// kysytään jo ennen kirjautumista. Kassa esitäyttää toimitusosoitteen siitä.
function LocationModal({ mode = 'change', onClose }) {
  const { customer } = useAuth()
  const current = getDeliveryAddress()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [chosen, setChosen] = useState(null)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const isWelcome = mode === 'welcome'

  // Tervetuloikkunassa ei kohdisteta kenttään: puhelimella näppäimistö
  // peittäisi "Käytä nykyistä sijaintia" -napin, joka on nopein tapa.
  useEffect(() => {
    if (!isWelcome) inputRef.current?.focus()
  }, [isWelcome])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function dismiss() {
    onClose()
  }

  function handleQueryChange(e) {
    const next = e.target.value
    setQuery(next)
    setChosen(null)
    setError('')

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (next.trim().length < 3) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const found = await searchAddresses(next)
        setResults(found)
        if (found.length === 0) setError('Osoitetta ei löytynyt. Kokeile kirjoittaa kadun nimi ja numero.')
      } catch {
        setResults([])
        setError('Osoitehaku ei juuri nyt vastaa. Yritä hetken päästä uudelleen.')
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  function choose(address) {
    setChosen(address)
    setQuery(address.full)
    setResults([])
    setError('')
  }

  // Googlen hakuehdotuksella ei ole vielä koordinaatteja - ne haetaan valittaessa.
  async function chooseSuggestion(suggestion) {
    setQuery(suggestion.full)
    setResults([])
    setError('')
    setSearching(true)
    try {
      const address = await resolveSuggestion(suggestion)
      if (address) choose(address)
      else setError('Osoitteen sijaintia ei löytynyt. Kokeile toista hakutulosta.')
    } catch {
      setError('Osoitehaku ei juuri nyt vastaa. Yritä hetken päästä uudelleen.')
    } finally {
      setSearching(false)
    }
  }

  async function useMyLocation() {
    setError('')
    setLocating(true)
    try {
      const coords = await currentPosition()
      choose(await reverseGeocode(coords.lat, coords.lng))
    } catch (err) {
      setError(`${err.message} Voit myös kirjoittaa osoitteen kenttään.`)
    } finally {
      setLocating(false)
    }
  }

  // Profiilin osoite on pelkkää tekstiä ilman koordinaatteja, joten se haetaan
  // kerran osoitehausta ennen kuin sitä voi käyttää etäisyyksiin.
  async function useProfileAddress() {
    setError('')
    setSearching(true)
    try {
      const address = await geocodeAddress(customer.address)
      if (address) choose(address)
      else setError('Profiilisi osoitetta ei löytynyt kartalta. Kirjoita osoite kenttään.')
    } catch {
      setError('Osoitehaku ei juuri nyt vastaa. Yritä hetken päästä uudelleen.')
    } finally {
      setSearching(false)
    }
  }

  function confirm() {
    if (!chosen) return
    saveDeliveryAddress(chosen)
    onClose()
  }

  return (
    <div
      className="location-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-modal-title">
        <button type="button" className="location-modal__close" aria-label="Sulje" onClick={dismiss}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        {isWelcome && (
          <span className="location-modal__hero" aria-hidden="true">
            <MapPin size={26} strokeWidth={2} />
          </span>
        )}

        <h2 className="location-modal__title" id="location-modal-title">
          {isWelcome ? 'Minne toimitetaan?' : 'Toimitusosoite'}
        </h2>
        <p className="location-modal__lead">
          {isWelcome
            ? 'Lisää osoitteesi, niin näytämme lähimmät ravintolat ja niiden toimitusajat.'
            : 'Näytämme lähimmät ravintolat ja kassa täyttää osoitteen valmiiksi.'}
        </p>

        <button type="button" className="location-modal__geo" onClick={useMyLocation} disabled={locating}>
          <span className="location-modal__geo-icon" aria-hidden="true">
            {locating ? <span className="location-modal__spinner" /> : <Navigation size={18} strokeWidth={2} />}
          </span>
          <span className="location-modal__geo-text">
            <strong>{locating ? 'Paikannetaan…' : 'Käytä nykyistä sijaintia'}</strong>
            <span>Selain kysyy lupaa sijaintiin</span>
          </span>
        </button>

        {customer?.address && (
          <button type="button" className="location-modal__option" onClick={useProfileAddress}>
            <MapPin size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong>Profiilin osoite</strong>
              <span>{customer.address}</span>
            </span>
          </button>
        )}

        {!isWelcome && current && !chosen && (
          <div className="location-modal__option location-modal__option--current">
            <MapPin size={17} strokeWidth={1.9} aria-hidden="true" />
            <span>
              <strong>Nykyinen osoite</strong>
              <span>{current.full}</span>
            </span>
          </div>
        )}

        <div className="location-modal__divider">
          <span>tai hae osoitteella</span>
        </div>

        <div className="location-modal__field">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Kadun nimi, numero ja kaupunki"
            aria-label="Kadun nimi, numero ja kaupunki"
            autoComplete="street-address"
          />

          {searching && <span className="location-modal__searching">Haetaan…</span>}
        </div>

        {/* Lista on kentän alla normaalissa järjestyksessä eikä kelluvana:
            ikkuna vierittyy, joten kelluva lista leikkautuisi sen alareunaan. */}
        {results.length > 0 && (
          <ul className="location-modal__results">
            {results.map((result) => (
              <li key={result.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => chooseSuggestion(result)}>
                  <MapPin size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>
                    <strong>{result.label}</strong>
                    <span>{result.full}</span>
                  </span>
                </button>
              </li>
            ))}
            {/* Googlen ehdot: ilman Google-karttaa näytetyissä hakutuloksissa
                pitää mainita Google Maps lähteenä. */}
            {results.some((result) => result.placeId) && (
              <li className="location-modal__attribution">Google Maps</li>
            )}
          </ul>
        )}

        {error && (
          <p className="location-modal__error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="location-modal__submit" onClick={confirm} disabled={!chosen}>
          {chosen ? 'Tallenna osoite' : 'Valitse osoite'}
        </button>

        {isWelcome && (
          <button type="button" className="location-modal__skip" onClick={dismiss}>
            Selaa ilman osoitetta
          </button>
        )}
      </div>
    </div>
  )
}

export default LocationModal

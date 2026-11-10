import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, House, MapPin, Navigation, Pencil, Plus, Search } from 'lucide-react'
import {
  SEARCH_DEBOUNCE_MS,
  currentPosition,
  geocodeAddress,
  resolveSuggestion,
  reverseGeocode,
  searchAddresses,
} from '../lib/geocode.js'
import {
  OUTSIDE_SERVICE_AREA_MESSAGE,
  getDeliveryAddress,
  isInServiceArea,
  saveDeliveryAddress,
} from '../lib/deliveryAddress.js'
import { useAuth } from '../lib/AuthContext.jsx'
import './LocationModal.css'

// Toimitusosoitteen valinta. Kaksi tilaa:
//   welcome - aukeaa itsestään kun ravintola avataan ilman tallennettua
//             osoitetta (AddressGate). Ohitettavissa - kysytään taas seuraavalla
//             ravintolalla.
//   change  - headerin osoitenapista, vaihtaa tallennetun osoitteen.
//
// Woltin mallin mukaan (käyttäjän mallikuva 10.11.2026) kaksi näkymää:
//   list   - tallennetut osoitteet Valitse-napeilla, "Lisää uusi osoite" ja
//            "Käytä nykyistä sijaintia".
//   search - uuden osoitteen haku.
//
// Osoite tallennetaan selaimeen (lib/deliveryAddress.js), ei tilille - se
// kysytään jo ennen kirjautumista. Kassa esitäyttää toimitusosoitteen siitä.
function LocationModal({ mode = 'change', onClose }) {
  const { customer } = useAuth()
  const current = getDeliveryAddress()
  const [view, setView] = useState('list')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [chosen, setChosen] = useState(null)
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)
  const isWelcome = mode === 'welcome'

  // Hakunäkymässä kenttä kohdistetaan heti.
  useEffect(() => {
    if (view === 'search') inputRef.current?.focus()
  }, [view])

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

  function openSearch(prefill = '') {
    setQuery(prefill)
    setResults([])
    setChosen(null)
    setError('')
    setView('search')
  }

  function backToList() {
    setResults([])
    setChosen(null)
    setError('')
    setView('list')
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

  // Vain Kuopion alueen osoitteet (käyttäjän pyyntö 2.11.2026).
  function choose(address) {
    if (!isInServiceArea(address)) {
      setChosen(null)
      setResults([])
      setError(OUTSIDE_SERVICE_AREA_MESSAGE)
      return false
    }
    setChosen(address)
    setQuery(address.full)
    setResults([])
    setError('')
    return true
  }

  // Listanäkymän valinnat tallentuvat heti ilman erillistä vahvistusta.
  function chooseAndSave(address) {
    if (!choose(address)) return
    saveDeliveryAddress(address)
    onClose()
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
      chooseAndSave(await reverseGeocode(coords.lat, coords.lng))
    } catch (err) {
      setError(`${err.message} Voit myös lisätä osoitteen käsin.`)
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
      if (address) chooseAndSave(address)
      else setError('Profiilisi osoitetta ei löytynyt kartalta. Lisää osoite käsin.')
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

  const sameAsCurrent = (text) => current && text && current.full?.toLowerCase() === text.toLowerCase()
  const showProfile = customer?.address && !sameAsCurrent(customer.address)

  return (
    <div
      className="location-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="location-modal" role="dialog" aria-modal="true" aria-labelledby="location-modal-title">
        <div className="location-modal__top">
          {view === 'search' && (
            <button type="button" className="location-modal__icon-btn" aria-label="Takaisin" onClick={backToList}>
              <ArrowLeft size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
          {/* Otsikko samalla rivillä sulkunapin kanssa (käyttäjän pyyntö 10.11.2026). */}
          <h2 className="location-modal__title" id="location-modal-title">
            {view === 'search' ? 'Lisää osoite' : 'Minne ruoka tuodaan?'}
          </h2>
          <button type="button" className="location-modal__icon-btn" aria-label="Sulje" onClick={dismiss}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="18" height="18">
              <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {view === 'list' ? (
          <>
            <div className="location-modal__saved">
              {current && (
                <div className="location-modal__saved-row">
                  <span className="location-modal__pin" aria-hidden="true">
                    <MapPin size={18} strokeWidth={2.2} />
                  </span>
                  <span className="location-modal__saved-text">
                    <strong>
                      {current.label || 'Nykyinen'}
                      <Check size={14} strokeWidth={2.6} aria-label="Valittu" />
                    </strong>
                    <span>{current.full}</span>
                  </span>
                  <button
                    type="button"
                    className="location-modal__edit"
                    aria-label="Muokkaa osoitetta"
                    onClick={() => openSearch(current.full)}
                  >
                    <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                  <button type="button" className="location-modal__pick" onClick={dismiss}>
                    Valitse
                  </button>
                </div>
              )}

              {showProfile && (
                <div className="location-modal__saved-row">
                  <span className="location-modal__pin" aria-hidden="true">
                    <House size={18} strokeWidth={2.2} />
                  </span>
                  <span className="location-modal__saved-text">
                    <strong>Koti</strong>
                    <span>{customer.address}</span>
                  </span>
                  <button
                    type="button"
                    className="location-modal__edit"
                    aria-label="Muokkaa osoitetta"
                    onClick={() => openSearch(customer.address)}
                  >
                    <Pencil size={16} strokeWidth={2.2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="location-modal__pick"
                    onClick={useProfileAddress}
                    disabled={searching}
                  >
                    {searching ? 'Haetaan…' : 'Valitse'}
                  </button>
                </div>
              )}
            </div>

            <div className="location-modal__actions">
              <button type="button" className="location-modal__action" onClick={() => openSearch()}>
                <Plus size={20} strokeWidth={2} aria-hidden="true" />
                Lisää uusi osoite
              </button>
              <button type="button" className="location-modal__action" onClick={useMyLocation} disabled={locating}>
                {locating ? (
                  <span className="location-modal__spinner" aria-hidden="true" />
                ) : (
                  <Navigation size={19} strokeWidth={2} aria-hidden="true" />
                )}
                {locating ? 'Paikannetaan…' : 'Käytä nykyistä sijaintia'}
              </button>
            </div>

            {error && (
              <p className="location-modal__error" role="alert">
                {error}
              </p>
            )}

            {isWelcome && (
              <button type="button" className="location-modal__skip" onClick={dismiss}>
                Selaa ilman osoitetta
              </button>
            )}
          </>
        ) : (
          <>
            <div className="location-modal__field">
              <Search className="location-modal__field-icon" size={18} strokeWidth={2.2} aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Hae katuosoitetta"
                aria-label="Hae katuosoitetta"
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
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chooseSuggestion(result)}
                    >
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

            {chosen && (
              <button type="button" className="location-modal__submit" onClick={confirm}>
                Tallenna osoite
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default LocationModal

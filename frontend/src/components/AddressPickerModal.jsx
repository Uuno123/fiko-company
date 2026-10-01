import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Navigation } from 'lucide-react'
import {
  SEARCH_DEBOUNCE_MS,
  currentPosition,
  geocodeAddress,
  haversineKm,
  resolveSuggestion,
  reverseGeocode,
  searchAddresses,
} from '../lib/geocode.js'
import { formatDisplayAddress } from '../lib/format.js'
import { useMapView } from '../lib/mapView.js'
import './AddressPickerModal.css'

const DEFAULT_CENTER = { lat: 62.8924, lng: 27.677 } // Kuopio - delivon esimerkkidatan kaupunki
const FOCUS_ZOOM = 17
const LOOKUP_DELAY_MS = 500

// Näin lähellä tunnettua osoitetta osoite pidetään ennallaan: käyttäjä vain
// tarkentaa merkin esim. sisäänkäynnille, eikä "Puijonkatu 18" saa vaihtua
// naapuritalon numeroon käänteishaun epätarkkuuden takia.
const KEEP_ADDRESS_KM = 0.1

// Osoitteen valinta ponnahdusikkunassa: haku, oma sijainti ja iso kartta.
// Merkki pysyy keskellä ja karttaa siirretään sen alla, kuten Woltissa -
// tarkempi kuin pienen merkin raahaaminen sormella.
//   initial: { address, lat?, lng? } tai null. Ilman koordinaatteja osoite
//            paikannetaan avattaessa.
//   onConfirm({ address, lat, lng }): voi olla async - jos se heittää virheen,
//            ikkuna pysyy auki ja näyttää viestin. Onnistuessa vanhempi sulkee ikkunan.
function AddressPickerModal({ initial, title = 'Toimitusosoite', confirmLabel = 'Vahvista osoite', onConfirm, onClose }) {
  const initialAddress = formatDisplayAddress(initial?.address) || ''
  const initialPoint = initial?.lat && initial?.lng ? { lat: Number(initial.lat), lng: Number(initial.lng) } : null

  const mapRef = useRef(null)
  const debounceRef = useRef(null)
  const lookupRef = useRef({ timer: null, seq: 0 })
  // Kohta, jonka osoite tiedetään varmasti (hakutulos, paikannus, alkuperäinen osoite).
  const anchorRef = useRef(initialPoint ? { address: initialAddress, ...initialPoint } : null)
  // Kartan edellinen keskipiste - Google ilmoittaa siirron myös kartan latautuessa,
  // eikä se saa käynnistää osoitehakua oletuskaupungin keskustasta.
  const lastCenterRef = useRef(initialPoint ?? DEFAULT_CENTER)

  const [query, setQuery] = useState(initialAddress)
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  // Merkin kohta - null kunnes osoite on haettu tai karttaa on siirretty.
  const [center, setCenter] = useState(initialPoint)
  const [address, setAddress] = useState(initialPoint ? initialAddress : '')
  const [looking, setLooking] = useState(false)
  // Kohta, johon kartta siirretään ohjelmallisesti (hakutulos, paikannus).
  const [focus, setFocus] = useState(initialPoint)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const mapView = useMapView(mapRef, {
    center: initialPoint ?? DEFAULT_CENTER,
    zoom: initialPoint ? FOCUS_ZOOM : 12,
    gestures: 'greedy',
  })

  function cancelLookup() {
    clearTimeout(lookupRef.current.timer)
    return ++lookupRef.current.seq
  }

  function placeAt(found) {
    const point = { lat: found.lat, lng: found.lng }
    anchorRef.current = { address: found.full, ...point }
    cancelLookup()
    setAddress(found.full)
    setQuery(found.full)
    setResults([])
    setLooking(false)
    setError('')
    setCenter(point)
    setFocus(point)
  }

  function handleMoveEnd(next) {
    if (haversineKm(lastCenterRef.current, next) < 0.001) return
    lastCenterRef.current = next
    setCenter(next)
    const seq = cancelLookup()

    const anchor = anchorRef.current
    if (anchor && haversineKm(anchor, next) < KEEP_ADDRESS_KM) {
      setAddress(anchor.address)
      setQuery(anchor.address)
      setLooking(false)
      return
    }

    setLooking(true)
    lookupRef.current.timer = setTimeout(async () => {
      let found = ''
      try {
        found = (await reverseGeocode(next.lat, next.lng)).full
      } catch {
        // Kohdalle ei löytynyt osoitetta - vahvistus pysyy pois käytöstä.
      }
      if (seq !== lookupRef.current.seq) return
      setAddress(found)
      if (found) setQuery(found)
      setLooking(false)
    }, LOOKUP_DELAY_MS)
  }

  useEffect(() => {
    if (!mapView) return
    const offMove = mapView.onMoveEnd(handleMoveEnd)
    // Klikkaus siirtää kohdan merkin alle.
    const offClick = mapView.onClick((point) => mapView.panTo(point))
    return () => {
      offMove()
      offClick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapView])

  useEffect(() => {
    if (mapView && focus) mapView.setView(focus, FOCUS_ZOOM)
  }, [mapView, focus])

  // Tallennettu osoite ilman koordinaatteja (esim. profiilin osoite) paikannetaan kerran.
  useEffect(() => {
    if (initialPoint || !initialAddress) return
    let cancelled = false
    geocodeAddress(initialAddress)
      .then((found) => {
        if (!cancelled && found) placeAt({ ...found, full: initialAddress })
      })
      .catch(() => {
        // Ei löytynyt - käyttäjä hakee tai siirtää karttaa itse.
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Suljettaessa kesken olevat haut hylätään.
  useEffect(() => {
    const lookup = lookupRef.current
    return () => {
      clearTimeout(lookup.timer)
      lookup.seq++
      clearTimeout(debounceRef.current)
    }
  }, [])

  function handleQueryChange(e) {
    const next = e.target.value
    setQuery(next)
    setError('')
    clearTimeout(debounceRef.current)

    if (next.trim().length < 3) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        setResults(await searchAddresses(next))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  async function selectResult(suggestion) {
    setQuery(suggestion.full)
    setResults([])
    setSearching(true)
    try {
      const found = await resolveSuggestion(suggestion)
      if (found) placeAt(found)
      else setError('Osoitteen sijaintia ei löytynyt. Siirrä karttaa merkin kohdalle.')
    } catch {
      setError('Osoitehaku ei juuri nyt vastaa. Siirrä karttaa merkin kohdalle.')
    } finally {
      setSearching(false)
    }
  }

  async function useMyLocation() {
    setError('')
    setLocating(true)
    try {
      const coords = await currentPosition()
      placeAt(await reverseGeocode(coords.lat, coords.lng))
    } catch (err) {
      setError(err.message)
    } finally {
      setLocating(false)
    }
  }

  async function confirm() {
    setError('')
    setSaving(true)
    try {
      await onConfirm({ address, lat: center.lat, lng: center.lng })
    } catch (err) {
      setError(err?.message || 'Tallennus epäonnistui. Yritä uudelleen.')
      setSaving(false)
    }
  }

  const canConfirm = Boolean(center && address) && !looking && !saving

  // Portaali bodyyn: avaava nappi on usein vierivän paneelin sisällä, joka leikkaisi ikkunan.
  return createPortal(
    <div
      className="address-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="address-modal" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
        <button type="button" className="address-modal__close" aria-label="Sulje" onClick={onClose}>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="address-modal__title" id="address-modal-title">
          {title}
        </h2>

        <div className="address-modal__search">
          <input
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Kadun nimi, numero ja kaupunki"
            aria-label="Hae osoitetta"
            autoComplete="off"
          />
          {searching && <span className="address-modal__spinner" aria-hidden="true" />}

          {results.length > 0 && (
            <ul className="address-modal__results">
              {results.map((result) => (
                <li key={result.id}>
                  <button type="button" onClick={() => selectResult(result)}>
                    <MapPin size={16} strokeWidth={1.9} aria-hidden="true" />
                    <span>
                      <strong>{result.label}</strong>
                      <span>{result.full}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" className="address-modal__locate" onClick={useMyLocation} disabled={locating}>
          <Navigation size={15} strokeWidth={2} aria-hidden="true" />
          {locating ? 'Paikannetaan…' : 'Käytä nykyistä sijaintia'}
        </button>

        <div className="address-modal__map">
          <div ref={mapRef} className="address-modal__canvas" />
          <span className="address-modal__pin" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 18s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
              <circle cx="10" cy="8" r="2.4" fill="#fff" />
            </svg>
          </span>
          <span className="address-modal__pin-dot" aria-hidden="true" />
          <span className="address-modal__map-hint">Siirrä karttaa tarkentaaksesi kohtaa</span>
        </div>

        <p className={`address-modal__address${address ? '' : ' address-modal__address--empty'}`} aria-live="polite">
          <MapPin size={18} strokeWidth={2} aria-hidden="true" />
          <span>
            {looking
              ? 'Haetaan osoitetta…'
              : address || (center ? 'Tästä kohdasta ei löytynyt osoitetta' : 'Hae osoite tai siirrä karttaa')}
          </span>
        </p>

        {error && (
          <p className="address-modal__error" role="alert">
            {error}
          </p>
        )}

        <button type="button" className="address-modal__confirm" disabled={!canConfirm} onClick={confirm}>
          {saving ? 'Tallennetaan…' : confirmLabel}
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default AddressPickerModal

import { useCallback, useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import AddressPickerModal from './AddressPickerModal.jsx'
import { geocodeAddress } from '../lib/geocode.js'
import { formatDisplayAddress } from '../lib/format.js'
import { useMapView } from '../lib/mapView.js'
import './AddressMapPicker.css'

const DEFAULT_CENTER = { lat: 62.8924, lng: 27.677 } // Kuopio - delivon esimerkkidatan kaupunki

// Lomakkeen osoitekenttä: valittu osoite + pieni esikatselukartta. Kumpikin avaa
// osoiteikkunan (AddressPickerModal), jossa osoitteen voi hakea ja kohdan säätää.
// onChange(address, coords, { interactive }) - interactive on false, kun
// koordinaatit vain haettiin valmiiksi annetulle osoitteelle.
function AddressMapPicker({ id, value, onChange, modalTitle = 'Valitse osoite' }) {
  const mapContainerRef = useRef(null)
  // Viimeisin osoite, jonka tämä komponentti itse antoi vanhemmalle. Kun se
  // kaikuu takaisin value-propina, sitä ei paikanneta uudelleen - muuten
  // jokainen valinta maksaisi ylimääräisen osoitehaun ja korvaisi tarkennetun
  // sijainnin osoitteen keskipisteellä.
  const emittedRef = useRef(null)
  // Vanhat osoitteet on voitu tallentaa Nominatimin pitkässä muodossa
  // ("18, Puijonkatu, Multimäki, Kuopio, ..., Suomi") - näytetään lyhyenä.
  const display = formatDisplayAddress(value) || ''

  // Valittu osoite ja sen sijainti: { address, lat, lng } tai null.
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)

  const mapView = useMapView(mapContainerRef, {
    center: DEFAULT_CENTER,
    zoom: 12,
    controls: false,
    gestures: 'none',
  })

  function emit(address, coords, interactive) {
    emittedRef.current = address
    onChange(address, coords, { interactive })
  }

  useEffect(() => {
    if (!mapView || !selected) return
    const pin = mapView.addPin(selected, 'dest')
    mapView.setView(selected, 16)
    return () => pin.remove()
  }, [mapView, selected])

  // Ulkopuolelta tullut osoite (esim. tallennettu ravintolan osoite) paikannetaan
  // esikatselua varten, ja lyhyt muoto koordinaatteineen palautetaan vanhemmalle.
  useEffect(() => {
    if (!display.trim()) {
      setSelected(null)
      return
    }
    if (value === emittedRef.current) return
    let cancelled = false
    geocodeAddress(display)
      .then((found) => {
        if (cancelled || !found) return
        const coords = { lat: found.lat, lng: found.lng }
        setSelected({ address: display, ...coords })
        // Sama osoite kaikuu takaisin, joten tämä ei aiheuta silmukkaa.
        emit(display, coords, false)
      })
      .catch(() => {
        // Hiljainen epäonnistuminen - kenttä näyttää silti osoitteen.
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function confirm(picked) {
    setOpen(false)
    setSelected(picked)
    emit(picked.address, { lat: picked.lat, lng: picked.lng }, true)
  }

  const close = useCallback(() => setOpen(false), [])

  return (
    <div className="address-picker">
      <button id={id} type="button" className="address-picker__field" onClick={() => setOpen(true)}>
        <MapPin size={18} strokeWidth={2} aria-hidden="true" />
        <span className={`address-picker__value${display ? '' : ' address-picker__value--empty'}`}>
          {display || 'Valitse osoite'}
        </span>
        <span className="address-picker__change">{display ? 'Muuta' : 'Valitse'}</span>
      </button>

      {/* Esikatselu ei liiku itse - koko alue avaa osoiteikkunan. */}
      <div className="address-picker__preview">
        <div ref={mapContainerRef} className="address-picker__map" />
        <button
          type="button"
          className="address-picker__adjust"
          aria-label="Tarkenna sijaintia kartalla"
          onClick={() => setOpen(true)}
        >
          <span className="address-picker__adjust-label">Tarkenna sijaintia</span>
        </button>
      </div>

      {open && (
        <AddressPickerModal
          title={modalTitle}
          initial={selected?.address === display ? selected : display ? { address: display } : null}
          onConfirm={confirm}
          onClose={close}
        />
      )}
    </div>
  )
}

export default AddressMapPicker

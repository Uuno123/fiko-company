import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './AddressMapPicker.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER = [62.8924, 27.677] // Kuopio - delivon esimerkkidatan kaupunki
const DEFAULT_ZOOM = 13
const SEARCH_DEBOUNCE_MS = 600

async function fetchNominatim(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('Osoitehaku epäonnistui')
  return res.json()
}

function AddressMapPicker({ id, value, onChange }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const debounceRef = useRef(null)

  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return

    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-tekijät',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', async (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng)
      try {
        const data = await fetchNominatim(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&addressdetails=1`,
        )
        if (data.display_name) {
          setQuery(data.display_name)
          onChange(data.display_name, { lat: e.latlng.lat, lng: e.latlng.lng }, { interactive: true })
        }
      } catch {
        // Osoitteen haku kartalta epäonnistui - marker jää silti näkyviin, käyttäjä voi kirjoittaa osoitteen käsin.
      }
    })

    mapRef.current = map

    return () => {
      // map.stop() ennen remove():a - muuten Leafletin oma pan/zoom-animaatio (setView) voi
      // yrittää päivittää DOM:ia komponentin purkamisen jälkeen ja kaataa koko sivun
      // ("Cannot read properties of undefined (reading '_leaflet_pos')"). Tapahtuu helposti
      // tässä, koska valinta (klikkaus/haku) usein sekä liikuttaa karttaa että vaihtaa
      // näkymän pois tästä komponentista lähes samaan aikaan.
      map.stop()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pitää tekstikentän ja kartan pinnin synkassa kun value tulee ulkopuolelta
  // (esim. "Käytä profiilin sijaintia" -nappi, tai kun tämä komponentti mountataan uudelleen
  // "Muokkaa osoitetta" -painikkeesta jo tunnetulla osoitteella). interactive: false, koska
  // tämä on passiivinen synkronointi eikä käyttäjän juuri tekemä valinta - vanhempi ei saa
  // tulkita tätä signaaliksi sulkea muokkaustila (ks. Cart.jsx).
  useEffect(() => {
    setQuery(value || '')
    if (value && value.trim()) {
      geocodeAndPlace(value).then((coords) => {
        // value ei muutu tästä (sama osoite kaiuu takaisin), joten tämä ei aiheuta silmukkaa -
        // ainoastaan koordinaatit kulkevat vanhemmalle (esim. reitti+ETA-näkymää varten).
        if (coords) onChange(value, coords, { interactive: false })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  async function geocodeAndPlace(address) {
    try {
      const data = await fetchNominatim(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=fi&limit=1`,
      )
      if (data[0]) {
        const lat = parseFloat(data[0].lat)
        const lng = parseFloat(data[0].lon)
        placeMarker(lat, lng)
        return { lat, lng }
      }
    } catch {
      // Hiljainen epäonnistuminen - tekstikenttä näyttää silti oikean osoitteen.
    }
    return null
  }

  function placeMarker(lat, lng) {
    const map = mapRef.current
    if (!map) return
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(map)
    }
    // animate: false - osoitteen valinta vaihtaa usein näkymän pois tästä kartasta lähes
    // saman tien (esim. reittinäkymään), ja Leafletin oma zoom/pan-animaatio voi silloin
    // yrittää päivittää DOM:ia sen jälkeen kun komponentti on jo purettu ja kaataa sivun.
    map.setView([lat, lng], 16, { animate: false })
  }

  function handleQueryChange(e) {
    const next = e.target.value
    setQuery(next)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!next.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await fetchNominatim(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(next)}&countrycodes=fi&limit=5&addressdetails=1`,
        )
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  function selectResult(result) {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    placeMarker(lat, lng)
    setQuery(result.display_name)
    setResults([])
    onChange(result.display_name, { lat, lng }, { interactive: true })
  }

  return (
    <div className="address-picker">
      <div className="address-picker__search">
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Hae osoitetta..."
          autoComplete="off"
        />
        {searching && <span className="address-picker__spinner" aria-hidden="true" />}

        {results.length > 0 && (
          <ul className="address-picker__results">
            {results.map((result) => (
              <li key={result.place_id}>
                <button type="button" onClick={() => selectResult(result)}>
                  {result.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={mapContainerRef} className="address-picker__map" />

      <p className="address-picker__hint">Voit myös klikata karttaa valitaksesi sijainnin.</p>
    </div>
  )
}

export default AddressMapPicker

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Navigation } from 'lucide-react'
import DelivoLogo from './DelivoLogo.jsx'
import { SEARCH_DEBOUNCE_MS, currentPosition, resolveSuggestion, reverseGeocode, searchAddresses } from '../lib/geocode.js'
import { isInServiceArea, saveDeliveryAddress } from '../lib/deliveryAddress.js'
import './WelcomeAddress.css'

// Ensikäynnin osoitenäkymä (käyttäjän valinta 31.10.2026): yksinkertainen
// mustavalkoinen koko ruudun näkymä ilman kuvaa - logo, otsikko ja kenttä.
// Ennen etusivua kysytään toimitusosoite, jotta näytetään oikeat ravintolat.
// Hakutuloksen tai oman sijainnin valinta tallentaa osoitteen ja etusivu
// aukeaa. Kuopion alueen ulkopuolella kerrotaan, ettei Bidrop vielä toimi
// siellä - toista osoitetta voi kokeilla tai selata silti (onSkip).

// Leijuvat kuvakkeet: x/y työpöydällä (palstan molemmin puolin), xm/ym
// puhelimella (lomakkeen alapuolella). depth: near isompi ja terävä, far
// pienempi ja himmeä - syvyysvaikutelma.
const FLOATERS = [
  { icon: 'burger', x: '9%', y: '18%', xm: '6%', ym: '64%', size: 120, depth: 'near', delay: 0, dur: 9, tilt: -14 },
  { icon: 'pizza', x: '80%', y: '14%', xm: '62%', ym: '70%', size: 104, depth: 'near', delay: -3, dur: 11, tilt: 12 },
  { icon: 'sushi', x: '18%', y: '66%', xm: '34%', ym: '78%', size: 96, depth: 'mid', delay: -6, dur: 10, tilt: 10 },
  { icon: 'tacos', x: '86%', y: '58%', xm: '76%', ym: '80%', size: 92, depth: 'mid', delay: -2, dur: 12, tilt: -10 },
  { icon: 'ramen', x: '4%', y: '44%', xm: '2%', ym: '82%', size: 70, depth: 'far', delay: -5, dur: 13, tilt: 8 },
  { icon: 'dessert', x: '70%', y: '82%', xm: '46%', ym: '62%', size: 66, depth: 'far', delay: -8, dur: 14, tilt: -8 },
  { icon: 'salad', x: '92%', y: '34%', xm: '86%', ym: '58%', size: 62, depth: 'far', delay: -1, dur: 12, tilt: 14 },
  { icon: 'kebab', x: '28%', y: '88%', xm: '18%', ym: '76%', size: 74, depth: 'mid', delay: -4, dur: 10, tilt: -12 },
]

function WelcomeAddress({ onSkip }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  // Valittu osoite alueen ulkopuolella - näkymä vaihtuu ilmoitukseen.
  const [outside, setOutside] = useState(null)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => () => clearTimeout(debounceRef.current), [])

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
        const found = await searchAddresses(next)
        setResults(found)
        if (found.length === 0) setError('Osoitetta ei löytynyt. Kirjoita kadun nimi, numero ja kaupunki.')
      } catch {
        setResults([])
        setError('Osoitehaku ei juuri nyt vastaa. Yritä hetken päästä uudelleen.')
      } finally {
        setSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)
  }

  function choose(address) {
    setResults([])
    if (!isInServiceArea(address)) {
      setOutside(address)
      return
    }
    saveDeliveryAddress(address)
  }

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
      const address = await reverseGeocode(coords.lat, coords.lng)
      if (address) choose(address)
      else setError('Sijaintisi osoitetta ei löytynyt. Kirjoita osoite kenttään.')
    } catch (err) {
      setError(`${err.message} Voit myös kirjoittaa osoitteen kenttään.`)
    } finally {
      setLocating(false)
    }
  }

  function tryAnother() {
    setOutside(null)
    setQuery('')
    setError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="welcome">
      {/* Taustalla leijuvat 3D-ruokakuvakkeet (käyttäjän pyyntö 31.10.2026). */}
      <div className="welcome__scene" aria-hidden="true">
        {FLOATERS.map((item) => (
          <img
            key={item.icon}
            className={`welcome__floater welcome__floater--${item.depth}`}
            src={`/category-${item.icon}-icon.webp`}
            alt=""
            style={{
              '--x': item.x,
              '--y': item.y,
              '--xm': item.xm,
              '--ym': item.ym,
              '--size': `${item.size}px`,
              '--delay': `${item.delay}s`,
              '--dur': `${item.dur}s`,
              '--tilt': `${item.tilt}deg`,
            }}
          />
        ))}
      </div>

      <main className="welcome__panel">
        <DelivoLogo className="welcome__logo" />

        <div className="welcome__body">
          {outside ? (
            <>
              <h1 className="welcome__title">Emme vielä toimi tällä alueella</h1>
              <p className="welcome__lead">
                Bidrop toimii toistaiseksi Kuopiossa, ja {outside.label || outside.full} on alueen ulkopuolella.
                Kerromme, kun laajennamme.
              </p>
              <button type="button" className="welcome__primary" onClick={tryAnother}>
                Kokeile toista osoitetta
              </button>
              <button type="button" className="welcome__secondary" onClick={onSkip}>
                Selaa silti ravintoloita
              </button>
            </>
          ) : (
            <>
              <h1 className="welcome__title">Minne ruoka tuodaan?</h1>
              <p className="welcome__lead">Näytämme ravintolat, jotka toimittavat osoitteeseesi.</p>

              <div className="welcome__field">
                <MapPin size={18} strokeWidth={2} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Kadun nimi, numero ja kaupunki"
                  aria-label="Toimitusosoite"
                  autoComplete="street-address"
                />
                {searching && <span className="welcome__searching">Haetaan…</span>}
              </div>

              {results.length > 0 && (
                <ul className="welcome__results">
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseSuggestion(result)}
                      >
                        <strong>{result.label}</strong>
                        <span>{result.full}</span>
                      </button>
                    </li>
                  ))}
                  {/* Googlen ehdot: ilman karttaa näytetyissä tuloksissa mainitaan lähde. */}
                  {results.some((result) => result.placeId) && (
                    <li className="welcome__attribution">Google Maps</li>
                  )}
                </ul>
              )}

              {error && (
                <p className="welcome__error" role="alert">
                  {error}
                </p>
              )}

              <button type="button" className="welcome__geo" onClick={useMyLocation} disabled={locating}>
                <Navigation size={16} strokeWidth={2} aria-hidden="true" />
                {locating ? 'Haetaan sijaintia…' : 'Käytä nykyistä sijaintia'}
              </button>
            </>
          )}
        </div>

        <p className="welcome__login">
          Oletko jo asiakas? <Link to="/login">Kirjaudu</Link>
        </p>
      </main>
    </div>
  )
}

export default WelcomeAddress

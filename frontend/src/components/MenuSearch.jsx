import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Search, X } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { formatPrice } from '../lib/format.js'
import './MenuSearch.css'

function normalize(text) {
  return (text ?? '').toLocaleLowerCase('fi')
}

// Jaettu: sama ehto mobiilin hakunäkymässä ja työpöydän ruokalistan
// hakukentässä (RestaurantPage), jotta molemmat löytävät samat tuotteet.
export function matchesMenuQuery(item, query) {
  const term = normalize(query.trim())
  if (!term) return true
  return [item.name, item.description, item.category, ...(item.tags ?? [])].some((field) =>
    normalize(field).includes(term),
  )
}

// Ravintolasivun haku (headerin suurennuslasi, Woltin malli): koko ruudun
// näkymä, joka suodattaa VAIN tämän ravintolan tuotteita nimen, kuvauksen,
// osion ja tagien perusteella. Tuotteen painallus avaa saman tuoteikkunan kuin
// ruokalistassa (onPick); ikkuna aukeaa tämän näkymän päälle, joten haku
// jatkuu siitä mihin jäätiin.
function MenuSearch({ items, restaurantName, onPick, onClose, modalOpen }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Escape sulkee haun - paitsi kun tuoteikkuna on auki, jolloin Escape kuuluu sille.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && !modalOpen) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, modalOpen])

  const results = useMemo(
    () => (query.trim() ? items.filter((item) => matchesMenuQuery(item, query)) : []),
    [items, query],
  )

  return (
    <div className="menu-search" role="dialog" aria-modal="true" aria-label={`Hae: ${restaurantName}`}>
      <div className="menu-search__bar">
        <button type="button" className="menu-search__back" aria-label="Sulje haku" onClick={onClose}>
          <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
        <label className="menu-search__field">
          <Search size={18} strokeWidth={2} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Hae ravintolasta ${restaurantName}`}
            aria-label="Hae ruokalistasta"
          />
          {query && (
            <button type="button" className="menu-search__clear" aria-label="Tyhjennä haku" onClick={() => setQuery('')}>
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      <div className="menu-search__body">

        {query.trim() && results.length === 0 && (
          <p className="menu-search__hint">Ei tuotteita haulle "{query.trim()}".</p>
        )}

        {results.length > 0 && (
          <ul className="menu-search__results">
            {results.map((item) => (
              <li key={item.id}>
                <button type="button" className="menu-search__item" onClick={() => onPick(item)}>
                  <span className="menu-search__item-text">
                    <strong>{item.name}</strong>
                    {item.description && <span>{item.description}</span>}
                    <em>{item.is_available === false ? 'Loppu valikoimasta' : formatPrice(item.price_cents)}</em>
                  </span>
                  <span className="menu-search__thumb">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" loading="lazy" />
                    ) : (
                      <RestaurantAvatarPlaceholder name={item.name} size="thumb" />
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default MenuSearch

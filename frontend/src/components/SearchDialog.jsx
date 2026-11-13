import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import SearchSuggest from './SearchSuggest.jsx'
import SearchStart from './SearchStart.jsx'
import { getRestaurants } from '../lib/api.js'
import { rememberSearch } from '../lib/recentSearches.js'
import './SearchDialog.css'

// Hakunäkymä tietokoneelle (käyttäjän pyyntö 13.11.2026): sama sisältö kuin
// puhelimen koko ruudun haussa (aloitusnäkymä / ehdotukset), mutta
// keskitettynä ikkunana headerin alla. Esc tai taustan klikkaus sulkee.
// restaurants/categories: etusivu antaa omansa, muuten haetaan itse.
export default function SearchDialog({ restaurants: givenRestaurants, categories: givenCategories, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState([])

  useEffect(() => {
    if (givenRestaurants) return undefined
    let cancelled = false
    getRestaurants()
      .then((data) => !cancelled && setFetched(Array.isArray(data) ? data : []))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [givenRestaurants])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const restaurants = givenRestaurants ?? fetched
  const categories =
    givenCategories ??
    [...new Set(restaurants.map((r) => r.category).filter(Boolean))].slice(0, 8)

  return createPortal(
    <div className="search-dialog" role="dialog" aria-modal="true" aria-label="Haku">
      <button type="button" className="search-dialog__backdrop" aria-label="Sulje haku" onClick={onClose} />
      <div className="search-dialog__panel">
        <div className="search-dialog__bar">
          <Search size={20} strokeWidth={2.2} aria-hidden="true" />
          <input
            type="search"
            aria-label="Hae Bidropista"
            placeholder="Mitä tekis mieli?"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                rememberSearch(query)
                onClose()
                navigate(`/haku?q=${encodeURIComponent(query.trim())}`)
              }
            }}
          />
          {query && (
            <button type="button" className="search-dialog__clear" aria-label="Tyhjennä haku" onClick={() => setQuery('')}>
              <X size={16} strokeWidth={2.2} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="search-dialog__close" aria-label="Sulje haku" onClick={onClose}>
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="search-dialog__body">
          {query.trim() ? (
            <SearchSuggest query={query} variant="fullscreen" onNavigate={onClose} />
          ) : (
            <SearchStart restaurants={restaurants} categories={categories} onNavigate={onClose} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

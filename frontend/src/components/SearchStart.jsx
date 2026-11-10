import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, Clock, X } from 'lucide-react'
import RestaurantAvatarPlaceholder from './RestaurantAvatarPlaceholder.jsx'
import { formatEtaRange } from '../lib/delivery.js'
import { formatScore } from '../lib/score.js'
import { loadRecentSearches, saveRecentSearches } from '../lib/recentSearches.js'
import './SearchStart.css'

// Haun aloitusnäkymä puhelimella (käyttäjän pyyntö 10.11.2026: kokonaan uusi,
// oma design). Ylhäältä alas: viimeisimmät haut, Kuopion top 5 numeroituna
// listana, mieliteot tekstilaattoina ja linkki kaikkiin ravintoloihin.
export default function SearchStart({ restaurants, categories, onNavigate }) {
  const [recent, setRecent] = useState(loadRecentSearches)

  const top = [...restaurants]
    .filter((r) => !r.isPlaceholder || r.image_url)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5)

  const counts = new Map()
  for (const r of restaurants) {
    if (r.category) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
  }

  function removeRecent(term) {
    const next = recent.filter((item) => item !== term)
    setRecent(next)
    saveRecentSearches(next)
  }

  return (
    <div className="search-start">
      {recent.length > 0 && (
        <section className="search-start__section">
          <div className="search-start__head">
            <h3>Viimeisimmät</h3>
            <button
              type="button"
              className="search-start__clear"
              onClick={() => {
                setRecent([])
                saveRecentSearches([])
              }}
            >
              Tyhjennä
            </button>
          </div>
          <ul className="search-start__recent">
            {recent.map((term) => (
              <li key={term}>
                <Link to={`/haku?q=${encodeURIComponent(term)}`} onClick={onNavigate}>
                  <Clock size={17} strokeWidth={2} aria-hidden="true" />
                  <span>{term}</span>
                </Link>
                <button type="button" aria-label={`Poista haku ${term}`} onClick={() => removeRecent(term)}>
                  <X size={16} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {top.length > 0 && (
        <section className="search-start__section">
          <div className="search-start__head">
            <h3>Kuopion kärjessä tänään</h3>
          </div>
          <ol className="search-start__top">
            {top.map((r, index) => (
              <li key={r.id}>
                <Link to={r.isPlaceholder ? `/haku?q=${encodeURIComponent(r.name)}` : `/ravintola/${r.id}`} onClick={onNavigate}>
                  <span className="search-start__rank" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="search-start__thumb">
                    {r.image_url ? (
                      <img src={r.image_url} alt="" loading="lazy" />
                    ) : (
                      <RestaurantAvatarPlaceholder name={r.name} size="thumb" />
                    )}
                  </span>
                  <span className="search-start__info">
                    <strong>{r.name}</strong>
                    <span>
                      {[
                        r.category,
                        formatEtaRange(r.pickup_estimate_minutes),
                        r.rating != null ? `${formatScore(r.rating)} / 10` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <ChevronRight className="search-start__chevron" size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {categories.length > 0 && (
        <section className="search-start__section">
          <div className="search-start__head">
            <h3>Mieliteot</h3>
          </div>
          <div className="search-start__moods">
            {categories.map((category) => (
              <Link
                key={category}
                to={`/haku?q=${encodeURIComponent(category)}`}
                className="search-start__mood"
                onClick={onNavigate}
              >
                <span>
                  <strong>{category}</strong>
                  {counts.get(category) ? (
                    <small>
                      {counts.get(category)} {counts.get(category) === 1 ? 'ravintola' : 'ravintolaa'}
                    </small>
                  ) : null}
                </span>
                <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <Link
        to={`/haku?q=${encodeURIComponent('Kaikki ravintolat')}`}
        className="search-start__all"
        onClick={onNavigate}
      >
        Selaa kaikkia ravintoloita
        <ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </div>
  )
}

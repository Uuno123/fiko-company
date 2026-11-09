import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import BottomSheet from './BottomSheet.jsx'
import { CATEGORY_SHORT_LABELS } from '../lib/categories.js'
import {
  DISTANCE_RANGE,
  EMPTY_BROWSE,
  ETA_RANGE,
  RATING_RANGE,
  SORT_CHOICES,
  matchesBrowse,
} from '../lib/browseFilters.js'
import './BrowseSheet.css'

// Etusivun suodatinpainikkeen valintasivu (käyttäjän pyyntö 7.11.2026):
// järjestys napeilla, arvio / toimitusaika / etäisyys liukusäätimillä,
// ilmainen kuljetus napilla ("Auki nyt" poistettu 7.11.2026), kategoriat pillereinä. Alhaalla
// "Näytä N ravintolaa" tekee haun (onApply). restaurants: etusivun ravintolat,
// joista lasketaan osumien määrä valintojen mukaan.
function Slider({ label, value, min, max, step, onChange, format }) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="browse-slider">
      <div className="browse-slider__head">
        <span>{label}</span>
        <strong>{format(value)}</strong>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--fill': `${percent}%` }}
        aria-label={label}
      />
    </div>
  )
}

function Toggle({ active, onClick, children }) {
  return (
    <button type="button" className={`browse-chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {active && <Check size={14} strokeWidth={2.8} aria-hidden="true" />}
      {children}
    </button>
  )
}

export default function BrowseSheet({ restaurants, categories, hasAddress, initial, onClose, onApply }) {
  const [f, setF] = useState(() => ({ ...EMPTY_BROWSE, ...initial }))
  const set = (patch) => setF((current) => ({ ...current, ...patch }))
  const count = useMemo(() => restaurants.filter((r) => matchesBrowse(r, f)).length, [restaurants, f])

  return (
    <BottomSheet
      onClose={onClose}
      labelledBy="browse-sheet-title"
      footer={(close) => (
        <div className="browse-footer">
          <button type="button" className="browse-footer__reset" onClick={() => setF({ ...EMPTY_BROWSE })}>
            Tyhjennä
          </button>
          <button
            type="button"
            className="browse-footer__apply"
            disabled={count === 0}
            onClick={() => {
              close()
              onApply(f)
            }}
          >
            {count === 0 ? 'Ei ravintoloita' : `Näytä ${count} ${count === 1 ? 'ravintola' : 'ravintolaa'}`}
          </button>
        </div>
      )}
    >
      <div className="browse-sheet">
        <h2 id="browse-sheet-title">Suodata ravintoloita</h2>

        <section className="browse-section">
          <h3>Järjestys</h3>
          <div className="browse-segment" role="radiogroup" aria-label="Järjestys">
            {SORT_CHOICES.filter((choice) => !choice.needsAddress || hasAddress).map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={f.sort === choice.value}
                className={`browse-segment__btn${f.sort === choice.value ? ' is-active' : ''}`}
                onClick={() => set({ sort: choice.value })}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </section>

        <section className="browse-section">
          <Slider
            label="Arvio vähintään"
            {...RATING_RANGE}
            value={f.minRating}
            onChange={(minRating) => set({ minRating })}
            format={(v) => (v <= RATING_RANGE.min ? 'Kaikki' : v.toFixed(1).replace('.', ','))}
          />
          <Slider
            label="Toimitusaika enintään"
            {...ETA_RANGE}
            value={f.maxEta}
            onChange={(maxEta) => set({ maxEta })}
            format={(v) => (v >= ETA_RANGE.max ? 'Kaikki' : `${v} min`)}
          />
          {hasAddress && (
            <Slider
              label="Etäisyys enintään"
              {...DISTANCE_RANGE}
              value={f.maxKm}
              onChange={(maxKm) => set({ maxKm })}
              format={(v) => (v >= DISTANCE_RANGE.max ? 'Kaikki' : `${v} km`)}
            />
          )}
        </section>

        <section className="browse-section">
          <h3>Pikavalinnat</h3>
          <div className="browse-chips">
            <Toggle active={f.freeDelivery} onClick={() => set({ freeDelivery: !f.freeDelivery })}>
              Ilmainen kuljetus
            </Toggle>
          </div>
        </section>

        <section className="browse-section">
          <h3>Kategoriat</h3>
          <div className="browse-chips">
            {categories.map((category) => {
              const active = f.categories.includes(category)
              return (
                <Toggle
                  key={category}
                  active={active}
                  onClick={() =>
                    set({
                      categories: active ? f.categories.filter((c) => c !== category) : [...f.categories, category],
                    })
                  }
                >
                  {CATEGORY_SHORT_LABELS[category] ?? category}
                </Toggle>
              )
            })}
          </div>
        </section>
      </div>
    </BottomSheet>
  )
}

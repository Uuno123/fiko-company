import { useEffect, useRef } from 'react'
import './AuthInputs.css'

// Rekisteröitymisen erikoiskentät (käyttäjän toiveet 27.10.2026): koodi kuuteen
// ruutuun, puhelinnumero Suomen lipulla ja +358-etuliitteellä sekä syntymäaika
// päivänä, kuukauden nimenä ja vuotena. Käytössä Register.jsx:ssä.

// Koodi yhtenä merkkijonona (value), ruudut näyttävät sen merkit. Numero siirtää
// seuraavaan ruutuun, askelpalautin edelliseen, ja liitetty tai puhelimen
// ehdottama koko koodi täyttää kaikki ruudut kerralla.
export function CodeInput({ length, value, onChange, onComplete, disabled = false, autoFocus = false }) {
  const refs = useRef([])
  // Kohdistus siirretään vasta kun uusi arvo on piirretty: muuten ruudun
  // onFocus näkisi vielä vanhan arvon ja palauttaisi kohdistuksen taaksepäin.
  const pendingFocus = useRef(null)

  function focusBox(index) {
    refs.current[Math.max(0, Math.min(index, length - 1))]?.focus()
  }

  useEffect(() => {
    if (pendingFocus.current == null) return
    focusBox(pendingFocus.current)
    pendingFocus.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function update(next, focusIndex) {
    if (next === value) focusBox(focusIndex)
    else {
      pendingFocus.current = focusIndex
      onChange(next)
    }
  }

  function fillFrom(index, raw) {
    const incoming = raw.replace(/\D/g, '')
    if (!incoming) return
    const next = (value.slice(0, index) + incoming).slice(0, length)
    update(next, next.length)
    if (next.length === length) onComplete(next)
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const cut = value[index] ? index : index - 1
      if (cut < 0) return
      update(value.slice(0, cut), cut)
    } else if (e.key === 'ArrowLeft') {
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight') {
      focusBox(index + 1)
    }
  }

  return (
    <div className="auth-code-boxes" role="group" aria-label={`${length}-numeroinen koodi`}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          className="auth-code-box"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Numero ${index + 1}`}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          value={value[index] ?? ''}
          // Ruudun valinta: uusi numero korvaa vanhan, ja tyhjään kohtaan
          // klikkaus vie ensimmäiseen tyhjään ruutuun.
          onFocus={(e) => {
            if (index > value.length) focusBox(value.length)
            else e.target.select()
          }}
          onChange={(e) => fillFrom(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => {
            e.preventDefault()
            fillFrom(index, e.clipboardData.getData('text'))
          }}
        />
      ))}
    </div>
  )
}

function FinnishFlag() {
  return (
    <svg className="auth-phone__flag" viewBox="0 0 18 11" aria-hidden="true">
      <rect width="18" height="11" fill="#fff" />
      <rect x="5" width="3" height="11" fill="#002f6c" />
      <rect y="4" width="18" height="3" fill="#002f6c" />
    </svg>
  )
}

// Suomalainen numero ilman etunollaa: "40 123 4567" -> "+358401234567".
export function PhoneField({ id, value, onChange }) {
  function handleChange(e) {
    let next = e.target.value
    // Liitetty kansainvälinen muoto (+358 tai 00358) ja etunolla pois.
    next = next.replace(/^\s*(\+|00)\s*358/, '')
    next = next.replace(/[^\d ]/g, '').replace(/^\s+/, '')
    if (next.startsWith('0')) next = next.slice(1)
    onChange(next)
  }

  return (
    <div className="auth-phone">
      <span className="auth-phone__prefix">
        <FinnishFlag />
        +358
      </span>
      <input
        id={id}
        type="tel"
        autoComplete="tel-national"
        inputMode="tel"
        placeholder="40 123 4567"
        required
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}

const MONTHS = [
  'tammikuuta',
  'helmikuuta',
  'maaliskuuta',
  'huhtikuuta',
  'toukokuuta',
  'kesäkuuta',
  'heinäkuuta',
  'elokuuta',
  'syyskuuta',
  'lokakuuta',
  'marraskuuta',
  'joulukuuta',
]

// value: { day, month, year } merkkijonoina ('' = valitsematta).
export function BirthDateField({ idPrefix, value, onChange, latestYear }) {
  const years = Array.from({ length: latestYear - 1900 + 1 }, (_, i) => String(latestYear - i))
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value })

  return (
    <div className="auth-birth">
      <select
        id={`${idPrefix}-day`}
        className={`auth-select${value.day ? '' : ' is-empty'}`}
        aria-label="Päivä"
        autoComplete="bday-day"
        required
        value={value.day}
        onChange={set('day')}
      >
        <option value="" disabled>
          Päivä
        </option>
        {Array.from({ length: 31 }, (_, i) => (
          <option key={i + 1} value={String(i + 1)}>
            {i + 1}.
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-month`}
        className={`auth-select${value.month ? '' : ' is-empty'}`}
        aria-label="Kuukausi"
        autoComplete="bday-month"
        required
        value={value.month}
        onChange={set('month')}
      >
        <option value="" disabled>
          Kuukausi
        </option>
        {MONTHS.map((name, i) => (
          <option key={name} value={String(i + 1)}>
            {name}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-year`}
        className={`auth-select${value.year ? '' : ' is-empty'}`}
        aria-label="Vuosi"
        autoComplete="bday-year"
        required
        value={value.year}
        onChange={set('year')}
      >
        <option value="" disabled>
          Vuosi
        </option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

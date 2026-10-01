import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Cookie, ChevronLeft } from 'lucide-react'
import { OPEN_COOKIE_SETTINGS_EVENT, getCookieConsent, saveCookieConsent } from '../lib/cookieConsent.js'
import './CookieConsent.css'

const CATEGORIES = [
  {
    key: 'necessary',
    title: 'Välttämättömät',
    text: 'Kirjautuminen, ostoskori, maksaminen ja tietoturva. Ilman näitä palvelu ei toimi.',
    locked: true,
  },
  {
    key: 'analytics',
    title: 'Analytiikka',
    text: 'Kertovat meille, miten sivustoa käytetään, jotta voimme parantaa sitä.',
  },
  {
    key: 'marketing',
    title: 'Markkinointi',
    text: 'Mahdollistavat sinua kiinnostavat tarjoukset myös muissa palveluissa.',
  },
]

// Evästebanneri näytetään kaikilla sivuilla, kunnes kävijä tekee valinnan.
// "Vain välttämättömät" on ensimmäisessä näkymässä yhtä näkyvä kuin "Hyväksy
// kaikki" - Traficomin ohjeen mukaan kieltäytymisen pitää olla yhtä helppoa
// kuin hyväksymisen, eikä valintoja saa olla valmiiksi päällä.
function CookieConsent() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(() => getCookieConsent() === null)
  const [view, setView] = useState('main')
  const [choices, setChoices] = useState(() => {
    const saved = getCookieConsent()
    return { analytics: saved?.analytics ?? false, marketing: saved?.marketing ?? false }
  })

  useEffect(() => {
    function reopen() {
      const saved = getCookieConsent()
      setChoices({ analytics: saved?.analytics ?? false, marketing: saved?.marketing ?? false })
      setView('settings')
      setOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, reopen)
  }, [])

  // Esikatselusivut ovat kehitystyökaluja, joita testataan tyhjällä selaimella -
  // banneri peittäisi niissä juuri testattavan näkymän.
  if (!open || pathname.startsWith('/__preview')) return null

  function decide(next) {
    saveCookieConsent(next)
    setOpen(false)
    setView('main')
  }

  return (
    <section className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title" aria-live="polite">
      {view === 'main' ? (
        <>
          <div className="cookie-consent__head">
            <span className="cookie-consent__icon" aria-hidden="true">
              <Cookie size={20} strokeWidth={1.9} />
            </span>
            <h2 id="cookie-consent-title">Evästeet ja yksityisyys</h2>
          </div>
          <p className="cookie-consent__text">
            Käytämme välttämättömiä evästeitä, jotta kirjautuminen, ostoskori ja maksaminen toimivat. Analytiikka- ja
            markkinointievästeitä käytämme vain, jos hyväksyt ne. Voit muuttaa valintaasi milloin tahansa sivun alareunan
            Evästeasetuksista.
          </p>
          <div className="cookie-consent__actions">
            <button
              type="button"
              className="cookie-consent__btn cookie-consent__btn--primary"
              onClick={() => decide({ analytics: true, marketing: true })}
            >
              Hyväksy kaikki
            </button>
            <button
              type="button"
              className="cookie-consent__btn cookie-consent__btn--secondary"
              onClick={() => decide({ analytics: false, marketing: false })}
            >
              Vain välttämättömät
            </button>
          </div>
          <button type="button" className="cookie-consent__link" onClick={() => setView('settings')}>
            Muokkaa asetuksia
          </button>
        </>
      ) : (
        <>
          <div className="cookie-consent__head">
            <button
              type="button"
              className="cookie-consent__back"
              aria-label="Takaisin"
              onClick={() => setView('main')}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h2 id="cookie-consent-title">Evästeasetukset</h2>
          </div>

          <ul className="cookie-consent__list">
            {CATEGORIES.map((category) => {
              const checked = category.locked || choices[category.key]
              return (
                <li key={category.key} className="cookie-consent__row">
                  <span className="cookie-consent__row-text">
                    <strong>{category.title}</strong>
                    <span>{category.text}</span>
                  </span>
                  {category.locked ? (
                    <span className="cookie-consent__always">Aina päällä</span>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={category.title}
                      className={`cookie-consent__switch${checked ? ' is-on' : ''}`}
                      onClick={() => setChoices((prev) => ({ ...prev, [category.key]: !prev[category.key] }))}
                    >
                      <span />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="cookie-consent__actions">
            <button
              type="button"
              className="cookie-consent__btn cookie-consent__btn--primary"
              onClick={() => decide(choices)}
            >
              Tallenna valinnat
            </button>
            <button
              type="button"
              className="cookie-consent__btn cookie-consent__btn--secondary"
              onClick={() => decide({ analytics: true, marketing: true })}
            >
              Hyväksy kaikki
            </button>
          </div>
        </>
      )}
    </section>
  )
}

export default CookieConsent

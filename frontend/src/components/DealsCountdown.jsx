import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import './DealsCountdown.css'

// Tarjousten ajastin headerin alla (käyttäjän pyyntö 2.11.2026, vain designia
// varten): laskee päivän loppuun, jolloin "päivän tarjoukset vaihtuvat".
// "Katso" vierittää Kovimmat tarjoukset -riviin (DealsRow, #deals-row-title).
function secondsToMidnight(now) {
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  return Math.max(Math.floor((end - now) / 1000), 0)
}

const pad = (n) => String(n).padStart(2, '0')

function DealsCountdown() {
  const [left, setLeft] = useState(() => secondsToMidnight(new Date()))

  useEffect(() => {
    const timer = setInterval(() => setLeft(secondsToMidnight(new Date())), 1000)
    return () => clearInterval(timer)
  }, [])

  const days = Math.floor(left / 86400)
  const hours = Math.floor((left % 86400) / 3600)
  const minutes = Math.floor((left % 3600) / 60)
  const seconds = left % 60

  function showDeals() {
    document.getElementById('deals-row-title')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div className="deals-countdown" role="status">
      <span className="deals-countdown__label">Kovimmat tarjoukset päättyvät</span>
      {/* Aika laatikoissa: päivät, tunnit, minuutit ja sekunnit (käyttäjän
          mallikuva 2.11.2026). */}
      <span className="deals-countdown__time" aria-label={`${hours} tuntia ${minutes} minuuttia`}>
        {[
          [days, 'pv'],
          [hours, 't'],
          [minutes, 'min'],
          [seconds, 's'],
        ].map(([value, unit]) => (
          <span key={unit} className="deals-countdown__unit" aria-hidden="true">
            <span className="deals-countdown__box">{pad(value)}</span>
            <span className="deals-countdown__unit-label">{unit}</span>
          </span>
        ))}
      </span>
      <button type="button" className="deals-countdown__link" onClick={showDeals}>
        Katso
        <ArrowRight size={14} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  )
}

export default DealsCountdown

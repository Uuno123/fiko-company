import { useEffect, useState } from 'react'
import './OrderCountdownRing.css'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Woltin tapaan aikaikkuna ("15–20") eikä yksittäinen minuutti: arvio on
// arvio, ja väli kertoo sen rehellisemmin kuin minuutin tarkkuus.
function minutesRange(minutes) {
  if (minutes <= 5) return 'Alle 5'
  const low = Math.floor(minutes / 5) * 5
  return `${low}–${low + 5}`
}

function unitLabel(deliveryMethod) {
  if (deliveryMethod === 'delivery') return 'minuuttia toimitukseen'
  if (deliveryMethod === 'pickup') return 'minuuttia noutoon'
  return 'min jäljellä'
}

function OrderCountdownRing({ createdAt, arrivalAt, deliveryMethod, size = 'md' }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const startMs = new Date(createdAt).getTime()
  const endMs = new Date(arrivalAt).getTime()
  const totalMs = Math.max(endMs - startMs, 1)
  const remainingMs = Math.max(endMs - now, 0)
  const remainingMinutes = Math.max(Math.ceil(remainingMs / 60_000), 0)
  const progress = Math.min(Math.max(1 - remainingMs / totalMs, 0), 1)
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isDue = remainingMs <= 0

  return (
    <div className={`order-countdown-ring order-countdown-ring--${size}`}>
      <svg viewBox="0 0 120 120" className="order-countdown-ring__svg">
        <circle cx="60" cy="60" r={RADIUS} className="order-countdown-ring__track" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          className="order-countdown-ring__progress"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="order-countdown-ring__center">
        {isDue ? (
          <span className="order-countdown-ring__due">Kohta valmis</span>
        ) : (
          <>
            <span className="order-countdown-ring__number">{minutesRange(remainingMinutes)}</span>
            <span className="order-countdown-ring__unit">{unitLabel(deliveryMethod)}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderCountdownRing

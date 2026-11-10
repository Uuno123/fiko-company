import { Check } from 'lucide-react'
import CourierSearchAnimation from './CourierSearchAnimation.jsx'
import DelivoLogo from './DelivoLogo.jsx'
import './CourierBidsIntro.css'

// Kuljettajan valintanäkymän yläosa tilauksen jälkeen (Cart.jsx, käyttäjän
// pyyntö 10.11.2026): Bidrop-logo, kuvitus, otsikko ja kolmen vaiheen ohje,
// jossa nykyinen vaihe korostettu. Tyylit CourierBidsIntro.css ja Cart.css.
const STEPS = [
  { title: 'Tilaus vastaanotettu', text: 'Ravintola saa tilauksen, kun kuljetuksesta on sovittu.', state: 'done' },
  {
    title: 'Kuljettajat tarjoavat hintaa',
    text: 'Lähellä olevat kuljettajat näkevät tilauksesi ja tekevät tarjouksen.',
    state: 'active',
  },
  { title: 'Sinä valitset', text: 'Hyväksy paras tarjous tai ehdota omaa hintaa.', state: 'next' },
]

// compact: tilauksen seurannassa ilman logoa ja kuvitusta (kartta on jo yläosassa).
export default function CourierBidsIntro({ compact = false }) {
  return (
    <div className={`order-bids__intro${compact ? ' order-bids__intro--compact' : ''}`}>
      {!compact && <DelivoLogo className="order-bids__logo" />}
      {!compact && <CourierSearchAnimation />}
      <h1 className="order-bids__title">Etsitään kuljettajaa</h1>
      <p className="order-bids__lead">Tilauksesi näkyy nyt lähellä oleville kuljettajille.</p>
      <ol className="order-bids__steps">
        {STEPS.map((step, index) => (
          <li key={step.title} className={step.state === 'done' ? 'is-done' : step.state === 'active' ? 'is-active' : undefined}>
            <span className="order-bids__step-no" aria-hidden="true">
              {step.state === 'done' ? <Check size={14} strokeWidth={3} /> : index + 1}
            </span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.text}</small>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

import { useEffect } from 'react'
import { Bike, XCircle } from 'lucide-react'
import './OrderChangeNotice.css'

// Ravintolan hylkäyksen syy (orders.cancel_reason, migraatio 0057) lauseen loppuna.
const RESTAURANT_REASONS = {
  sold_out: ', koska tuote on loppunut',
  too_busy: ', koska keittiössä on juuri nyt liian kiire',
  closing: ', koska ravintola on sulkemassa',
}

function cancelledText(order) {
  const number = order.order_number ? ` ${order.order_number}` : ''
  // Järjestelmä perui tilauksen, kun kuljettajaa ei löytynyt tai kuljetushinnasta
  // ei sovittu ajoissa (migraatiot 0046 ja 0058).
  if (order.cancel_reason === 'no_courier') {
    return `Tilauksellesi${number} ei löytynyt kuljettajaa ajoissa, joten se peruttiin. Tilauksesta ei veloiteta.`
  }
  if (order.cancel_reason === 'customer_request') {
    return `Tilauksesi${number} peruttiin pyynnöstäsi. Tilauksesta ei veloiteta.`
  }
  const reason = RESTAURANT_REASONS[order.cancel_reason] ?? ''
  return `Ravintola ei voinut ottaa tilaustasi${number} vastaan${reason}, joten se peruttiin. Tilauksesta ei veloiteta.`
}

const COPY = {
  cancelled: {
    Icon: XCircle,
    title: 'Tilauksesi peruttiin',
    text: cancelledText,
  },
  released: {
    Icon: Bike,
    title: 'Kuljettaja vaihtuu',
    text: (order) =>
      `Kuljettaja joutui luopumaan tilauksestasi${order.order_number ? ` ${order.order_number}` : ''}. Etsimme sille uuden kuljettajan - näet tilanteen tilauksen seurannasta.`,
  },
}

// Asiakkaalle näytettävä ilmoitus tilauksen muutoksesta, jota hän ei itse tehnyt:
// ravintola perui tilauksen tai kuljettaja luopui keikasta. ActiveOrderBubble
// päättää milloin ilmoitus näytetään (kerran per tapahtuma).
function OrderChangeNotice({ notice, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const copy = COPY[notice.kind]
  const { Icon } = copy

  return (
    <div className="order-change-notice-backdrop">
      <div
        className={`order-change-notice order-change-notice--${notice.kind}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="order-change-notice-title"
        aria-describedby="order-change-notice-text"
      >
        <span className="order-change-notice__icon" aria-hidden="true">
          <Icon size={26} strokeWidth={2} />
        </span>
        <h2 className="order-change-notice__title" id="order-change-notice-title">
          {copy.title}
        </h2>
        <p className="order-change-notice__text" id="order-change-notice-text">
          {copy.text(notice.order)}
        </p>
        <button type="button" className="order-change-notice__ok" onClick={onClose} autoFocus>
          Selvä
        </button>
      </div>
    </div>
  )
}

export default OrderChangeNotice

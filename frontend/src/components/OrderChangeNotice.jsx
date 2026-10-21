import { useEffect } from 'react'
import { Bike, XCircle } from 'lucide-react'
import './OrderChangeNotice.css'

const COPY = {
  cancelled: {
    Icon: XCircle,
    title: 'Tilauksesi peruttiin',
    // Järjestelmä perui tilauksen, kun kuljettajaa ei löytynyt (migraatio 0046).
    text: (order) =>
      order.cancel_reason === 'no_courier'
        ? `Tilauksellesi${order.order_number ? ` ${order.order_number}` : ''} ei löytynyt kuljettajaa läheltä, joten se peruttiin. Tilauksesta ei veloiteta.`
        : `Ravintola ei voinut ottaa tilaustasi${order.order_number ? ` ${order.order_number}` : ''} vastaan, joten se peruttiin. Tilauksesta ei veloiteta.`,
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

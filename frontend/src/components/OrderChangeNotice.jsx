import { useEffect } from 'react'
import { Bike, XCircle } from 'lucide-react'
import { cancelReasonText } from '../lib/cancelReasons.js'
import './OrderChangeNotice.css'

// Peruutuksen syy yhteisestä listasta (lib/cancelReasons.js, 18.11.2026) -
// sama teksti verkkosivulla, sovelluksessa ja tilauksen seurannassa.
function cancelledText(order) {
  const number = order.order_number ? `Tilaus ${order.order_number}: ` : ''
  return `${number}${cancelReasonText(order)}`
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

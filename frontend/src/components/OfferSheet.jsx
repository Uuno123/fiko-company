import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import BottomSheet from './BottomSheet.jsx'
import './OfferSheet.css'

// Tarjouksen tiedot alhaalta liukuvassa paneelissa (käyttäjän pyyntö 28.10.2026):
// mitä saa, ehdot ja koodi kopioitavana kassaa varten. Avautuu ravintolasivun
// tarjouskortista. Ehdot ovat samat kuin kassan PROMO_CODES (Cart.jsx).
function OfferSheet({ offer, terms = [], onClose }) {
  const [copied, setCopied] = useState(false)
  const { Icon, title, code } = offer

  function copyCode() {
    navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <BottomSheet compact onClose={onClose} labelledBy="offer-sheet-title">
      <div className="offer-sheet">
        <span className="offer-sheet__icon" aria-hidden="true">
          <Icon size={30} strokeWidth={1.9} />
        </span>
        <h2 id="offer-sheet-title" className="offer-sheet__title">
          {title}
        </h2>

        <ul className="offer-sheet__terms">
          {terms.map((term) => (
            <li key={term}>
              <Check size={16} strokeWidth={2.4} aria-hidden="true" />
              {term}
            </li>
          ))}
        </ul>

        <div className="offer-sheet__code">
          <span>
            <small>Koodi</small>
            <strong>{code}</strong>
          </span>
          <button type="button" onClick={copyCode}>
            {copied ? (
              <>
                <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                Kopioitu
              </>
            ) : (
              <>
                <Copy size={15} strokeWidth={2.2} aria-hidden="true" />
                Kopioi
              </>
            )}
          </button>
        </div>

        <p className="offer-sheet__hint">
          Lisää koodi kassalla kohdasta ”Lisää alennuskoodi”. Alennus ei koske kuljetusta eikä palvelumaksua, ja
          tilaukseen käy yksi koodi kerrallaan.
        </p>
      </div>
    </BottomSheet>
  )
}

export default OfferSheet

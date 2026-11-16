import { createPortal } from 'react-dom'
import { formatPrice } from '../lib/format.js'
import './PaySuccessOverlay.css'

// Maksun animaatio Apple / Google Pay -pikamaksussa (käyttäjän pyyntö
// 15.11.2026). phase "processing": pyörivä rengas ja "Maksetaan…",
// phase "done": rengas täyttyy, väkänen piirtyy ja "Maksu onnistui".
export default function PaySuccessOverlay({ phase, method, amountCents }) {
  const done = phase === 'done'
  const wallet = method === 'apple' ? 'Apple Pay' : method === 'google' ? 'Google Pay' : 'Kortti'

  return createPortal(
    <div className={`pay-anim${done ? ' pay-anim--done' : ''}`} role="status" aria-live="polite">
      <div className="pay-anim__card">
        <div className="pay-anim__badge" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle className="pay-anim__track" cx="60" cy="60" r="52" />
            <circle className="pay-anim__ring" cx="60" cy="60" r="52" />
            <path className="pay-anim__check" d="M38 62 53 77 83 45" />
          </svg>
          <span className="pay-anim__burst">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 45}deg` }} />
            ))}
          </span>
        </div>
        <p className="pay-anim__title">{done ? 'Maksu onnistui' : 'Maksetaan…'}</p>
        <p className="pay-anim__amount">{formatPrice(amountCents)}</p>
        <p className="pay-anim__method">{wallet}</p>
      </div>
    </div>,
    document.body,
  )
}

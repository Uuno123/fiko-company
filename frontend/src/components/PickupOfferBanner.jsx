import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

// Noutotarjous etusivun kategoriarivien välissä, kupongin näköisenä: iso
// prosentti vasemmalla, leikattu reuna ja koodinappi, joka kopioi koodin.
// Tarjous on totta: NOUTO15 on kassan PROMO_CODES-listalla (Cart.jsx) ja
// backendin payments-reitillä, ja se alentaa vain noutotilauksia.
const CODE = 'NOUTO15'

export default function PickupOfferBanner() {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(CODE)
      setCopied(true)
    } catch {
      // Leikepöytä estetty (esim. http-yhteys) - koodi näkyy napissa silti.
    }
  }

  return (
    <aside className="pickup-offer" aria-label="Noutotarjous">
      <div className="pickup-offer__deal" aria-hidden="true">
        <span className="pickup-offer__percent">
          −15<small>%</small>
        </span>
        <span className="pickup-offer__deal-label">noudosta</span>
      </div>
      <div className="pickup-offer__body">
        <strong className="pickup-offer__title">Nouda itse ja säästä</strong>
        <span className="pickup-offer__text">15 % alennus noutotilauksesta, enintään 5 €. Ei jonoa - tilaus odottaa valmiina.</span>
      </div>
      <button
        type="button"
        className={`pickup-offer__code${copied ? ' pickup-offer__code--copied' : ''}`}
        onClick={copyCode}
        aria-label={copied ? `Koodi ${CODE} kopioitu` : `Kopioi koodi ${CODE}`}
      >
        <span>{copied ? 'Kopioitu' : CODE}</span>
        {copied ? <Check size={16} strokeWidth={2.4} aria-hidden="true" /> : <Copy size={15} strokeWidth={2} aria-hidden="true" />}
      </button>
    </aside>
  )
}

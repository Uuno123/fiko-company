import { formatPrice } from '../lib/format.js'
import { VAT_RATES, formatVatRate, vatIncluded } from '../lib/vat.js'
import './VatBreakdown.css'

// ALV-erittely tilauksen kuitissa (OrderDetail, käyttäjän päätös 10.11.2026:
// ei kassassa). Hinnat ovat verollisia, joten näytetään niihin sisältyvä vero
// kannoittain (lib/vat.js). Kuljetuksen laskuttaa kuljettaja, joten sen vero
// näkyy kuljettajan kuitilla.
export default function VatBreakdown({ foodCents, serviceCents, hasDelivery }) {
  const foodVat = vatIncluded(foodCents, VAT_RATES.food)
  const serviceVat = vatIncluded(serviceCents, VAT_RATES.service)
  return (
    <div className="vat-breakdown">
      <p className="vat-breakdown__title">Hinnat sisältävät arvonlisäveron</p>
      <div className="vat-breakdown__row">
        <span>ALV {formatVatRate(VAT_RATES.food)} (ruoka)</span>
        <span>{formatPrice(foodVat)}</span>
      </div>
      {serviceCents > 0 && (
        <div className="vat-breakdown__row">
          <span>ALV {formatVatRate(VAT_RATES.service)} (palvelumaksu)</span>
          <span>{formatPrice(serviceVat)}</span>
        </div>
      )}
      <div className="vat-breakdown__row vat-breakdown__row--sum">
        <span>ALV yhteensä</span>
        <span>{formatPrice(foodVat + serviceVat)}</span>
      </div>
      {hasDelivery && <p className="vat-breakdown__note">Kuljetuksen ALV näkyy kuljettajan kuitilla.</p>}
    </div>
  )
}

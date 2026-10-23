import { DELIVERY_BID } from './deliveryTime.js'

// Kuljetusmaksu ei ole enää kiinteä: kuljettajat tarjoavat hinnan tilauksen
// jälkeen ja asiakas valitsee (migraatio 0058). Korteissa ja ravintolasivulla
// näytetään haarukka yhdestä paikasta.
const euros = (cents) => (cents / 100).toFixed(2).replace('.', ',')
export const DELIVERY_PRICE_RANGE = `${euros(DELIVERY_BID.minCents)}–${euros(DELIVERY_BID.maxCents)} €`
// Asiakkaan palvelumaksu tilausta kohden - sama kuin Cart.jsx ja backendin payments.js.
export const SERVICE_FEE_CENTS = 49

// Arvio näytetään haarukkana eikä yhtenä lukuna: ravintolan antama
// pickup_estimate_minutes on arvio, ja yksi tarkka minuuttiluku lupaisi
// tarkkuutta jota siinä ei ole. Haarukan leveys on esitystapa, ei dataa -
// alaraja on aina ravintolan oma arvio.
const ETA_WINDOW_MINUTES = 10

export function formatEtaRange(minutes) {
  if (!minutes) return null
  return `${minutes}-${minutes + ETA_WINDOW_MINUTES} min`
}

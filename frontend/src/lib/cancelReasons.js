// Tilauksen peruutuksen syy (orders.cancel_reason) asiakkaalle selkokielellä.
// Yhteinen verkkosivulle, asiakassovellukselle (asiakas-app) ja ravintolan
// kojelaudalle - ei selainriippuvuuksia (käyttäjän pyyntö 18.11.2026: syy
// näkyviin myös, kun tilaus perutaan kesken valmistuksen tai matkan).
//
// Koodit:
//   no_courier          järjestelmä: kuljettajaa / hintaa ei saatu ajoissa (0046, 0058)
//   customer_cancelled  asiakas perui ennen kuin kuljetuksesta sovittiin (0058)
//   restaurant_timeout  järjestelmä: ravintola ei hyväksynyt 90 s:ssa (0059 + ehdotettu SQL)
//   sold_out, too_busy, closing, customer_request, other   ravintola hylkäsi (0057)
//   kitchen_problem     ravintola perui kesken valmistuksen (18.11.2026)

// Ravintolan valittavat syyt hyväksymisvaiheessa.
export const RESTAURANT_REJECT_REASONS = [
  { key: 'sold_out', label: 'Tuote on loppunut' },
  { key: 'too_busy', label: 'Keittiössä on liian kiire' },
  { key: 'closing', label: 'Ravintola on sulkemassa' },
  { key: 'customer_request', label: 'Asiakas pyysi perumaan' },
  { key: 'other', label: 'Muu syy' },
]

// Ravintolan valittavat syyt, kun tilaus on jo hyväksytty (kesken valmistuksen).
export const RESTAURANT_MIDWAY_REASONS = [
  { key: 'kitchen_problem', label: 'Ongelma keittiössä' },
  { key: 'sold_out', label: 'Tuote loppui kesken' },
  { key: 'closing', label: 'Ravintola joutuu sulkemaan' },
  { key: 'customer_request', label: 'Asiakas pyysi perumaan' },
  { key: 'other', label: 'Muu syy' },
]

const REASON_SENTENCES = {
  no_courier: 'Tilaukselle ei löytynyt kuljettajaa ajoissa.',
  customer_cancelled: 'Peruit tilauksen ennen kuin kuljetuksesta sovittiin.',
  customer_request: 'Tilaus peruttiin pyynnöstäsi.',
  restaurant_timeout: 'Ravintola ei ehtinyt vahvistaa tilausta ajoissa.',
  sold_out: 'Ravintola perui tilauksen, koska tuote on loppunut.',
  too_busy: 'Ravintola perui tilauksen, koska keittiössä on juuri nyt liian kiire.',
  closing: 'Ravintola perui tilauksen, koska ravintola on sulkemassa.',
  kitchen_problem: 'Ravintola joutui perumaan tilauksen kesken valmistuksen keittiön ongelman vuoksi.',
  other: 'Ravintola perui tilauksen.',
}

// Lyhyt syy listoihin, esim. "Kuljettajaa ei löytynyt".
const REASON_SHORT = {
  no_courier: 'Kuljettajaa ei löytynyt',
  customer_cancelled: 'Peruit tilauksen',
  customer_request: 'Peruttu pyynnöstäsi',
  restaurant_timeout: 'Ravintola ei vastannut',
  sold_out: 'Tuote loppunut',
  too_busy: 'Ravintolalla kiire',
  closing: 'Ravintola sulkemassa',
  kitchen_problem: 'Ongelma keittiössä',
  other: 'Ravintola perui',
}

// Koko selitys asiakkaalle: syy ja veloitus. Peruttu tilaus ei maksa mitään:
// kortin varaus vapautuu tai jo veloitettu summa palautetaan (backend/settlement.js).
export function cancelReasonText(order) {
  const reason = REASON_SENTENCES[order?.cancel_reason] ?? 'Tilaus peruttiin.'
  return `${reason} Tilauksesta ei veloiteta - mahdollinen maksu palautetaan kortillesi.`
}

export function cancelReasonShort(order) {
  return REASON_SHORT[order?.cancel_reason] ?? 'Peruttu'
}

// Kojelaudan tekstit (ravintolan näkökulma).
export function restaurantReasonLabel(code) {
  return (
    [...RESTAURANT_MIDWAY_REASONS, ...RESTAURANT_REJECT_REASONS].find((r) => r.key === code)?.label ??
    REASON_SHORT[code] ??
    null
  )
}

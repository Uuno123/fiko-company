// Asiakkaan tallennettu toimitusosoite (customers-taulu, migraatio 0066):
// asunnon tyyppi, tyyppikohtaiset tiedot ja pysyvät ohjeet kuljettajalle.
// Kerätään rekisteröitymisen osoitesivulla (pages/RegisterAddress.jsx), ja
// kassa esitäyttää niistä porras/asunto- ja ohjekentät (pages/Cart.jsx).

export const ADDRESS_TYPES = [
  { value: 'apartment', label: 'Kerrostalo' },
  { value: 'terraced', label: 'Rivitalo' },
  { value: 'house', label: 'Omakotitalo' },
  { value: 'office', label: 'Toimisto' },
  { value: 'other', label: 'Muu' },
]

export const COURIER_INSTRUCTIONS_MAX = 300

// Rekisteröitymisen osoitesivu (App.jsx).
export const REGISTER_ADDRESS_PATH = '/rekisteroidy/osoite'

export function addressTypeLabel(type) {
  return ADDRESS_TYPES.find((option) => option.value === type)?.label ?? null
}

// Asunnon numero on pakollinen kerrostalossa ja rivitalossa - ilman sitä
// kuljettaja ei löydä oikeaa ovea.
export function requiresApartment(type) {
  return type === 'apartment' || type === 'terraced'
}

// Kirjautuneella on valmis osoite, kun tyyppi ja paikannettu osoite löytyvät.
export function hasSavedAddress(customer) {
  return Boolean(customer?.address && customer?.address_type)
}

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '')

// Kassan "Porras ja asunto" -kenttä: esim. "A 12" tai toimiston nimi.
export function savedApartmentLine(customer) {
  const details = customer?.address_details ?? {}
  if (customer?.address_type === 'office') return trimmed(details.company)
  return [trimmed(details.staircase), trimmed(details.apartment)].filter(Boolean).join(' ')
}

// Kassan "Ohjeet"-kenttä: tyyppi, kerros, ovikoodi ja omat ohjeet yhdellä
// rivillä, esim. "Kerrostalo, 3. krs · ovikoodi 1234 · Soita ovikelloa".
export function savedCourierNotes(customer) {
  if (!customer?.address_type) return ''
  const details = customer.address_details ?? {}
  const floor = trimmed(details.floor)
  const place = [addressTypeLabel(customer.address_type), floor ? `${floor}. krs` : ''].filter(Boolean).join(', ')
  const doorCode = trimmed(details.doorCode)
  return [place, doorCode ? `ovikoodi ${doorCode}` : '', trimmed(customer.courier_instructions)]
    .filter(Boolean)
    .join(' · ')
}

// Asetusten tiivistelmä tallennetusta osoitteesta: "Kerrostalo · A 12 · 3. krs · ovikoodi 1234".
export function savedAddressSummary(customer) {
  if (!customer?.address_type) return ''
  const details = customer.address_details ?? {}
  const floor = trimmed(details.floor)
  const doorCode = trimmed(details.doorCode)
  return [
    addressTypeLabel(customer.address_type),
    savedApartmentLine(customer),
    floor ? `${floor}. krs` : '',
    doorCode ? `ovikoodi ${doorCode}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

// Ikä täysinä vuosina syntymäajasta (yyyy-mm-dd).
export function ageFromBirthDate(birthDate, today = new Date()) {
  const [year, month, day] = String(birthDate).split('-').map(Number)
  if (!year || !month || !day) return null
  let age = today.getFullYear() - year
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1
  return age
}

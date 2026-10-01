export function formatPrice(cents) {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Siistii pitkän, Nominatimin raa'an display_name-osoitteen ("2, Katu, Kaupunginosa, Kaupunki,
// Seutukunta, Maakunta, Maa-alue, Postinumero, Maa") lyhyeksi "Katu 2, Postinumero Kaupunki"
// -muotoon, kun kumppanin osoite on tallentunut sellaisenaan. Ei koske jo siistejä osoitteita
// (esim. "Puijonkatu 15, 70100 Kuopio"), joissa on korkeintaan kaksi pilkulla erotettua osaa.
export function formatDisplayAddress(address, city) {
  if (!address) return address
  const parts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length <= 2) return address

  const postalMatch = address.match(/\b\d{5}\b/)
  const postalCode = postalMatch ? postalMatch[0] : ''

  let streetPart = parts[0]
  if (/^\d+[a-z]?$/i.test(parts[0]) && parts[1]) {
    streetPart = `${parts[1]} ${parts[0]}`
  }

  // Ilman erikseen annettua kaupunkia se päätellään Nominatimin järjestyksestä:
  // kaupunki on aina juuri ennen "X seutukunta" -osaa.
  const regionIndex = parts.findIndex((part) => /seutukunta$/i.test(part))
  const cityPart = city || (regionIndex > 0 ? parts[regionIndex - 1] : '')
  const tail = [postalCode, cityPart].filter(Boolean).join(' ')
  return [streetPart, tail].filter(Boolean).join(', ') || address
}

// "Metsurintie 27, 70150 Kuopio" -> { street: 'Metsurintie 27', postalCode: '70150', city: 'Kuopio' }.
// Kassan osoitekentät esitäytetään tästä, ja tilauksen osoite kootaan takaisin joinAddress():lla.
export function splitAddress(address) {
  const [street = '', ...rest] = (formatDisplayAddress(address) || '').split(',').map((part) => part.trim())
  const locality = rest.join(' ')
  const postalCode = locality.match(/\b\d{5}\b/)?.[0] ?? ''
  return { street, postalCode, city: locality.replace(postalCode, '').trim() }
}

// Porras ja asunto kuuluvat katuosoitteen perään: "Metsurintie 27 A 7, 70150 Kuopio".
export function joinAddress({ street, apartment, postalCode, city }) {
  const streetLine = [street, apartment].map((part) => part?.trim()).filter(Boolean).join(' ')
  const locality = [postalCode, city].map((part) => part?.trim()).filter(Boolean).join(' ')
  return [streetLine, locality].filter(Boolean).join(', ')
}

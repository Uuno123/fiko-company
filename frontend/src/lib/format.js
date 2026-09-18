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

  const cityPart = city || ''
  const tail = [postalCode, cityPart].filter(Boolean).join(' ')
  return [streetPart, tail].filter(Boolean).join(', ') || address
}

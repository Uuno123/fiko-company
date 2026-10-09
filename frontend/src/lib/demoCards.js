// TILAPÄINEN, käyttäjän pyynnöstä esittelykäyttöön: kortin "tallennus" ei ole
// oikea maksupalvelu. Selaimeen jää vain kortin merkki, 4 viimeistä numeroa ja
// voimassaolo - ei koskaan koko numeroa eikä turvakoodia. Oikeassa toteutuksessa
// kortti tallennetaan Stripeen (SetupIntent), ei omaan tietokantaan.
//
// Omana tiedostonaan, koska sekä maksutapasivu että mobiilin "Omat tiedot"
// -näkymän pikaruutu lukevat samaa listaa.
function storageKey(customerId) {
  return `delivo-demo-cards-${customerId}`
}

export function loadCards(customerId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(customerId))) ?? []
  } catch {
    return []
  }
}

export function saveCards(customerId, cards) {
  try {
    localStorage.setItem(storageKey(customerId), JSON.stringify(cards))
  } catch {
    // Selaimen tallennus estetty (esim. yksityinen ikkuna) - kortit näkyvät silti tämän käynnin ajan.
  }
}

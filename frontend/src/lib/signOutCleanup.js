import { ADDRESS_CHANGED_EVENT } from './deliveryAddress.js'

// Uloskirjautuessa selaimesta poistetaan käyttäjän henkilökohtaiset tiedot
// (käyttäjän pyyntö): kaikki "delivo-"-alkuiset avaimet, eli ostoskori,
// toimitusosoite, simuloidut tilaukset ja kortit, seurantakuplan asetukset jne.
// Uudet delivo-avaimet tulevat näin automaattisesti mukaan.
//
// Jäävät tarkoituksella:
//   - evästesuostumus: se kuuluu selaimelle eikä käyttäjälle, ja poistaminen
//     toisi evästebannerin takaisin jokaisen uloskirjautumisen jälkeen
//   - ravintolan kojelaudan "pd-"-asetukset (äänet, näytön pito päällä):
//     ne kuuluvat tilauslaitteelle, eivät kirjautuneelle henkilölle
//   - Supabasen oma istuntoavain, jonka signOut poistaa itse
const KEEP_KEYS = new Set(['delivo-cookie-consent'])

export const SIGNED_OUT_EVENT = 'delivo:signed-out'

export function clearPersonalData() {
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      const storage = window[storageName]
      Object.keys(storage)
        .filter((key) => key.startsWith('delivo-') && !KEEP_KEYS.has(key))
        .forEach((key) => storage.removeItem(key))
    } catch {
      // Tallennustila estetty (esim. yksityinen ikkuna) - siellä ei myöskään ole poistettavaa.
    }
  }
  // Muistissa olevat kopiot (ostoskori, osoite) tyhjennetään samalla, muuten
  // ne kirjoittuisivat takaisin selaimeen.
  window.dispatchEvent(new Event(SIGNED_OUT_EVENT))
  window.dispatchEvent(new Event(ADDRESS_CHANGED_EVENT))
}

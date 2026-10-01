// Kuljetusmaksu yhdessä paikassa. Sama luku on backendin payments.js:ssä, jossa
// veloitus oikeasti lasketaan - jos tämä muuttuu, se on muutettava myös siellä.
// Aiemmin "5,99 €" oli kovakoodattuna merkkijonona viidessä eri komponentissa,
// jolloin hinnan muuttaminen olisi jättänyt osan näytöistä vanhaan lukuun.
export const DELIVERY_FEE_CENTS = 599

// Arvio näytetään haarukkana eikä yhtenä lukuna: ravintolan antama
// pickup_estimate_minutes on arvio, ja yksi tarkka minuuttiluku lupaisi
// tarkkuutta jota siinä ei ole. Haarukan leveys on esitystapa, ei dataa -
// alaraja on aina ravintolan oma arvio.
const ETA_WINDOW_MINUTES = 10

export function formatEtaRange(minutes) {
  if (!minutes) return null
  return `${minutes}-${minutes + ETA_WINDOW_MINUTES} min`
}

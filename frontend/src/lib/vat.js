// Arvonlisävero kassan yhteenvedossa (käyttäjän pyyntö 10.11.2026).
// Hinnat ovat verollisia, joten vero lasketaan hinnan sisältä:
// vero = verollinen hinta × kanta / (1 + kanta).
//
// TARKISTA KIRJANPITÄJÄLTÄ ennen tuotantoa: kannat muuttuvat lainsäädännön
// mukana, ja ravintolaruoan, noutoruoan ja välityspalvelun kanta voi
// poiketa toisistaan.
export const VAT_RATES = {
  // Ravintola- ja ateriapalvelut sekä noutoruoka.
  food: 0.14,
  // Bidropin palvelumaksu (välityspalvelu, yleinen verokanta).
  service: 0.255,
}

export function vatIncluded(grossCents, rate) {
  if (!grossCents || grossCents <= 0) return 0
  return Math.round((grossCents * rate) / (1 + rate))
}

export function formatVatRate(rate) {
  return `${String(Math.round(rate * 1000) / 10).replace('.', ',')} %`
}

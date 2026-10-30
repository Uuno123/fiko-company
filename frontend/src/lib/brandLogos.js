// Ravintolaketjujen logot (käyttäjän pyyntö 29.10.2026, vain designia varten):
// ketjujen omilta sivuilta haetut logot public/logos-kansiossa (McDonald'sin
// kaaret Wikimedia Commonsista, koska yhtiön sivut estävät haun). Ennen oikeaa
// käyttöä ravintoloilta tarvitaan lupa logojen käyttöön.
// pad: lisätila korkealle merkille, jottei se täytä ympyrää reunasta reunaan.
// bg: taustaväri valkoiselle logolle (Taco Bell). search: hakusana, jos eri kuin nimi.
export const BRAND_LOGOS = [
  { name: "McDonald's", logo: '/logos/mcdonalds.svg', pad: 20 },
  { name: 'Hesburger', logo: '/logos/hesburger.svg' },
  { name: 'Burger King', logo: '/logos/burger-king.png' },
  { name: 'Kotipizza', logo: '/logos/kotipizza.svg', pad: 16 },
  { name: 'KFC', logo: '/logos/kfc.png', pad: 12 },
  { name: 'Subway', logo: '/logos/subway.png' },
  { name: 'Five Guys', logo: '/logos/five-guys.svg', pad: 16 },
  { name: 'Taco Bell', logo: '/logos/taco-bell.svg', pad: 12, bg: '#702082' },
  { name: 'Friends & Brgrs', search: 'Friends & Burgers', logo: '/logos/friends-burgers.svg' },
  { name: 'Rolls', logo: '/logos/rolls.png', pad: 12 },
  { name: 'Starbucks', logo: '/logos/starbucks.svg', pad: 14 },
  { name: 'Pancho Villa', logo: '/logos/pancho-villa.png' },
]

const normalize = (value) => (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Ketjun logo ravintolan nimen perusteella ("McDonald's Kuopio" -> McDonald's),
// esim. ravintolasivun pyöreään logoon. null, jos ketjua ei tunneta.
export function brandLogoFor(restaurantName) {
  const name = normalize(restaurantName)
  if (!name) return null
  return (
    BRAND_LOGOS.find((brand) => {
      const keys = [brand.name, brand.search].filter(Boolean).map(normalize)
      return keys.some((key) => name.startsWith(key))
    }) ?? null
  )
}

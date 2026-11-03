import { getDemoRestaurant } from './demoRestaurants.js'

// Kategorian nimi URL-muotoon. Jaettu, koska etusivu luo linkit ja
// kategoriasivu tulkitsee ne - eri toteutukset ajautuisivat erilleen.
export function categorySlug(category) {
  return category
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Täytetiedot kun kategoriassa on alle 3 oikeaa ravintolaa - selvästi
// fiktiivisiä, eivät klikattavissa (ks. RestaurantCard disabled-tila).
// Jaettu, koska sekä etusivun rivit että kategoriasivu täydentävät samalla
// säännöllä - muuten sama kategoria näyttäisi eri määrän eri paikoissa.
export const FILLER_TEMPLATES_BY_CATEGORY = {
  // Liitä oma kuvalinkki lainausmerkkien väliin (image_url: 'https://...').
  // Tyhjänä RestaurantCard näyttää RestaurantAvatarPlaceholderin (nimen
  // alkukirjain) - sama putoaminen kuin muillakin ravintoloilla joilta kuva
  // puuttuu, joten rivin voi jättää tyhjäksi ilman että mikään hajoaa.
  // Ketjuravintoloilla sijainti nimessä (käyttäjän pyyntö 3.11.2026). Kadut ovat
  // esittelyä varten - tarkista oikeat toimipisteet ennen julkaisua.
  Burgerit: [
    // demoId: tilattavissa esittelyä varten (lib/demoRestaurants.js), ei pelkkä täytekortti.
    // McDonald's 9,8 / 10 (käyttäjän pyyntö 28.10.2026; tallennettu 1–5-asteikolla 4.9).
    { name: "McDonald's Kuopio Tehtaankatu", keywords: ['mäkkäri', 'mäkki', 'mcd'], rating: 4.9, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127', demoId: 'b42ac227-e8eb-4086-8de4-f2d7043465fd' },
    { name: 'Hesburger Kuopio Puijonkatu', keywords: ['hese'], rating: 4.0, pickup_estimate_minutes: 14, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67ea79d0e3aca1debaea9cdd' },
    { name: 'Burger King Kuopio Kauppakatu', rating: 4.2, pickup_estimate_minutes: 16, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/673206fbae168d77add71220' },
    { name: 'Hook Kuopio', rating: 4.6, pickup_estimate_minutes: 18, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/697ca18d8d71993ce3310d3c' },
    { name: "Barot's Kuopio", rating: 4.5, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6732147ca94945236d40b602' },
    { name: "Chitir Chicken Kuopio", rating: 4.4, pickup_estimate_minutes: 15, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/692d7d6a6e49547bd7f44458' },
  ],
  // Liitä oma kuvalinkki lainausmerkkien väliin (image_url: 'https://...') -
  // sama tyhjä-kelpaa-periaate kuin Burgerit-listalla.
  'Kebab & Pizza': [
    { name: 'Kuopion Volkan Ravintola', rating: 4.5, pickup_estimate_minutes: 25, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/68a57621e6b217110a27d3ea' },
    { name: 'Kruunu Kebab', rating: 4.6, pickup_estimate_minutes: 20, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/673214b4d626ac704e40c07d' },
    { name: 'Marina Pizzeria', rating: 4.4, pickup_estimate_minutes: 18, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/6810cc1ab4526c355f4c532e' },
    { name: 'Marmara Pizzeria', rating: 4.4, pickup_estimate_minutes: 22, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/6735db0c9a62d71e30a74cfa' },
    { name: 'Kuopion Pizzatori', rating: 4.6, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6900e59a1c0a709b4414269a' },
  ],
  // Lisää Kuopion ravintoloita Woltin listalta kuvineen (käyttäjän pyyntö
  // 3.11.2026). Kuvat ja nimet vain suunnittelua varten - luvat ennen julkaisua.
  Aasialainen: [
    { name: "Ozaki Sushi", rating: 4.5, pickup_estimate_minutes: 20, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67332fbb149445354de03f5c' },
    { name: "Maido Restaurant", rating: 4.7, pickup_estimate_minutes: 20, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6968c27738b41bac5ad3f942' },
    { name: "CaiJi Noodle House", rating: 4.6, pickup_estimate_minutes: 20, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/67335eb4a7cc62434f9d9b99' },
    { name: "Kickin Korean Kauppakatu", rating: 4.3, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6928177df7880d70c7d25991' },
    { name: "SEOUL GOOD Matkus", rating: 4.7, pickup_estimate_minutes: 40, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67c56e69bbc4b81204a2fe41' },
    { name: "Luckiefun's Matkus", rating: 4.5, pickup_estimate_minutes: 45, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/68401d07d1cf4208775f49e7' },
    { name: "Sweetown Apaja", rating: 4.6, pickup_estimate_minutes: 20, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67321470479a971266a6ae92' },
  ],
  Kiinalainen: [
    { name: "Dragon Sheng Kuopio", rating: 4.6, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67332fc0e01243558b0bfc31' },
    { name: "Nopsa Kulma", rating: 4.4, pickup_estimate_minutes: 15, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/6a3b98191eb69a0aa2253129' },
  ],
  Intialainen: [
    { name: "Sanskriti", rating: 4.6, pickup_estimate_minutes: 25, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/673214696da31462759195ac' },
    { name: "Namaste Kuopio", rating: 4.3, pickup_estimate_minutes: 20, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6732075e5521ce1fc3440826' },
    { name: "Mandala Kuopio", rating: 4.6, pickup_estimate_minutes: 15, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/67333005ff1e1d7f67656ef9' },
  ],
  Bowlit: [
    { name: "Huuva Kuopio", rating: 4.2, pickup_estimate_minutes: 30, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6a5dfe7aca398677dbafa2c2' },
  ],
  Aamiainen: [
    { name: "Café Trube", rating: 4.8, pickup_estimate_minutes: 10, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/678912f0362be7192070c3a7' },
    { name: "Espresso House Carlson", rating: 4.6, pickup_estimate_minutes: 10, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/68ac0080b9fd37e9e940a5c2' },
    { name: "Kahvila & Kakkukauppa Houkutus Kuopio", rating: 4.5, pickup_estimate_minutes: 10, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67332fc129cd4b694e529c63' },
    { name: "Arnolds Matkus", rating: 4.7, pickup_estimate_minutes: 40, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6908589e172128e180fba8f8' },
    { name: "Lentävä Kalakukko", rating: 4.9, pickup_estimate_minutes: 15, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/686cc6ce6155cf1e51168479' },
  ],
  Salaatit: [
    { name: "Subway Vuorikatu", rating: 4.4, pickup_estimate_minutes: 10, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/68a861195a13d705dbfaa783' },
    { name: "SalaCavala", rating: 4.6, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/678926a69573123c59b6e3c0' },
    { name: "Picnic Matkus", rating: 4.6, pickup_estimate_minutes: 35, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/67c9a41c150e92790bee97e8' },
  ],
  Kotiruoka: [
    { name: "Muikkuravintola Sampo", rating: 4.5, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/673208c4b5de01710c50a83a' },
    { name: "Lounaskahvila Hilima", rating: 4.5, pickup_estimate_minutes: 10, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6732148e479a971266a6b166' },
  ],
  Tacot: [
    { name: "Pancho Villa / Kuopio", rating: 4.2, pickup_estimate_minutes: 30, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/67332fb5827209684f08e301' },
    { name: "Wrapito Tex-Mex", rating: 4.2, pickup_estimate_minutes: 55, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6a438bc58866826f06471258' },
  ],
  Italialainen: [
    { name: "Pizzeria Sorrento", rating: 4.4, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67320809b5de01710c50a016' },
    { name: "Fjorno", rating: 4.7, pickup_estimate_minutes: 15, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/67331c914d55f07b7e8941ef' },
    { name: "Blocco", rating: 4.6, pickup_estimate_minutes: 10, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67332fe2f80c1126648b754d' },
  ],
  // Vain ravintolat, joille on annettu oikea Wolt-kuva (käyttäjän pyyntö
  // 3.11.2026). Keksityt ravintolat ja omat/Unsplash-kuvat poistettu.
}

export function buildFillerRestaurant(category, index, template) {
  // Esittelyravintola on klikattava ja tilattava - sama data kuin sen sivulla.
  const demo = template.demoId ? getDemoRestaurant(template.demoId) : null
  if (demo) return { ...demo, category }

  return {
    id: `filler-${category}-${index}`,
    name: template.name,
    category,
    image_url: template.image_url,
    is_open: true,
    rating: template.rating,
    menu_items: [],
    free_delivery: template.free_delivery,
    pickup_estimate_minutes: template.pickup_estimate_minutes,
    isPlaceholder: true,
  }
}

// Täydentää rivin täyteravintoloilla, jotta kategoriarivi ei näytä vajaalta
// yhden oikean ravintolan kanssa. Täytteet eivät ole klikattavissa
// (isPlaceholder -> RestaurantCard disabled), joten niistä ei pääse
// olemattoman ravintolan sivulle.
// minCount on ylärajattomasti antelias (12): se ei koskaan keksi enempää
// täytteitä kuin FILLER_TEMPLATES_BY_CATEGORY:ssa on määritelty (silmukka
// pysähtyy myös i < fillers.length -ehtoon), joten tämä vain varmistaa ettei
// osa jo kirjoitetuista täytekorteista jää näyttämättä kuten Kebab & Pizzassa
// kävi kun oikeita + täytteitä oli yhteensä enemmän kuin vanha raja 6.
export function padWithFillers(category, items, minCount = 12) {
  const fillers = FILLER_TEMPLATES_BY_CATEGORY[category] ?? []
  const padded = [...items]
  for (let i = 0; padded.length < minCount && i < fillers.length; i++) {
    // Esittelyravintola on myös tietokannassa: jos se tuli jo oikeiden
    // ravintoloiden mukana, sitä ei lisätä toista kertaa.
    if (fillers[i].demoId && padded.some((restaurant) => restaurant.id === fillers[i].demoId)) continue
    padded.push(buildFillerRestaurant(category, i, fillers[i]))
  }
  return padded
}

function normalizeSearchText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function commonPrefixLength(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

// Sallii taivutusmuodot ilman täyttä sumeaa hakua: "salaatti" löytää
// "Salaatit" ja "pizza" löytää "Pizzeria", koska alku on riittävän pitkälti sama.
function wordMatches(word, term) {
  if (word.includes(term)) return true
  const shorter = Math.min(word.length, term.length)
  return shorter >= 4 && commonPrefixLength(word, term) >= Math.max(4, shorter - 2)
}

// Kun haku osuu kategoriaan, mukaan tulevat myös sukulaiskategorioiden
// täytteet: pizzaa etsivä kiinnostuu todennäköisesti myös italialaisista.
const RELATED_FILLER_CATEGORIES = {
  'Kebab & Pizza': ['Italialainen'],
  Italialainen: ['Kebab & Pizza'],
  Salaatit: ['Kotiruoka'],
}

// Ruokasanat, joilla kategorian täytteet löytyvät vaikka sana ei esiinny
// kategorian nimessä ("pasta" -> Italialainen). "kiinalainen" ja "aamiainen"
// ovat kategorialaatikoita ilman omia ravintoloita (28.10.2026): ne löytävät
// aasialaiset ja kahvilat, ettei laatikko vie tyhjään hakuun.
const CATEGORY_SEARCH_KEYWORDS = {
  Burgerit: ['hampurilainen', 'ranskalaiset'],
  'Kebab & Pizza': ['pita', 'rulla', 'grilli'],
  Italialainen: ['pasta', 'pizza', 'lasagne', 'risotto'],
  Aasialainen: ['sushi', 'wok', 'nuudeli', 'ramen', 'thai', 'kiinalainen'],
  Salaatit: ['bowl', 'kasvis', 'vegaani'],
  Kotiruoka: ['lounas', 'keitto', 'lihapullat'],
  Kahvila: ['kahvi', 'kakku', 'leivos', 'pulla', 'aamiainen', 'brunssi'],
}

function categoryText(category) {
  return [category, ...(CATEGORY_SEARCH_KEYWORDS[category] ?? [])].join(' ')
}

function textMatches(text, term) {
  const words = normalizeSearchText(text).split(' ')
  return words.join(' ').includes(term) || words.some((word) => wordMatches(word, term))
}

// Täyteravintolat, jotka liittyvät hakusanaan nimen, kategorian tai
// lempinimen (esim. "hese") kautta. Samat id:t kuin etusivun täytteillä.
export function searchFillerRestaurants(query) {
  // Kaksi kirjainta osuu liian moneen ("ab" -> kebab -> koko kategoria).
  const term = normalizeSearchText(query ?? '')
  if (term.length < 3) return []

  const matchedCategories = Object.keys(FILLER_TEMPLATES_BY_CATEGORY).filter((category) =>
    textMatches(categoryText(category), term),
  )
  const relatedCategories = new Set(
    matchedCategories.flatMap((category) => RELATED_FILLER_CATEGORIES[category] ?? []),
  )

  const direct = []
  const related = []
  for (const [category, templates] of Object.entries(FILLER_TEMPLATES_BY_CATEGORY)) {
    templates.forEach((template, index) => {
      const filler = buildFillerRestaurant(category, index, template)
      if (textMatches([template.name, categoryText(category), ...(template.keywords ?? [])].join(' '), term)) {
        direct.push(filler)
      } else if (relatedCategories.has(category)) {
        related.push(filler)
      }
    })
  }
  return [...direct, ...related]
}

// Kovimmat tarjoukset (käyttäjän valinta 24.10.2026): etusivun oma rivi ja
// kategoriarivin oranssi Tarjoukset-laatikko, joka hakee sanalla DEALS_QUERY.
// Neljä ensimmäistä käyttäjän valitsemia, loput eri ruokalajeista vaihtelun vuoksi.
export const DEALS_QUERY = 'Tarjoukset'
// Oranssin Tarjoukset-linkin paikka kategoriariveissä (työpöydän CategoryBar ja
// mobiilin etusivun rivi): kolmantena.
export const DEALS_LINK_INDEX = 2
export const DEALS_RESTAURANTS = [
  "McDonald's Kuopio Tehtaankatu",
  'Kuopion Volkan Ravintola',
  'Hesburger Kuopio Puijonkatu',
  'Friends & Burgers Kuopio Matkus',
  'Marina Pizzeria',
  'Sushi Nami',
  'Hook Kuopio',
  'Wok & Roll',
]

export function isDealsQuery(query) {
  const term = normalizeSearchText(query ?? '')
  return term === 'tarjoukset' || term === 'kovimmat tarjoukset'
}

// Kaikki täyteravintolat kerran (sama nimi voi olla useassa kategoriassa).
// Etusivun pikavalintahaku (lib/quickFilters.js) suodattaa näistä.
export function allFillerRestaurants() {
  const byName = new Map()
  for (const [category, templates] of Object.entries(FILLER_TEMPLATES_BY_CATEGORY)) {
    templates.forEach((template, index) => {
      if (!byName.has(template.name)) byName.set(template.name, buildFillerRestaurant(category, index, template))
    })
  }
  return [...byName.values()]
}

// Haun tulokset Tarjoukset-sanalle: listan ravintolat täytepohjista tässä
// järjestyksessä (esittelyravintola McDonald's on klikattava, muut eivät).
export function dealsFillerRestaurants() {
  const byName = new Map(allFillerRestaurants().map((r) => [r.name, r]))
  return DEALS_RESTAURANTS.map((name) => byName.get(name)).filter(Boolean)
}

// Suodatinrivin "kaikki"-vaihtoehto. Jaettu, jotta kategoriarivi tunnistaa sen
// ilman omaa merkkijonokopiota.
export const ALL = 'Kaikki'

// Kategoriat ja niiden kuvat. Tämä lista on kategorioiden lähde: laatikko
// näkyy kategoriarivissä riippumatta siitä onko kategoriassa vielä
// ravintoloita, joten uuden kategorian avaaminen on pelkkä rivi tänne.
//
// Ensimmäiset seitsemän ovat kategorioita joita ravintoloilla oikeasti on
// (restaurants.category tietokannassa) - niiden nimiä ei voi muuttaa täältä
// ilman migraatiota. Loput yhdeksän ovat käyttäjän pyynnöstä palautettuja
// laatikoita ILMAN täyteravintoloita (ks. FILLER_TEMPLATES_BY_CATEGORY, jossa
// näitä yhdeksää ei ole) - laatikko ja kategoriasivu ovat siis olemassa,
// mutta niissä ei näytetä yhtään korttia ennen kuin oikea ravintola liittyy.
//
// Kuvat ovat oikeita ruokavalokuvia Unsplashista (käyttäjän pyyntö 29.10.2026,
// tekoälykuvitusten tilalle), neliöiksi rajattuina 240 px WebP-kuvina. Unsplash
// License: ilmainen myös kaupalliseen käyttöön, mainintaa ei vaadita, mutta
// kuvaajat kirjattu tähän (unsplash.com/photos/<id>):
//   burger: amirali mirhashemian (jh5XyK4Rr3Y), pizza: David Foodphototasty
//   (xIqVfW8XUt4), salad: Anna Pelzer (IGfIGP5ONV0), sushi: Derek Duran
//   (Jz4QMhLvGgw), dessert: David Eduardo Lopez Diaz (7Qv51sxpghM), pasta:
//   Homescreenify (sA3wymYqyaI), chicken (kotiruoka): Parnis Azimi
//   (qrDM1rmKgOQ), kebab: Anima Visual (jhTzMj5aJQk), ramen: Daniel Stiel
//   (YFU0AvczmLk), chinese: Orijit Chatterjee (wEBg_pYtynw), bowls: Anto
//   Meneghini (IrohWzafmmA), vegan: Charlotte Karlsen (yz0yUM6IZ4k), breakfast:
//   Jaqueline Pelzer (MytHEJlzdcM).
// Intialainen, Kreikkalainen ja Tacot ovat vielä vanhoja kuvituksia (eivät
// näy etusivun rivissä ennen kuin niille tulee ravintoloita).
// icon: piirretty kuvake läpinäkyvällä taustalla etusivun kategoriariviin
// (Woltin tapaan, käyttäjän ChatGPT:llä tekemä sarja 29.10.2026; piirretty
// läpinäkyvyysruudukko poistettu ja kuvat rajattu 256 px WebP:ksi).
export const CATEGORY_TILE_META = {
  // Flätit kuvakkeet: Microsoft Fluent Emoji Flat (MIT-lisenssi,
  // public/flat-icons/LICENSE-fluent-emoji.txt), käyttäjän pyyntö 3.11.2026.
  // Burgeri: käyttäjän antama kuva, ruudukkotausta poistettu (3.11.2026).
  Burgerit: { img: '/category-burger.webp', icon: '/category-burger-photo.webp' },
  // Pizza: käyttäjän antama kuva (pizza_category_hd.png, 3.11.2026).
  'Kebab & Pizza': { img: '/category-pizza.webp', icon: '/category-pizza-photo.webp' },
  // Salaatti: käyttäjän antama kuva (3.11.2026).
  Salaatit: { img: '/category-salad.webp', icon: '/category-salad-photo.webp' },
  // Sushi: käyttäjän antama kuva (3.11.2026).
  Aasialainen: { img: '/category-sushi.webp', icon: '/category-sushi-photo.webp' },
  Kahvila: { img: '/category-dessert.webp', icon: '/flat-icons/hot_beverage.svg' },
  // Pasta: käyttäjän antama kuva (3.11.2026).
  Italialainen: { img: '/category-pasta.webp', icon: '/category-pasta-photo.webp' },
  // Kotiruoka: käyttäjän antama kuva (3.11.2026).
  Kotiruoka: { img: '/category-chicken.webp', icon: '/category-kotiruoka-photo.webp' },
  // Kebab: käyttäjän antama kuva, ruudukkotausta poistettu (3.11.2026).
  Kebab: { img: '/category-kebab.webp', icon: '/category-kebab-photo.webp' },
  // Ramen: käyttäjän antama kuva, ruudukkotausta poistettu (3.11.2026).
  Ramen: { img: '/category-ramen.webp', icon: '/category-ramen-photo.webp' },
  Kiinalainen: { img: '/category-chinese.webp', icon: '/category-chinese-icon.webp' },
  // Uudet kategoriat 29.10.2026: vain piirretty kuvake (ei valokuvaa), ei vielä ravintoloita.
  Thai: { img: '/category-thai-icon.webp', icon: '/category-thai-icon.webp' },
  Korealainen: { img: '/category-korean-icon.webp', icon: '/category-korean-icon.webp' },
  Wingsit: { img: '/category-wings-icon.webp', icon: '/category-wings-icon.webp' },
  Intialainen: { img: '/category-indian.jpg', icon: '/category-indian-icon.webp' },
  Kreikkalainen: { img: '/category-greek.jpg', icon: '/category-greek-icon.webp' },
  Bowlit: { img: '/category-bowls.webp', icon: '/category-bowls-icon.webp' },
  Tacot: { img: '/category-tacos.jpg', icon: '/category-tacos-icon.webp' },
  Vegaani: { img: '/category-vegan.webp', icon: '/category-vegan-icon.webp' },
  Aamiainen: { img: '/category-breakfast.webp', icon: '/category-breakfast-icon.webp' },
}

// Kategorioiden mainoslauseet (käyttäjän pyyntö 29.10.2026, kuten Uber Eatsin
// "Popular near you"): etusivun rivien otsikot ja kategoriasivun alaotsikko.
export const CATEGORY_SLOGANS = {
  Burgerit: 'Kun tekee mieli burgeria',
  'Kebab & Pizza': 'Klassikot: pizza ja kebab',
  Salaatit: 'Raikasta ja kevyttä',
  Aasialainen: 'Aasian makumatka',
  Kahvila: 'Kahvia ja jotain makeaa',
  Italialainen: 'Italian makuja',
  Kotiruoka: 'Kuin kotona tehtyä',
  Kebab: 'Kebabin ystäville',
  Ramen: 'Lämmin kulho ramenia',
  Kiinalainen: 'Kiinalaisia klassikoita',
  Intialainen: 'Mausteista Intiasta',
  Kreikkalainen: 'Kreikan auringon alta',
  Bowlit: 'Täyteläiset bowlit',
  Tacot: 'Tacoja ja tex-mexiä',
  Vegaani: 'Vegaanista ja vihreää',
  Aamiainen: 'Hyvää huomenta',
}

// Lyhyet nimet etusivun pienille kategorialaatoille, jotta nimi mahtuu yhdelle
// riville (käyttäjän pyyntö 29.10.2026). Puuttuva = kategorian oma nimi.
// Kategoriasivut, haku ja otsikot käyttävät edelleen koko nimeä.
export const CATEGORY_SHORT_LABELS = {
  'Kebab & Pizza': 'Pizza',
  Aasialainen: 'Aasia',
  Italialainen: 'Italia',
  Kiinalainen: 'Kiina',
  Intialainen: 'Intia',
  Kreikkalainen: 'Kreikka',
  Korealainen: 'Korea',
}

// Kategorialaatikoiden järjestys rivillä.
export const CATEGORY_NAMES = Object.keys(CATEGORY_TILE_META)

export const DEFAULT_TILE_META = { emoji: '🍽️' }

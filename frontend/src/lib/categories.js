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
  Burgerit: [
    // demoId: tilattavissa esittelyä varten (lib/demoRestaurants.js), ei pelkkä täytekortti.
    { name: "McDonald's", keywords: ['mäkkäri', 'mäkki', 'mcd'], rating: 4.1, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127', demoId: 'demo-mcdonalds' },
    { name: 'Hesburger', keywords: ['hese'], rating: 4.0, pickup_estimate_minutes: 14, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/67ea79d0e3aca1debaea9cdd' },
    { name: 'Burger King', rating: 4.2, pickup_estimate_minutes: 16, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/673206fbae168d77add71220' },
    { name: 'Friends & Burgers', rating: 4.5, pickup_estimate_minutes: 20, free_delivery: false, image_url: 'https://www.friendsandbrgrs.fi/app/uploads/2026/09/mushroommaniac-kansikuva-1024x576.png' },
    { name: 'Hook Kuopio', rating: 4.6, pickup_estimate_minutes: 18, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/697ca18d8d71993ce3310d3c' },
    { name: 'Grilli 24', rating: 4.3, pickup_estimate_minutes: 17, free_delivery: true, image_url: '/burger.jpg' },
  ],
  // Liitä oma kuvalinkki lainausmerkkien väliin (image_url: 'https://...') -
  // sama tyhjä-kelpaa-periaate kuin Burgerit-listalla.
  'Kebab & Pizza': [
    { name: 'Kuopion Volkan Ravintola', rating: 4.5, pickup_estimate_minutes: 25, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/68a57621e6b217110a27d3ea' },
    { name: 'Kruunu Kebab', rating: 4.6, pickup_estimate_minutes: 20, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/673214b4d626ac704e40c07d' },
    { name: 'Marina Pizzeria', rating: 4.4, pickup_estimate_minutes: 18, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/6810cc1ab4526c355f4c532e' },
    { name: 'Marmara Pizzeria', rating: 4.4, pickup_estimate_minutes: 22, free_delivery: true, image_url: 'https://imageproxy.wolt.com/assets/6735db0c9a62d71e30a74cfa' },
    { name: 'Kuopion Pizzatori', rating: 4.6, pickup_estimate_minutes: 15, free_delivery: false, image_url: 'https://imageproxy.wolt.com/assets/6900e59a1c0a709b4414269a' },
    { name: 'Pizzeria Bella Vita', rating: 4.5, pickup_estimate_minutes: 21, free_delivery: false, image_url: '/pizza.jpg' },
  ],
  Kotiruoka: [
    {
      name: 'Mummon Pöytä',
      rating: 4.6,
      pickup_estimate_minutes: 22,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1566751640620-a9dd00cfbab4?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Kotilieden Lounas',
      rating: 4.2,
      pickup_estimate_minutes: 16,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1708782340354-96cdbd9f70d6?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Lounaskeidas',
      rating: 4.4,
      pickup_estimate_minutes: 18,
      free_delivery: false,
      image_url: '/lihapullat.jpg',
    },
  ],
  Salaatit: [
    {
      name: 'Vihreä Kulho',
      rating: 4.5,
      pickup_estimate_minutes: 9,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1758721218560-aec50748d450?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Terveystalo Bistro',
      rating: 4.0,
      pickup_estimate_minutes: 13,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1572449043416-55f4685c9bb7?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Fresh Bowl',
      rating: 4.3,
      pickup_estimate_minutes: 11,
      free_delivery: false,
      image_url: '/salaatti.jpg',
    },
  ],
  Aasialainen: [
    {
      name: 'Wok & Roll',
      rating: 4.3,
      pickup_estimate_minutes: 17,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1464500542410-1396074bf230?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Bangkok Bistro',
      rating: 4.4,
      pickup_estimate_minutes: 20,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1633271332313-04df64c0105b?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Sushi Nami',
      rating: 4.6,
      pickup_estimate_minutes: 21,
      free_delivery: false,
      image_url: '/sushi.jpg',
    },
  ],
  Italialainen: [
    {
      name: 'Piccolo Trattoria',
      rating: 4.5,
      pickup_estimate_minutes: 19,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1615584240522-7fe7ed4dadee?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Pasta Fresca',
      rating: 4.2,
      pickup_estimate_minutes: 15,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1571175534150-72cd2b5a6039?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Trattoria Verde',
      rating: 4.1,
      pickup_estimate_minutes: 17,
      free_delivery: true,
      image_url: '/pasta.jpg',
    },
  ],
  Kahvila: [
    {
      name: 'Kahvipaahtimo Aurora',
      rating: 4.5,
      pickup_estimate_minutes: 8,
      free_delivery: false,
      image_url: '/kakku.jpg',
    },
    {
      name: 'Cafe Torilla',
      rating: 4.2,
      pickup_estimate_minutes: 10,
      free_delivery: true,
      image_url: '/juoma.jpg',
    },
  ],
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
// kategorian nimessä ("pasta" -> Italialainen).
const CATEGORY_SEARCH_KEYWORDS = {
  Burgerit: ['hampurilainen', 'ranskalaiset'],
  'Kebab & Pizza': ['pita', 'rulla', 'grilli'],
  Italialainen: ['pasta', 'pizza', 'lasagne', 'risotto'],
  Aasialainen: ['sushi', 'wok', 'nuudeli', 'ramen', 'thai'],
  Salaatit: ['bowl', 'kasvis', 'vegaani'],
  Kotiruoka: ['lounas', 'keitto', 'lihapullat'],
  Kahvila: ['kahvi', 'kakku', 'leivos', 'pulla'],
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
// Kuvat ovat 3D-kuvituksia omalla pastellitaustallaan, joten laatikko ei
// tarvitse omaa taustaväriä - kuva täyttää sen.
export const CATEGORY_TILE_META = {
  Burgerit: { img: '/category-burger.jpg' },
  'Kebab & Pizza': { img: '/category-pizza.jpg' },
  Salaatit: { img: '/category-salad.jpg' },
  Aasialainen: { img: '/category-sushi.jpg' },
  Kahvila: { img: '/category-dessert.jpg' },
  Italialainen: { img: '/category-pasta.jpg' },
  Kotiruoka: { img: '/category-chicken.jpg' },
  Kebab: { img: '/category-kebab.jpg' },
  Ramen: { img: '/category-ramen.jpg' },
  Kiinalainen: { img: '/category-chinese.jpg' },
  Intialainen: { img: '/category-indian.jpg' },
  Kreikkalainen: { img: '/category-greek.jpg' },
  Bowlit: { img: '/category-bowls.jpg' },
  Tacot: { img: '/category-tacos.jpg' },
  Vegaani: { img: '/category-vegan.jpg' },
  Aamiainen: { img: '/category-breakfast.jpg' },
}

// Kategorialaatikoiden järjestys rivillä.
export const CATEGORY_NAMES = Object.keys(CATEGORY_TILE_META)

export const DEFAULT_TILE_META = { emoji: '🍽️' }

// Bidropin oma ravintolahaku (käyttäjän pyyntö 7.11.2026): käy läpi jokaisen
// ravintolan ja pisteyttää osuman, jotta jo muutama kirjain ehdottaa oikeaa
// ravintolaa ("mac" -> McDonald's). Osumat järjestetään pisteiden mukaan.
//
// Pisteytys (suurin voittaa):
//   nimi alkaa hakusanalla                      100
//   jokin nimen sana alkaa hakusanalla           85
//   lempinimi / tunnettu kirjoitusasu alkaa      80  (ALIASES, template.keywords)
//   hakusana esiintyy nimen sisällä              60
//   kirjoitusvirhe (1-2 merkkiä) nimen sanassa   45  (vähintään 3 merkkiä)
//   kategoria tai ruokasana osuu                 30
// Saman pistemäärän sisällä parempi arvio ensin.

// Tunnetut kirjoitusasut ja lempinimet, joita nimestä ei voi päätellä.
const ALIASES = [
  { match: /mcdonald/, words: ['mac', 'macdonalds', 'mcdonalds', 'mcd', 'mäkki', 'mäkkäri', 'mäkkäri'] },
  { match: /hesburger/, words: ['hese', 'hesbu', 'hesburgeri'] },
  { match: /burger king/, words: ['bk', 'burgerking', 'kingi'] },
  { match: /subway/, words: ['sub', 'subi'] },
  { match: /kotipizza/, words: ['kotipitsa', 'kotipizzeria'] },
  { match: /pizzeria|pizza/, words: ['pitsa', 'pitsat', 'pizzat'] },
  { match: /sushi/, words: ['susi', 'sushit'] },
  { match: /kebab/, words: ['kebap', 'kepab', 'kebu'] },
  { match: /espresso house/, words: ['espressohouse', 'eh'] },
]

// Ruokasanat kategorioille (haku "pasta" löytää italialaiset jne.).
const CATEGORY_WORDS = {
  Burgerit: ['burger', 'hampurilainen', 'ranskalaiset', 'kana'],
  'Kebab & Pizza': ['kebab', 'pizza', 'pita', 'rulla', 'grilli', 'falafel'],
  Italialainen: ['pasta', 'pizza', 'lasagne', 'risotto', 'italia'],
  Aasialainen: ['sushi', 'wok', 'nuudeli', 'ramen', 'thai', 'korea', 'aasia', 'japani'],
  Kiinalainen: ['kiina', 'wok', 'nuudeli', 'dim sum'],
  Intialainen: ['intia', 'curry', 'nepal', 'naan', 'tikka'],
  Salaatit: ['salaatti', 'bowl', 'kasvis', 'vegaani', 'terveellinen'],
  Kotiruoka: ['lounas', 'keitto', 'lihapullat', 'kala', 'muikku', 'kotiruoka'],
  Tacot: ['taco', 'burrito', 'meksiko', 'tex mex', 'wrap'],
  Bowlit: ['bowl', 'kulho', 'poke'],
  Aamiainen: ['aamiainen', 'kahvi', 'kahvila', 'leivos', 'kakku', 'brunssi', 'croissant'],
  Kahvila: ['kahvi', 'kahvila', 'kakku', 'leivos', 'pulla'],
}

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/&/g, ' ')
    .replace(/[^a-zà-ÿ0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

// Kirjoitusvirheen salliminen: 1 virhe 3–4 merkin hauissa, 2 pidemmissä.
function fuzzyHit(term, word) {
  if (term.length < 3) return false
  const max = term.length >= 5 ? 2 : 1
  const prefix = word.slice(0, term.length)
  return levenshtein(term, prefix, max) <= max || levenshtein(term, word, max) <= max
}

function aliasesFor(name, extra) {
  const n = normalize(name)
  const words = [...(extra ?? [])]
  for (const alias of ALIASES) if (alias.match.test(n)) words.push(...alias.words)
  return words.map(normalize)
}

export function scoreRestaurant(restaurant, rawTerm) {
  const term = normalize(rawTerm)
  if (!term) return 0
  const name = normalize(restaurant.name)
  const compact = name.replace(/ /g, '')
  const words = name.split(' ')
  const termCompact = term.replace(/ /g, '')

  if (name.startsWith(term) || compact.startsWith(termCompact)) return 100
  if (words.some((w) => w.startsWith(term))) return 85
  if (aliasesFor(restaurant.name, restaurant.keywords).some((a) => a.startsWith(term) || (term.length >= 3 && term.startsWith(a)))) return 80
  if (term.length >= 2 && (name.includes(term) || compact.includes(termCompact))) return 60
  if (words.some((w) => fuzzyHit(term, w)) || fuzzyHit(termCompact, compact)) return 45
  if (term.length >= 3) {
    const catWords = [restaurant.category, ...(CATEGORY_WORDS[restaurant.category] ?? [])].map(normalize)
    if (catWords.some((c) => c.split(' ').some((w) => w.startsWith(term) || fuzzyHit(term, w)))) return 30
  }
  return 0
}

// Ravintolat pisteiden mukaan; sama nimi vain kerran (paras osuma).
export function searchRestaurants(restaurants, term, limit = Infinity) {
  const byName = new Map()
  for (const r of restaurants) {
    const score = scoreRestaurant(r, term)
    if (score <= 0) continue
    const key = normalize(r.name)
    const prev = byName.get(key)
    if (!prev || score > prev.score || (score === prev.score && !r.isPlaceholder && prev.r.isPlaceholder)) {
      byName.set(key, { r, score })
    }
  }
  return [...byName.values()]
    .sort((a, b) => b.score - a.score || (b.r.rating ?? 0) - (a.r.rating ?? 0))
    .slice(0, limit)
    .map((hit) => hit.r)
}

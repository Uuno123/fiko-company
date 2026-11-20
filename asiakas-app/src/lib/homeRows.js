import {
  CATEGORY_SLOGANS,
  DEALS_RESTAURANTS,
  FILLER_TEMPLATES_BY_CATEGORY,
  padWithFillers,
} from '../../../frontend/src/lib/categories'
import { SORT_COMPARATORS, rankRestaurants } from '../../../frontend/src/lib/rankingCore'
import { withDistance } from '../../../frontend/src/lib/distance'

// Etusivun rivit samalla säännöllä kuin verkkosivun puhelinnäkymässä
// (frontend/src/pages/Home.jsx): ensin "Aivan nurkan takana" (kun osoite on),
// sitten teemarivit, joissa vierekkäiset kortit ovat eri kategorioista.
// Kovimmat tarjoukset -paneeli kahden rivin jälkeen ja Ilmaiset kuljetukset
// kaksi riviä myöhemmin.

const HIDDEN_CATEGORIES = ['Kahvila']
const NEARBY_COUNT = 10
const THEME_ROW_COUNT = 15
const DEALS_ROWS_AFTER = 2
const FREE_DELIVERY_ROWS_AFTER = 2
const STARTS_SHOWN = 5

function nameHash(name) {
  let hash = 7
  for (const char of String(name ?? '')) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return hash
}
function byNameHash(a, b) {
  return nameHash(a.name) - nameHash(b.name)
}

// Sama teemalista kuin verkkosivulla (Home.jsx THEME_ROWS).
const THEME_ROWS = [
  { id: 'Suosikit', title: 'Kuopiolaisten suosikit', compare: SORT_COMPARATORS.rating, seeAll: 'Arvio 4,5+' },
  { id: 'Nopeat', title: 'Tulloo vauhilla', compare: SORT_COMPARATORS.eta, seeAll: 'Alle 30 min' },
  {
    id: 'Uutta',
    title: 'Uskalla kokkeilla',
    compare: byNameHash,
    seeAll: 'Lähelläsi',
    exclude: ["McDonald's Kuopio Tehtaankatu"],
    first: 'Hesburger Kuopio Puijonkatu',
  },
  {
    id: 'Maailma',
    title: 'Maailma maistuu Kuopiossa',
    compare: byNameHash,
    categories: ['Aasialainen', 'Kiinalainen', 'Intialainen', 'Tacot', 'Italialainen', 'Kreikkalainen'],
  },
  {
    id: 'Kevyet',
    title: 'Kevyttä mut hyvvee',
    compare: SORT_COMPARATORS.rating,
    categories: ['Salaatit', 'Bowlit', 'Aasialainen', 'Aamiainen', 'Vegaani'],
  },
  {
    id: 'Lounas',
    title: 'Lounastauon pelastajat',
    compare: SORT_COMPARATORS.eta,
    categories: ['Kotiruoka', 'Salaatit', 'Intialainen', 'Kiinalainen', 'Italialainen'],
  },
  {
    id: 'Ilta',
    title: 'Iltanälkään sohvalle',
    compare: SORT_COMPARATORS.rating,
    categories: ['Burgerit', 'Kebab & Pizza', 'Tacot', 'Kiinalainen', 'Aasialainen'],
  },
]

function mixCategories(items) {
  const rest = [...items]
  const mixed = []
  while (rest.length > 0) {
    const last = mixed[mixed.length - 1]
    const index = last ? rest.findIndex((r) => r.category !== last.category) : 0
    mixed.push(rest.splice(index < 0 ? 0 : index, 1)[0])
  }
  return mixed
}

function avoidRepeatedStarts(groups) {
  let previousStarts = new Set()
  return groups.map((group) => {
    const fresh = group.items.filter((r) => !previousStarts.has(r.name))
    const repeated = group.items.filter((r) => previousStarts.has(r.name))
    const items = [...fresh, ...repeated]
    previousStarts = new Set(items.slice(0, STARTS_SHOWN).map((r) => r.name))
    return { ...group, items }
  })
}

const withoutSponsor = ({ sponsored: _sponsored, ...r }) => r
const uniqueByName = (r, index, all) => all.findIndex((other) => other.name === r.name) === index

// address: { lat, lng } tai null. Palauttaa osiot järjestyksessä:
// { type: 'row' | 'deals' | 'free', key, title, items }.
export function buildHomeSections(restaurants, address) {
  const categories = Array.from(
    new Set([...restaurants.map((r) => r.category), ...Object.keys(FILLER_TEMPLATES_BY_CATEGORY)]),
  ).filter((category) => category && !HIDDEN_CATEGORIES.includes(category))

  const categoryGroups = categories
    .map((category) => ({
      category,
      items: rankRestaurants(
        withDistance(
          padWithFillers(
            category,
            restaurants.filter((r) => r.category === category),
          ),
          address,
        ),
        { address },
      ),
    }))
    .filter((group) => group.items.length > 0)

  const allRows = categoryGroups.flatMap((group) => group.items.map(withoutSponsor)).filter(uniqueByName)

  const nearby = address
    ? {
        key: 'nearby',
        title: 'Aivan nurkan takana',
        seeAll: 'Lähelläsi',
        items: rankRestaurants(allRows, { address, compare: SORT_COMPARATORS.distance }).slice(0, NEARBY_COUNT),
      }
    : null

  const themes = THEME_ROWS.map((row) => ({
    key: row.id,
    title: row.title,
    seeAll: row.seeAll ?? 'Kaikki ravintolat',
    first: row.first,
    items: rankRestaurants(
      allRows.filter(
        (r) => (!row.categories || row.categories.includes(r.category)) && !row.exclude?.includes(r.name),
      ),
      { address, compare: row.compare },
    )
      .sort((x, y) => (y.name === row.first) - (x.name === row.first))
      .slice(0, THEME_ROW_COUNT),
  })).filter((group) => group.items.length > 0)

  const rows = avoidRepeatedStarts([...(nearby ? [nearby] : []), ...themes]).map((group) => {
    const items = mixCategories(group.items)
    const firstIndex = group.first ? items.findIndex((r) => r.name === group.first) : -1
    if (firstIndex > 0) items.unshift(...items.splice(firstIndex, 1))
    return { type: 'row', key: group.key, title: group.title, seeAll: group.seeAll, items }
  })

  const flat = categoryGroups.flatMap((group) => group.items)
  const deals = DEALS_RESTAURANTS.map((name) => flat.find((r) => r.name === name))
    .filter(Boolean)
    .map(withoutSponsor)
  const free = flat.filter((r) => r.free_delivery).filter(uniqueByName).slice(0, 10).map(withoutSponsor)

  const dealsAfter = deals.length > 0 ? Math.min(DEALS_ROWS_AFTER, rows.length - 1) : -1
  const freeAfter =
    free.length > 0 ? Math.min((dealsAfter < 0 ? 0 : dealsAfter) + FREE_DELIVERY_ROWS_AFTER, rows.length - 1) : -1

  const sections = []
  rows.forEach((row, index) => {
    sections.push(row)
    if (index === dealsAfter) sections.push({ type: 'deals', key: 'deals', title: 'Kovimmat tarjoukset', items: deals })
    if (index === freeAfter) sections.push({ type: 'free', key: 'free', title: 'Ilmaiset kuljetukset', items: free })
  })
  return sections
}

// Kategorian mainoslause (haku- ja kategorianäkymiin myöhemmin).
export function categorySlogan(category) {
  return CATEGORY_SLOGANS[category] ?? category
}

// TILAPÄINEN, esittelyä varten: tilattavissa oleva "feikki" McDonald's. Sitä ei ole
// tietokannassa - getRestaurantById (lib/api.js) palauttaa sen täältä, joten
// ravintolasivu, kori ja kassa toimivat sille kuten oikealle ravintolalle. Kassa
// tekee tilauksista aina simuloidun DEMO-tilauksen (Cart.jsx simulateQuickPay),
// ei oikeaa maksua eikä tilausriviä. Etusivun ja kategoriasivun McDonald's-
// täytekortti osoittaa tänne (lib/categories.js, demoId).
//
// Ravintolan omia tietokantatoimintoja (suosikit yms.) ei voi tehdä demolle,
// koska sen id ei ole uuid - ne ohitetaan isDemo-kentän perusteella.

// Sama sisältö kuin supabase/migrations/0038_add_burger_talli_mcdonalds_items.sql.
export const MCDONALDS_DEMO_MENU = [
  {
    id: 'temp-maple-bbq-bacon-double-qp',
    name: 'Maple BBQ & Bacon Double Quarter Pounder®',
    description:
      'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.',
    price_cents: 1265,
    category: 'Burgerit',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca81f3ee-affb-11f1-984a-fe269514dbf4_fi3180.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-maple-bbq-bacon-double-qp-ateria',
    name: 'Maple BBQ & Bacon Double Quarter Pounder® -ateria',
    description:
      'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.',
    price_cents: 1900,
    category: 'Ateriat',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca830c16-affb-11f1-984a-fe269514dbf4_fi3181.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-maple-bbq-bacon-qp',
    name: 'Maple BBQ & Bacon Quarter Pounder®',
    description:
      'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia.',
    price_cents: 995,
    category: 'Burgerit',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca842538-affb-11f1-984a-fe269514dbf4_fi3177.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-maple-bbq-bacon-qp-ateria',
    name: 'Maple BBQ & Bacon Quarter Pounder® -ateria',
    description:
      'Seesaminsiemensämpylä, iso 100 % naudanlihapihvi, kaksi cheddarsulatejuustosiivua, pekonia, Maple BBQ -kastiketta ja sipulia. Ateriaan kuuluu ranskalaiset ja juoma.',
    price_cents: 1495,
    category: 'Ateriat',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca855516-affb-11f1-984a-fe269514dbf4_fi3178.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-big-arch',
    name: 'Big Arch®',
    description:
      'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta.',
    price_cents: 1380,
    category: 'Burgerit',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca871676-affb-11f1-984a-fe269514dbf4_fi3183.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-big-arch-ateria',
    name: 'Big Arch® -ateria',
    description:
      'Big Arch -sämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, salaattia, sipulia ja Big Arch -kastiketta. Ateriaan kuuluu ranskalaiset ja juoma.',
    price_cents: 1915,
    category: 'Ateriat',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/ca8931a4-affb-11f1-984a-fe269514dbf4_fi3184.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-double-big-tasty-bacon',
    name: 'Double Big Tasty® Bacon',
    description:
      'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia.',
    price_cents: 1380,
    category: 'Burgerit',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c33cf9c-63c2-11f1-8c5c-724a2a819d31_fi6069.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-double-big-tasty-bacon-ateria',
    name: 'Double Big Tasty® Bacon -ateria',
    description:
      'Seesaminsiemensämpylä, kaksi 100 % naudanlihapihviä, vaaleaa cheddarsulatejuustoa, tomaattia, salaattia ja pekonia. Ateriaan kuuluu ranskalaiset ja juoma.',
    price_cents: 1915,
    category: 'Ateriat',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c4aadb6-63c2-11f1-aa97-724a2a819d31_fi2800.png?w=960',
    is_available: true,
    tags: [],
  },
  {
    id: 'temp-double-qp-with-cheese',
    name: 'Double Quarter Pounder® with Cheese',
    description:
      'Seesaminsiemensämpylä, kaksi isoa 100 % naudanlihapihviä, cheddarsulatejuustoa, tuoretta sipulia, suolakurkkua ja ketsuppia.',
    price_cents: 1120,
    category: 'Burgerit',
    image_url:
      'https://imageproxy.wolt.com/menu/menu-images/5adee2ab5a5917000f1f1140/4c5436d8-63c2-11f1-aa97-724a2a819d31_fi8011.png?w=960',
    is_available: true,
    tags: [],
  },
]

const DEMO_RESTAURANTS = {
  'demo-mcdonalds': {
    id: 'demo-mcdonalds',
    name: "McDonald's",
    category: 'Burgerit',
    image_url: 'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127',
    description: 'Esittelyravintola - tilaukset ovat simuloituja.',
    // Kuvitteellinen osoite Kuopion keskustassa, jotta etäisyys, reittikartta
    // ja tilauksen seuranta toimivat.
    address: 'Kauppakatu 40, 70110 Kuopio',
    city: 'Kuopio',
    lat: 62.8922,
    lng: 27.6795,
    is_open: true,
    rating: 4.1,
    pickup_estimate_minutes: 15,
    free_delivery: false,
    menu_items: MCDONALDS_DEMO_MENU,
    isDemo: true,
  },
}

export function getDemoRestaurant(id) {
  return DEMO_RESTAURANTS[id] ?? null
}

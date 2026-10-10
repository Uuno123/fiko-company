// TILAPÄINEN: esimerkkiarvostelut vain esittelyravintolalle (lib/demoRestaurants.js).
// Tietokannassa ei ole vielä arvostelutaulua. Oikeat arvostelut tarvitsevat
// taulun (esim. reviews: order_id, restaurant_id, customer_id, rating, comment)
// ja arviointipyynnön tilauksen jälkeen - siihen asti oikeille ravintoloille
// ei näytetä arvosteluosiota lainkaan, ettei niille keksitä arvosteluja.
const DEMO_REVIEWS = {
  'demo-mcdonalds': [
    { id: 'r1', name: 'Aino K.', rating: 5, daysAgo: 1, text: 'Ruoka tuli lämpimänä ja nopeasti. Maple BBQ -burgeri oli tosi hyvä!' },
    { id: 'r2', name: 'Mikko L.', rating: 4, daysAgo: 3, text: 'Ranskalaiset olisivat saaneet olla rapeampia, muuten erinomainen tilaus.' },
    { id: 'r3', name: 'Sanna P.', rating: 5, daysAgo: 6, text: 'Big Arch on uusi suosikkini. Kuljettaja oli ystävällinen ja tilaus tuli ajallaan.' },
    { id: 'r4', name: 'Juho V.', rating: 3, daysAgo: 9, text: 'Tilaus oli kymmenen minuuttia myöhässä, mutta ruoka oli kunnossa.' },
    { id: 'r5', name: 'Emilia R.', rating: 5, daysAgo: 14, text: 'Helppo tilata ja kaikki oli mukana. Tilaan uudestaan.' },
    { id: 'r6', name: 'Ville T.', rating: 4, daysAgo: 21, text: 'Hyvä ateria hintaansa nähden. Juoma olisi voinut olla kylmempi.' },
  ],
}

export function getDemoReviews(restaurantId) {
  return DEMO_REVIEWS[restaurantId] ?? []
}

export function formatReviewAge(daysAgo) {
  if (daysAgo <= 0) return 'Tänään'
  if (daysAgo === 1) return 'Eilen'
  if (daysAgo < 7) return `${daysAgo} pv sitten`
  const weeks = Math.floor(daysAgo / 7)
  return weeks === 1 ? 'Viikko sitten' : `${weeks} vk sitten`
}

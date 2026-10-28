// VAIN TESTIKÄYTTÖÖN (käyttäjän pyyntö 27.10.2026): alkunäytön kollaasissa samat
// ravintolakuvat kuin verkkosivun demoravintoloilla (McDonald's, Hesburger ym.,
// frontend/src/lib/categories.js). Kuvat ja logot ovat ravintoloiden omia, joten
// ne ladataan verkosta eikä niitä tallenneta sovellukseen.
//
// Ennen kauppajulkaisua lista tyhjäksi: silloin kollaasi käyttää sovelluksen
// omia Unsplash-kuvia (assets/images).
const wolt = (id) => `https://imageproxy.wolt.com/assets/${id}?w=600`

// Kaksi saraketta vaakakuvia (16:9). McDonald's ja Hesburger toisina, jolloin
// ne näkyvät heti alkunäytön keskellä.
export const TEST_COLLAGE_PHOTOS = [
  [
    wolt('6810cc1ab4526c355f4c532e'), // Marina Pizzeria
    wolt('6735be5986f45b72713e2127'), // McDonald's
    wolt('697ca18d8d71993ce3310d3c'), // Hook Kuopio
    wolt('673214b4d626ac704e40c07d'), // Kruunu Kebab
    wolt('6900e59a1c0a709b4414269a'), // Kuopion Pizzatori
  ],
  [
    wolt('68a57621e6b217110a27d3ea'), // Kuopion Volkan Ravintola
    wolt('67ea79d0e3aca1debaea9cdd'), // Hesburger
    wolt('673206fbae168d77add71220'), // Burger King
    wolt('6735db0c9a62d71e30a74cfa'), // Marmara Pizzeria
  ],
]

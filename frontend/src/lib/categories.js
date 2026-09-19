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
  Burgerit: [
    {
      name: 'Liekki Burgers',
      rating: 4.3,
      pickup_estimate_minutes: 12,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1572448992068-26624d5cf341?auto=format&fit=crop&w=1600&q=80',
    },
    {
      name: 'Pihvi & Co',
      rating: 4.1,
      pickup_estimate_minutes: 18,
      free_delivery: true,
      image_url: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1600&q=80',
    },
  ],
  'Kebab & Pizza': [
    {
      name: 'Ateenan Kebab',
      rating: 4.4,
      pickup_estimate_minutes: 14,
      free_delivery: false,
      image_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1600&q=80',
    },
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
  ],
}
export function buildFillerRestaurant(category, index, template) {
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

// Täydentää listan vähintään kolmeen korttiin, jos kategorialle on täytteitä.
export function padWithFillers(category, items, minCount = 3) {
  const fillers = FILLER_TEMPLATES_BY_CATEGORY[category] ?? []
  const padded = [...items]
  for (let i = 0; padded.length < minCount && i < fillers.length; i++) {
    padded.push(buildFillerRestaurant(category, i, fillers[i]))
  }
  return padded
}

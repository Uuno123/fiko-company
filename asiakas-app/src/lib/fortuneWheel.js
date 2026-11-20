import AsyncStorage from '@react-native-async-storage/async-storage'

// Päivän onnenpyörä (käyttäjän pyyntö 16.11.2026). Pyörässä kahdeksan yhtä
// isoa lohkoa, mutta tulos arvotaan painotetusti: voitto on hyvin
// epätodennäköinen. Todennäköisyydet näytetään asiakkaalle säännöissä
// (kuluttajansuoja: markkinointi ei saa johtaa harhaan).
//
// TILAPÄINEN: kerran päivässä -raja ja tulos tallennetaan vain puhelimeen.
// Ennen kuin voitot ovat oikeasti lunastettavia, arvonta ja voiton tallennus
// pitää siirtää palvelimelle (muuten sovelluksen voi asentaa uudelleen ja
// pyöräyttää uudestaan), ja kassan pitää hyväksyä voittokoodi.

// Lohkot pyörän järjestyksessä myötäpäivään ylhäältä alkaen.
export const WHEEL_SEGMENTS = [
  { key: 'free_delivery', lines: ['Ilmainen', 'kuljetus'], prize: 'Ilmainen kuljetus' },
  { key: 'none_1', lines: ['Ei', 'voittoa'], prize: null },
  { key: 'percent_15', lines: ['−15 %'], prize: '−15 % seuraavasta tilauksesta' },
  { key: 'none_2', lines: ['Ei', 'voittoa'], prize: null },
  { key: 'free_food', lines: ['Ilmainen', 'ruoka'], prize: 'Ilmainen ruoka (max 15 €)' },
  { key: 'none_3', lines: ['Ei', 'voittoa'], prize: null },
  { key: 'euro_2', lines: ['−2 €'], prize: '−2 € seuraavasta tilauksesta' },
  { key: 'none_4', lines: ['Ei', 'voittoa'], prize: null },
]

// Todennäköisyydet (yhteensä 1). Ei-voitot jaetaan tasan "tyhjiin" lohkoihin.
export const WHEEL_ODDS = [
  { key: 'free_food', label: 'Ilmainen ruoka', p: 0.001 },
  { key: 'free_delivery', label: 'Ilmainen kuljetus', p: 0.009 },
  { key: 'percent_15', label: '−15 %', p: 0.02 },
  { key: 'euro_2', label: '−2 €', p: 0.04 },
  { key: 'none', label: 'Ei voittoa', p: 0.93 },
]

export function drawSegmentIndex(random = Math.random) {
  let roll = random()
  for (const { key, p } of WHEEL_ODDS) {
    if (roll < p) {
      if (key !== 'none') return WHEEL_SEGMENTS.findIndex((s) => s.key === key)
      const empties = WHEEL_SEGMENTS.map((s, i) => (s.prize ? -1 : i)).filter((i) => i >= 0)
      return empties[Math.floor(random() * empties.length)]
    }
    roll -= p
  }
  return WHEEL_SEGMENTS.findIndex((s) => !s.prize)
}

// Paikallinen päivä muodossa 2026-11-16: uusi pyöräytys keskiyöllä.
export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const storageKey = (userId) => `bidrop-wheel-${userId}`

export async function loadTodaysSpin(userId) {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId))
    const saved = raw ? JSON.parse(raw) : null
    return saved?.day === todayKey() ? saved : null
  } catch {
    return null
  }
}

export async function saveTodaysSpin(userId, segmentKey) {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify({ day: todayKey(), segmentKey }))
  } catch {
    // Tallennus estetty - pyöräytys näkyy silti tämän käynnin ajan.
  }
}

// Toimitus vai nouto: etusivun "Toimitus ⌄" -valinta (käyttäjän pyyntö 3.11.2026).
// Valinta muistetaan selaimessa ja kassa (Cart.jsx) aloittaa sillä tavalla.
const STORAGE_KEY = 'delivo-order-mode'

// note: lyhyt selitys valintapaneelissa (käyttäjän pyyntö 3.11.2026: persoonaa).
export const ORDER_MODES = [
  { value: 'delivery', label: 'Toimitus', note: 'Kuljettaja tuo ovelle, sinä päätät hinnan' },
  { value: 'pickup', label: 'Nouto', note: 'Haet itse ravintolasta, ei kuljetusmaksua' },
]

export function getOrderMode() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'pickup' ? 'pickup' : 'delivery'
  } catch {
    return 'delivery'
  }
}

export function saveOrderMode(mode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode === 'pickup' ? 'pickup' : 'delivery')
  } catch {
    // Selaimen tallennus estetty: valinta pätee vain tämän käynnin ajan.
  }
}

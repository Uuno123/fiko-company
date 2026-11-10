// Viimeisimmät haut selaimessa (haun aloitusnäkymä, SearchStart.jsx).
const RECENT_KEY = 'bidrop-recent-searches'
const RECENT_MAX = 5

export function loadRecentSearches() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY))
    return Array.isArray(list) ? list.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function rememberSearch(term) {
  const clean = term.trim()
  if (!clean) return
  try {
    const next = [clean, ...loadRecentSearches().filter((item) => item.toLowerCase() !== clean.toLowerCase())]
    localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, RECENT_MAX)))
  } catch {
    // Ei tallennustilaa - viimeisimmät haut eivät vain jää muistiin.
  }
}

export function saveRecentSearches(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // Ei tallennustilaa.
  }
}

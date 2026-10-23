import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import { addFavorite, getFavoriteRestaurantIds, removeFavorite } from './favorites.js'

const NO_FAVORITES = new Set()

// Suosikkiravintolat korttilistoille (etusivu, kategoriasivu): id:t haetaan
// kerralla yhdellä kyselyllä, jotta jokainen kortti ei tee omaansa. Sydän
// vaihtuu heti ja palautuu, jos tallennus epäonnistuu. Kirjautumaton ohjataan
// kirjautumaan ja sen jälkeen takaisin samalle sivulle.
export function useFavorites() {
  const { customer } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const customerId = customer?.id ?? null
  // Suosikit muistetaan omistajan kanssa: toisen käyttäjän (tai uloskirjautuneen)
  // suosikit eivät näy, vaikka uusi haku olisi vielä kesken.
  const [saved, setSaved] = useState({ ownerId: null, ids: NO_FAVORITES })
  const favoriteIds = customerId && saved.ownerId === customerId ? saved.ids : NO_FAVORITES

  useEffect(() => {
    if (!customerId) return undefined
    let cancelled = false
    getFavoriteRestaurantIds(customerId).then((ids) => {
      if (!cancelled) setSaved({ ownerId: customerId, ids: new Set(ids) })
    })
    return () => {
      cancelled = true
    }
  }, [customerId])

  function setFavorite(restaurantId, on) {
    setSaved((prev) => {
      const ids = new Set(prev.ownerId === customerId ? prev.ids : NO_FAVORITES)
      if (on) ids.add(restaurantId)
      else ids.delete(restaurantId)
      return { ownerId: customerId, ids }
    })
  }

  async function toggleFavorite(restaurantId) {
    if (!customerId) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    const wasFavorite = favoriteIds.has(restaurantId)
    setFavorite(restaurantId, !wasFavorite)
    const ok = wasFavorite
      ? await removeFavorite(customerId, restaurantId)
      : await addFavorite(customerId, restaurantId)
    if (!ok) setFavorite(restaurantId, wasFavorite)
  }

  return { favoriteIds, toggleFavorite }
}

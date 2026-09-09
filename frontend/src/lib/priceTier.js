// Hintataso lasketaan oikeista ruokalistan hinnoista (ei keksitty).
export function computePriceTier(menuItems) {
  if (!menuItems || menuItems.length === 0) return null
  const avgCents = menuItems.reduce((sum, item) => sum + item.price_cents, 0) / menuItems.length
  if (avgCents < 800) return '€'
  if (avgCents < 1200) return '€€'
  return '€€€'
}

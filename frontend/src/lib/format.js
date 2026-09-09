export function formatPrice(cents) {
  return (cents / 100).toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

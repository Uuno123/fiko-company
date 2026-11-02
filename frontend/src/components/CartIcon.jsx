// Ostoskorin ikoni: selkeä ostoskärry (käyttäjän pyyntö 2.11.2026, korvasi oman
// kori-ikonin). Viivat Lucide-kirjaston shopping-cart-ikonista (ISC-lisenssi),
// pyörät täytettyinä, jotta ikoni erottuu pienenäkin. Väri tulee currentColorista.
export default function CartIcon({ size = 20, strokeWidth = 2, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" />
      <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" />
      <circle cx="18" cy="20.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8" cy="20.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

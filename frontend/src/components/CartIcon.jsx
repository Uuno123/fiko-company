// Bidropin oma ostoskori-ikoni (käyttäjän pyyntö 30.10.2026: "oikeasti
// ammattimainen"): kahvallinen kori, piirretty 24 px ruudukkoon tasaisella
// viivalla ja pyöristetyillä kulmilla. Väri tulee currentColorista.
export default function CartIcon({ size = 20, strokeWidth = 1.9, className }) {
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
      {/* Kahva */}
      <path d="M8 9.5 10.6 4.2M16 9.5 13.4 4.2" />
      {/* Reuna */}
      <path d="M3.2 9.5h17.6" />
      {/* Kori */}
      <path d="M4.6 9.5 6 18.2a2 2 0 0 0 2 1.7h8a2 2 0 0 0 2-1.7l1.4-8.7" />
      {/* Punos */}
      <path d="M9.6 13v3.6M14.4 13v3.6" />
    </svg>
  )
}

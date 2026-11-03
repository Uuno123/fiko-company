// Ostoskorin ikoni: oma piirretty ostoskärry (3.11.2026, korvasi Lucide-pohjaisen),
// pyörät täytettyinä, jotta ikoni erottuu pienenäkin. Väri tulee currentColorista.
export default function CartIcon({ size = 20, strokeWidth = 2.2, className }) {
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
      {/* Selkeämpi oma kärry (käyttäjän pyyntö 3.11.2026): kahva, kori ja kaksi täytettyä pyörää. */}
      <path d="M2.5 3.5h2.3l2.4 11h10.3a1.5 1.5 0 0 0 1.46-1.15L20.6 6.5H5.35" />
      <circle cx="8.6" cy="19.4" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="16.8" cy="19.4" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

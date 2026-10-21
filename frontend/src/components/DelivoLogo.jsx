import {
  LOGO_CHECK_PATH,
  LOGO_CHECK_STROKE,
  LOGO_HEIGHT,
  LOGO_LETTERS_PATH,
  LOGO_ORANGE,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
} from '../lib/logoPaths.js'

// delivo-sanamerkki: "deli" + oranssi ruksi v:n paikalla + "o".
// Kirjaimet ovat currentColor-väriä, joten ympäröivä CSS päättää onko teksti
// musta (vaalea pohja) vai valkoinen (tumma tai kuvan päällä). Ruksi on aina
// oranssi, paitsi mono-versiossa (oranssilla pohjalla kaikki valkoista).
// Koko CSS:llä: korkeus määrätään, leveys tulee kuvasuhteesta.
export default function DelivoLogo({ className = '', mono = false, label = 'delivo' }) {
  return (
    <svg
      className={`delivo-logo${className ? ` ${className}` : ''}`}
      viewBox={LOGO_VIEWBOX}
      style={{ aspectRatio: `${LOGO_WIDTH} / ${LOGO_HEIGHT}` }}
      role="img"
      aria-label={label}
      focusable="false"
    >
      <path d={LOGO_LETTERS_PATH} fill="currentColor" />
      <path
        d={LOGO_CHECK_PATH}
        fill="none"
        stroke={mono ? 'currentColor' : LOGO_ORANGE}
        strokeWidth={LOGO_CHECK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

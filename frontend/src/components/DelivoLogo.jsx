import {
  LOGO_ACCENT_PATH,
  LOGO_HEIGHT,
  LOGO_LETTERS_PATH,
  LOGO_ORANGE,
  LOGO_VIEWBOX,
  LOGO_WIDTH,
} from '../lib/logoPaths.js'

// Bidrop-sanamerkki: "bidrop" + oranssi i:n piste.
// Kirjaimet ovat currentColor-väriä, joten ympäröivä CSS päättää onko teksti
// musta (vaalea pohja) vai valkoinen (tumma tai kuvan päällä). Piste on aina
// oranssi, paitsi mono-versiossa (oranssilla pohjalla kaikki valkoista).
// Koko CSS:llä: korkeus määrätään, leveys tulee kuvasuhteesta. p:n alaosa
// piirtyy korkeuden alapuolelle (.delivo-logo { overflow: visible }).
export default function DelivoLogo({ className = '', mono = false, label = 'Bidrop' }) {
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
      <path d={LOGO_ACCENT_PATH} fill={mono ? 'currentColor' : LOGO_ORANGE} />
    </svg>
  )
}

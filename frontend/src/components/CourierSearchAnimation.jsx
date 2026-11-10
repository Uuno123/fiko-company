import './CourierSearchAnimation.css'

// Kuljettajan etsinnän kuvitus (käyttäjän pyyntö 10.11.2026: Woltin tasoinen
// kuvitus). Litteä vektoripiirros ilman ääriviivoja: pastellinen kaupunki,
// pilvet, tie, kuljettaja skootterilla oranssissa takissa Bidrop-laatikon
// kanssa ja määränpään nasta, jonka ympärillä sykkii rengas. Animaatiot:
// skootteri keinahtelee, pyörät pyörivät, tie ja vauhtiviivat liikkuvat ja
// pilvet ajelehtivat. Pelkkää SVG:tä ja CSS:ää.
export default function CourierSearchAnimation() {
  return (
    <div className="courier-scene" aria-hidden="true">
      <svg className="courier-scene__svg" viewBox="0 0 320 170" preserveAspectRatio="xMidYMid slice">
        {/* Taivas */}
        <rect width="320" height="170" fill="#FFF3EB" />
        <circle cx="262" cy="40" r="20" fill="#FFD9C2" />

        {/* Pilvet */}
        <g className="courier-scene__cloud courier-scene__cloud--a">
          <rect x="34" y="26" width="52" height="16" rx="8" fill="#fff" />
          <circle cx="54" cy="26" r="11" fill="#fff" />
          <circle cx="68" cy="28" r="8" fill="#fff" />
        </g>
        <g className="courier-scene__cloud courier-scene__cloud--b">
          <rect x="180" y="48" width="40" height="12" rx="6" fill="#fff" />
          <circle cx="196" cy="48" r="8" fill="#fff" />
        </g>

        {/* Kaupunki */}
        <g>
          <rect x="8" y="70" width="44" height="72" rx="6" fill="#FFE2D3" />
          <rect x="46" y="92" width="34" height="50" rx="6" fill="#FFD3BC" />
          <rect x="222" y="62" width="40" height="80" rx="6" fill="#FFD3BC" />
          <rect x="258" y="86" width="54" height="56" rx="6" fill="#FFE2D3" />
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => (
              <rect
                key={`a${row}${col}`}
                x={18 + col * 14}
                y={80 + row * 16}
                width="8"
                height="9"
                rx="2"
                fill="#fff"
                opacity="0.85"
              />
            )),
          )}
          {[0, 1, 2, 3].map((row) => (
            <rect key={`b${row}`} x="234" y={72 + row * 15} width="16" height="8" rx="2" fill="#fff" opacity="0.85" />
          ))}
          {[0, 1].map((row) =>
            [0, 1, 2].map((col) => (
              <rect
                key={`c${row}${col}`}
                x={268 + col * 14}
                y={96 + row * 16}
                width="8"
                height="9"
                rx="2"
                fill="#fff"
                opacity="0.85"
              />
            )),
          )}
        </g>

        {/* Maa ja tie */}
        <rect x="0" y="140" width="320" height="30" fill="#F6E7DD" />
        <line className="courier-scene__lane" x1="0" y1="156" x2="320" y2="156" />

        {/* Määränpää: nasta ja sykkivä rengas */}
        <g transform="translate(278 108)">
          <ellipse className="courier-scene__pulse" cx="0" cy="34" rx="14" ry="4" fill="#F4501E" />
          <ellipse cx="0" cy="34" rx="8" ry="2.5" fill="#E2C9BA" />
          <path d="M0 32c-9-10-14-17-14-24a14 14 0 0 1 28 0c0 7-5 14-14 24z" fill="#F4501E" />
          <circle cx="0" cy="8" r="5.5" fill="#fff" />
        </g>

        {/* Vauhtiviivat */}
        <g className="courier-scene__speed">
          <rect x="52" y="104" width="28" height="4" rx="2" fill="#F4C3A8" />
          <rect x="40" y="116" width="36" height="4" rx="2" fill="#F4C3A8" />
          <rect x="58" y="128" width="20" height="4" rx="2" fill="#F4C3A8" />
        </g>

        {/* Varjo */}
        <ellipse cx="142" cy="150" rx="52" ry="5" fill="#E9D3C5" />

        {/* Kuljettaja skootterilla */}
        <g className="courier-scene__rider">
          {/* Takapyörä */}
          <g className="courier-scene__wheel" style={{ transformOrigin: '104px 138px' }}>
            <circle cx="104" cy="138" r="12" fill="#14150F" />
            <circle cx="104" cy="138" r="5" fill="#C9C9C4" />
            <rect x="103" y="128" width="2" height="20" rx="1" fill="#3A3B35" />
          </g>
          {/* Etupyörä */}
          <g className="courier-scene__wheel" style={{ transformOrigin: '180px 138px' }}>
            <circle cx="180" cy="138" r="12" fill="#14150F" />
            <circle cx="180" cy="138" r="5" fill="#C9C9C4" />
            <rect x="179" y="128" width="2" height="20" rx="1" fill="#3A3B35" />
          </g>

          {/* Skootterin runko */}
          <path d="M92 126c0-8 6-12 14-12h40l10 12h16l8-6 4 4-6 10H98c-4 0-6-3-6-8z" fill="#2B2C26" />
          <path d="M100 114h34l-4 8h-30z" fill="#3D3E37" />
          <rect x="168" y="84" width="6" height="40" rx="3" transform="rotate(14 171 104)" fill="#2B2C26" />
          <rect x="160" y="80" width="18" height="5" rx="2.5" fill="#14150F" />
          <circle cx="178" cy="98" r="3" fill="#FFE08A" />

          {/* Bidrop-laatikko */}
          <g>
            <rect x="80" y="70" width="38" height="36" rx="6" fill="#F4501E" />
            <rect x="80" y="70" width="38" height="9" rx="4" fill="#D9400F" />
            <circle cx="99" cy="92" r="5" fill="#fff" />
            <circle cx="102" cy="89" r="2" fill="#F4501E" />
          </g>

          {/* Jalat */}
          <path d="M122 108h18l8 14" stroke="#24252F" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="144" y="118" width="14" height="6" rx="3" fill="#14150F" />

          {/* Vartalo: oranssi takki */}
          <path d="M116 110c-2-14 2-30 14-34 8-3 16 2 16 10l-2 22c-1 4-4 6-8 6h-14c-4 0-6-2-6-4z" fill="#F4501E" />
          <path d="M126 80c4 2 6 6 6 10" stroke="#D9400F" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Käsi ohjaustangolle */}
          <path d="M138 86l18 2 8-4" stroke="#F4501E" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="164" cy="84" r="3.5" fill="#F2C2A0" />

          {/* Pää ja kypärä */}
          <circle cx="140" cy="62" r="11" fill="#F2C2A0" />
          <path d="M128 60a12 12 0 0 1 24 0v2h-24z" fill="#14150F" />
          <path d="M140 49a12 12 0 0 1 12 11h-6a6 6 0 0 0-6-6z" fill="#F4501E" />
          <rect x="144" y="60" width="10" height="5" rx="2.5" fill="#3B5B73" opacity="0.85" />
        </g>
      </svg>
    </div>
  )
}

import { View } from 'react-native'
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg'
import { LOGO_ACCENT_PATH, LOGO_LETTERS_PATH } from '../../../frontend/src/lib/logoPaths'
import { colors } from '../theme'

// Kirjautumisnäkymän kuvitus: Bidrop-kuljettaja polkupyörällä, selässä
// Bidrop-reppu, taustalla kaupungin siluetti ja Puijon torni yötaivaalla
// (musta yläosa, sama ilme kuin sovelluksen kuvakkeessa). Kuljettajalla on
// oranssi takki ja pyörässä vaaleat osat, jotta ne erottuvat mustasta.
// Kuvan valkoinen maa jatkuu sen alla olevaan valkoiseen paneeliin, joten kuva
// sijoitetaan mustan yläosan alareunaan koko leveydelle.
const INK = colors.black
const ORANGE = colors.orange
// Sama kuin kirjautumisnäkymän yläosa (login.jsx), kuunsirpin varjoon.
const SKY = '#000000'
const SKYLINE = '#1f2024'
const WINDOW = '#ffb547'
const JACKET = ORANGE
const SLEEVE = '#d9430f'
const METAL = '#a7abb3'
const TIRE = '#4a4c53'
const SKIN = '#f3c6a0'
const SKIN_SHADE = '#e2a985'
const LIP = '#c98a66'
const JACKET_FAR = '#a8360c'
const COLLAR = '#c23d12'
const PANTS = '#565c6b'
const PANTS_FAR = '#444956'
const SHOE_FAR = '#3b3d44'
const RIM = '#d6d8dc'
const BAG_SHADE = '#eceef1'

function Wheel({ cx }) {
  const cy = 182
  return (
    <>
      <Circle cx={cx} cy={cy} r={27} fill="none" stroke={TIRE} strokeWidth={7} />
      <Circle cx={cx} cy={cy} r={21} fill="none" stroke={RIM} strokeWidth={2} />
      <G stroke="#ffffff" strokeWidth={1.2} opacity={0.8}>
        <Line x1={cx - 21} y1={cy} x2={cx + 21} y2={cy} />
        <Line x1={cx} y1={cy - 21} x2={cx} y2={cy + 21} />
        <Line x1={cx - 15} y1={cy - 15} x2={cx + 15} y2={cy + 15} />
        <Line x1={cx - 15} y1={cy + 15} x2={cx + 15} y2={cy - 15} />
      </G>
      <Circle cx={cx} cy={cy} r={3.5} fill={RIM} />
    </>
  )
}

export default function LoginIllustration({ style }) {
  return (
    <View style={style} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 -60 400 310" preserveAspectRatio="xMidYMax slice">
        {/* Yötaivas: kuunsirppi, pilvet ja tähdet */}
        <Circle cx={318} cy={10} r={30} fill="#ffffff" opacity={0.9} />
        <Circle cx={331} cy={1} r={27} fill={SKY} />
        <Path
          d="M60 18 C52 18 52 7 61 7 C63 0 73 -2 77 4 C80 -3 92 -2 93 7 C101 7 102 18 94 18 Z"
          fill="#ffffff"
          opacity={0.16}
        />
        <Path
          d="M250 40 C242 40 242 29 251 29 C253 22 263 20 267 26 C270 19 282 20 283 29 C291 29 292 40 284 40 Z"
          fill="#ffffff"
          opacity={0.12}
        />
        <G fill="#ffffff" opacity={0.75}>
          <Circle cx={30} cy={-30} r={1.6} />
          <Circle cx={128} cy={-38} r={1.2} />
          <Circle cx={162} cy={-14} r={1.8} />
          <Circle cx={212} cy={-42} r={1.3} />
          <Circle cx={262} cy={-8} r={1.1} />
          <Circle cx={380} cy={-40} r={1.5} />
          <Circle cx={120} cy={40} r={1.2} />
          <Circle cx={20} cy={60} r={1.1} />
        </G>

        {/* Kaupungin siluetti vasemmalla ja Puijon torni kukkulalla oikealla */}
        <G fill={SKYLINE}>
          <Path d="M270 200 C290 150 340 132 400 140 L400 200 Z" />
          <Rect x={352} y={40} width={9} height={100} />
          <Rect x={344} y={30} width={25} height={14} rx={3} />
          <Rect x={349} y={22} width={15} height={10} rx={2} />
          <Rect x={355} y={8} width={3} height={16} />
          <Rect x={0} y={120} width={34} height={80} />
          <Rect x={30} y={96} width={28} height={104} />
          <Rect x={54} y={132} width={40} height={68} />
          <Rect x={90} y={108} width={24} height={92} />
        </G>
        <Circle cx={356.5} cy={7} r={2.6} fill={ORANGE} />
        <G fill={WINDOW} opacity={0.85}>
          <Rect x={36} y={104} width={6} height={8} />
          <Rect x={46} y={104} width={6} height={8} />
          <Rect x={36} y={120} width={6} height={8} />
          <Rect x={46} y={120} width={6} height={8} />
          <Rect x={96} y={116} width={5} height={7} />
          <Rect x={104} y={116} width={5} height={7} />
          <Rect x={96} y={130} width={5} height={7} />
          <Rect x={104} y={130} width={5} height={7} />
        </G>

        {/* Valkoinen maa ja pyörän varjo */}
        <Path d="M0 198 C120 214 280 214 400 194 L400 270 L0 270 Z" fill="#ffffff" />
        <Ellipse cx={206} cy={212} rx={84} ry={5} fill={INK} opacity={0.1} />

        {/* Vauhtiviivat */}
        <G stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.65}>
          <Line x1={96} y1={92} x2={136} y2={92} />
          <Line x1={74} y1={112} x2={132} y2={112} />
          <Line x1={92} y1={148} x2={118} y2={148} />
        </G>

        {/* Kauempi jalka ja poljin */}
        <Path d="M188 120 L214 132" stroke={PANTS_FAR} strokeWidth={14} strokeLinecap="round" />
        <Path d="M214 132 L190 168" stroke={PANTS_FAR} strokeWidth={11} strokeLinecap="round" />
        <Path d="M182 168 h16 a4 4 0 0 1 0 8 h-14 a5 5 0 0 1 -2 -8z" fill={SHOE_FAR} />
        <Line x1={198} y1={184} x2={188} y2={174} stroke={METAL} strokeWidth={4} strokeLinecap="round" />

        {/* Renkaat */}
        <Wheel cx={150} />
        <Wheel cx={264} />

        {/* Runko, satula ja ohjaustanko */}
        <G stroke="#ffffff" strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <Path d="M150 182 L198 186 L186 132 Z" />
          <Path d="M186 134 L246 136 L198 186" />
          <Path d="M244 128 L252 150 Q258 166 264 182" />
        </G>
        <Line x1={186} y1={132} x2={182} y2={122} stroke={METAL} strokeWidth={4} strokeLinecap="round" />
        <Path d="M168 120 Q182 116 196 121" stroke={METAL} strokeWidth={6} strokeLinecap="round" fill="none" />
        <Path
          d="M244 128 L242 118 L258 116 Q266 118 264 128"
          stroke={METAL}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Kauempi käsi */}
        <Path
          d="M226 88 L236 106 L256 118"
          stroke={JACKET_FAR}
          strokeWidth={9}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={258} cy={118} r={4.5} fill={SKIN_SHADE} />

        {/* Vartalo: oranssi takki kauluksineen ja valkoinen heijastinraita */}
        <Path
          d="M176 120 C178 102 194 84 214 74 C224 69 236 72 238 82 C240 94 226 110 204 126 C194 133 174 132 176 120 Z"
          fill={JACKET}
        />
        <Path d="M222 72 Q232 70 238 78" stroke={COLLAR} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Path d="M198 116 L230 88" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />

        {/* Bidrop-reppu selässä selän kulmassa */}
        <G rotation={-40} originX={190} originY={80}>
          <Rect x={164} y={60} width={52} height={40} rx={8} fill="#ffffff" />
          <Rect x={164} y={60} width={52} height={10} rx={5} fill={BAG_SHADE} />
          {/* Sama sanamerkki kuin logossa (frontend/src/lib/logoPaths.js). */}
          <G transform="translate(170 79.8) scale(0.128)">
            <Path d={LOGO_LETTERS_PATH} fill={INK} />
            <Path d={LOGO_ACCENT_PATH} fill={ORANGE} />
          </G>
        </G>
        <Path d="M212 82 Q222 86 228 96" stroke={RIM} strokeWidth={3} strokeLinecap="round" fill="none" />

        {/* Kaula ja pää kypärineen */}
        <Line x1={236} y1={78} x2={241} y2={71} stroke={SKIN} strokeWidth={9} strokeLinecap="round" />
        <Circle cx={248} cy={62} r={12.5} fill={SKIN} />
        <Path d="M260 63 q3 2 0 4" stroke={SKIN_SHADE} strokeWidth={2} strokeLinecap="round" fill="none" />
        <Circle cx={255} cy={61} r={1.8} fill={INK} />
        <Circle cx={243} cy={64} r={3} fill={SKIN_SHADE} />
        <Path d="M246 71 q4 1 7 -1" stroke={LIP} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        <Path d="M233 56 A15 14 0 0 1 263 53 L265 56 Q250 55 233 57.5 Z" fill="#ffffff" />
        <Path d="M240 45 Q249 41 257 46" stroke={ORANGE} strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M236 57 Q238 66 244 70" stroke={INK} strokeWidth={1.4} fill="none" opacity={0.5} />

        {/* Lähempi käsi */}
        <Path
          d="M230 84 L242 104 L262 120"
          stroke={SLEEVE}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx={264} cy={121} r={5} fill={SKIN} />

        {/* Ketjuratas, lähempi poljin ja jalka */}
        <Circle cx={198} cy={186} r={8} fill="#ffffff" stroke={INK} strokeWidth={2.5} />
        <Line x1={198} y1={186} x2={210} y2={197} stroke={METAL} strokeWidth={4} strokeLinecap="round" />
        <Path d="M190 122 L222 140" stroke={PANTS} strokeWidth={15} strokeLinecap="round" />
        <Path d="M222 140 L212 188" stroke={PANTS} strokeWidth={12} strokeLinecap="round" />
        <Path d="M204 188 h18 a5 5 0 0 1 0 10 h-16 a5 5 0 0 1 -2 -10z" fill="#ffffff" stroke={INK} strokeWidth={2} />
      </Svg>
    </View>
  )
}

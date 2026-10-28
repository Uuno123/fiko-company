// Bidropin värit samoina kuin verkkosivulla (frontend/src/index.css) ja
// kuljettajasovelluksessa, jotta asiakassovellus näyttää samalta brändiltä.
export const colors = {
  black: '#14150f',
  orange: '#f4501e',
  orangeDark: '#d93f10',
  orangeSoft: '#ffece5',
  surface: '#ffffff',
  textMuted: '#6c7066',
  open: '#2fae4e',
  danger: '#e0455b',
  // Neutraalit harmaat pinnoille, reunoille ja painalluksille - ei verkkosivun
  // kellertäviä surface-muted- ja border-sävyjä (käyttäjä halusi valkoista ja
  // harmaata, ei kellertävää).
  gray50: '#f6f7f9',
  gray100: '#f1f2f4',
  gray200: '#e6e8ec',
  gray400: '#b4b8bf',
}

// Fontit samat kuin verkkosivulla: otsikot ja logo Space Grotesk, muu teksti
// Inter (ladataan app/_layout.jsx:ssä). Jokainen paino on oma fonttinsa, joten
// näiden kanssa ei käytetä fontWeight-arvoa - Android vaihtaisi silloin
// järjestelmäfonttiin.
export const fonts = {
  display: 'SpaceGrotesk_700Bold',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
}

import { useState } from 'react'
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, Mail, Siren } from 'lucide-react-native'
import { Card, ListRow, Screen, SectionTitle } from '../components/ui'
import { formatEuro } from '../lib/format'
import { PAY } from '../lib/gigs'
import { colors, fonts } from '../theme'

const SUPPORT_EMAIL = 'tuki@delivo.fi'

// Usein kysytyt kysymykset. Tekstit ovat luonnoksia - tarkennetaan kun
// keikkojen vastaanotto ja palkkiomalli lyödään lukkoon.
const FAQ = [
  {
    question: 'Miten menen online-tilaan?',
    answer: 'Liu’uta etusivun oranssi kytkin oikealle tai napauta sitä. Kun olet online, sinulle tarjotaan keikkoja lähialueeltasi. Offline-tilaan pääset samalla kytkimellä.',
  },
  {
    question: 'Miten keikka etenee?',
    answer: 'Hyväksy tarjous, aja ravintolaan ja nouda tilaus. Vie tilaus asiakkaalle ja merkitse se toimitetuksi. Keikka näkyy sen jälkeen keikkahistoriassa ja ansioissa.',
  },
  {
    question: 'Miten ansiot lasketaan?',
    answer: `Jokaisesta keikasta saat perusmaksun (${formatEuro(PAY.baseCents)}) ja matkalisän (${formatEuro(PAY.perKmCents)} / km). Asiakkaan antamat tipit menevät kokonaan sinulle. Ansiot näet valikon kohdasta Ansiot.`,
  },
  {
    question: 'Mitä teen, jos asiakas ei vastaa?',
    answer: 'Odota hetki osoitteessa ja yritä tavoittaa asiakas. Jos et saa yhteyttä, ota yhteys tukeen - autamme sinua päättämään, mitä tilaukselle tehdään.',
  },
  {
    question: 'Mikä on ajastettu offline?',
    answer: 'Voit valita kellonajan, jolloin sovellus vie sinut automaattisesti offline-tilaan - esimerkiksi vuoron loppuessa. Ajastuksen voi perua milloin tahansa, ja se poistuu jos menet itse offline-tilaan.',
  },
  {
    question: 'Sijaintini ei näy kartalla',
    answer: 'Tarkista, että sovellukselle on annettu sijaintilupa: Asetukset > Sijainti. Paikannus toimii parhaiten ulkona.',
  },
]

// Tuki ja ohjeet: usein kysytyt kysymykset avautuvina riveinä ja yhteystavat.
export default function HelpScreen() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggle = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <Screen title="Tuki ja ohjeet">
      <SectionTitle style={styles.firstTitle}>Ota yhteyttä</SectionTitle>
      <Card>
        <ListRow
          icon={Mail}
          label="Lähetä viesti tukeen"
          detail={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
        />
        <ListRow
          icon={Siren}
          label="Hätätilanne"
          detail="Onnettomuudessa tai vaaratilanteessa soita hätänumeroon 112."
          onPress={() => Linking.openURL('tel:112').catch(() => {})}
          danger
          last
        />
      </Card>

      <SectionTitle>Usein kysyttyä</SectionTitle>
      <Card>
        {FAQ.map(({ question, answer }, index) => {
          const open = openIndex === index
          return (
            <View key={question} style={index < FAQ.length - 1 && styles.faqDivider}>
              <Pressable
                onPress={() => toggle(index)}
                style={({ pressed }) => [styles.question, pressed && styles.questionPressed]}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
              >
                <Text style={styles.questionText}>{question}</Text>
                <View style={open && styles.chevronOpen}>
                  <ChevronDown size={20} strokeWidth={2} color={colors.textMuted} />
                </View>
              </Pressable>
              {open ? <Text style={styles.answer}>{answer}</Text> : null}
            </View>
          )
        })}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  firstTitle: {
    marginTop: 8,
  },
  faqDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  questionPressed: {
    backgroundColor: colors.gray50,
  },
  questionText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.black,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  answer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
})

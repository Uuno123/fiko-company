import { useState } from 'react'
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, Mail, Siren } from 'lucide-react-native'
import { Card, ListRow, Screen } from '../components/ui'
import { formatEuro } from '../lib/format'
import { PAY } from '../lib/gigs'
import { colors, fonts } from '../theme'

const SUPPORT_EMAIL = 'tuki@delivo.fi'

// Usein kysytyt kysymykset (sama keikan kulku ja palkkiomalli kuin sovelluksessa
// ja kumppanisivulla).
const FAQ = [
  {
    question: 'Miten menen online-tilaan?',
    answer: 'Liu’uta etusivun oranssi kytkin oikealle tai napauta sitä. Kun olet online, sinulle tarjotaan keikkoja lähialueeltasi. Offline-tilaan pääset samalla kytkimellä.',
  },
  {
    question: 'Miten keikka etenee?',
    answer: 'Hyväksy tarjous 60 sekunnin kuluessa ja aja ravintolaan. Nouda tilaus ravintolan antamalla noutokoodilla. Vie tilaus asiakkaalle ja kuittaa toimitus perillä - sovellus tarkistaa, että olet osoitteessa. Keikka näkyy sen jälkeen keikkahistoriassa ja ansioissa.',
  },
  {
    question: 'Miten ansiot lasketaan?',
    answer: `Jokaisesta keikasta saat perusmaksun (${formatEuro(PAY.baseCents)}) ja matkalisän (${formatEuro(PAY.perKmCents)} / km) reitistä sinulta ravintolaan ja sieltä perille. Ansion näet jo tarjouksessa ennen hyväksymistä, ja kertyneet ansiot valikon kohdasta Ansiot.`,
  },
  {
    question: 'Pitääkö minulla olla yritys?',
    answer: 'Kyllä. Kuljettajana toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä laskutuspalvelun kautta.',
  },
  {
    question: 'Mitä teen, jos asiakas ei vastaa?',
    answer: 'Odota hetki osoitteessa ja yritä tavoittaa asiakas. Jos et saa yhteyttä, ota yhteys tukeen - autamme sinua päättämään, mitä tilaukselle tehdään.',
  },
  {
    question: 'Miksi en pääse online-tilaan?',
    answer:
      'Online-tilaan pääset, kun delivo on hyväksynyt pakolliset dokumentit: henkilökortin tai passin, autolla tai skootterilla ajokortin ja omalla yrityksellä laskuttaessa pankkitodisteen. Lataa ne kohdasta Dokumentit. Tarkastus kestää yleensä 1–2 arkipäivää.',
  },
  {
    question: 'Miten vaihdan kulkuneuvon tai tilinumeron?',
    answer:
      'Nimi, sähköposti, kulkuneuvo, kaupunki, Y-tunnus, laskutustapa ja tilinumero vaihdetaan muutospyynnöllä: Profiili tai Laskutustiedot > napauta tietoa > Pyydä muutosta. delivo hyväksyy pyynnön yleensä 1–2 arkipäivässä. Autoon tai skootteriin vaihtaessa lataa ajokortti ja tilinumeroa vaihtaessa pankkitodiste Dokumentit-näkymään.',
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
      <Card title="Ota yhteyttä">
        <ListRow
          icon={Mail}
          label="Lähetä viesti tukeen"
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
        />
        <ListRow
          icon={Siren}
          label="Hätänumero 112"
          onPress={() => Linking.openURL('tel:112').catch(() => {})}
          danger
          last
        />
      </Card>

      <Card title="Usein kysyttyä">
        {FAQ.map(({ question, answer }, index) => {
          const open = openIndex === index
          return (
            <View key={question}>
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
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
  },
  questionPressed: {
    opacity: 0.6,
  },
  questionText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.black,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  answer: {
    paddingBottom: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
  },
})

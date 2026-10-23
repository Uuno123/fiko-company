import { useState } from 'react'
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, Mail, Siren } from 'lucide-react-native'
import { Card, ListRow, Screen } from '../components/ui'
import { formatEuro } from '../lib/format'
import { DELIVERY_BID } from '../../../frontend/src/lib/deliveryTime'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

const SUPPORT_EMAIL = 'tuki@bidrop.fi'

// Usein kysytyt kysymykset (sama keikan kulku ja palkkiomalli kuin sovelluksessa
// ja kumppanisivulla). Tekstit valitulla kielellä: help.q1-q9 ja help.a1-a9.
const FAQ_COUNT = 9

// Tuki ja ohjeet: usein kysytyt kysymykset avautuvina riveinä ja yhteystavat.
export default function HelpScreen() {
  const t = useT()
  const [openIndex, setOpenIndex] = useState(null)
  const range = { min: formatEuro(DELIVERY_BID.minCents), max: formatEuro(DELIVERY_BID.maxCents) }
  const faq = Array.from({ length: FAQ_COUNT }, (_, index) => ({
    question: t(`help.q${index + 1}`),
    answer: t(`help.a${index + 1}`, range),
  }))

  const toggle = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenIndex((current) => (current === index ? null : index))
  }

  return (
    <Screen title={t('menu.help')}>
      <Card title={t('help.contact')}>
        <ListRow
          icon={Mail}
          label={t('help.message')}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
        />
        <ListRow
          icon={Siren}
          label={t('help.emergency')}
          onPress={() => Linking.openURL('tel:112').catch(() => {})}
          danger
          last
        />
      </Card>

      <Card title={t('help.faq')}>
        {faq.map(({ question, answer }, index) => {
          const open = openIndex === index
          return (
            <View key={index}>
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

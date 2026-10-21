import { StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Building, FileText, Landmark, ReceiptText, User } from 'lucide-react-native'
import { Card, ListRow, LockedRow, Screen } from '../components/ui'
import { useChangeRequests } from '../lib/changeRequests'
import { billingMethodLabel, useCourier } from '../lib/courier'
import { colors, fonts } from '../theme'

// Laskutustiedot: Y-tunnus, laskutustapa (oma yritys, UKKO.fi tai Eezy),
// tilinumero ja tilinomistaja. Kaikki lukittuja - muutos tehdään
// muutospyynnöllä, ja tilinumeron muutokseen tarvitaan pankkitodiste.
export default function BillingScreen() {
  const router = useRouter()
  const { profile } = useCourier()
  const { pendingFor } = useChangeRequests()

  const request = (field) => router.push({ pathname: '/change-request', params: { field } })
  const pendingNote = (field, format = (value) => value) => {
    const pending = pendingFor(field)
    return pending ? `Odottaa hyväksyntää: ${format(pending.new_value)}` : 'Pyydä muutosta'
  }
  const maskIban = (iban) => (iban ? `•••• ${String(iban).slice(-4)}` : null)

  return (
    <Screen title="Laskutustiedot">
      <Card title="Laskutus">
        <LockedRow
          icon={Building}
          label="Y-tunnus"
          value={profile.businessId ?? 'Ei asetettu'}
          note={pendingNote('business_id')}
          noteAccent={!pendingFor('business_id')}
          onPress={() => request('business_id')}
        />
        <LockedRow
          icon={ReceiptText}
          label="Laskutustapa"
          value={billingMethodLabel(profile.billingMethod) ?? 'Ei asetettu'}
          note={pendingNote('billing_method', (value) => billingMethodLabel(value) ?? value)}
          noteAccent={!pendingFor('billing_method')}
          onPress={() => request('billing_method')}
        />
      </Card>

      <Card title="Tilinumero">
        <LockedRow
          icon={Landmark}
          label="IBAN"
          value={maskIban(profile.iban) ?? 'Ei asetettu'}
          note={pendingNote('iban', maskIban)}
          noteAccent={!pendingFor('iban')}
          onPress={() => request('iban')}
        />
        <LockedRow icon={User} label="Tilinomistaja" value={profile.ibanHolder ?? 'Ei asetettu'} />
        <ListRow icon={FileText} label="Lataa pankkitodiste" onPress={() => router.push('/documents')} />
      </Card>

      <Text style={styles.note}>
        Tilinumeron muutokseen tarvitaan pankkitodiste. delivo käsittelee muutospyynnöt yleensä 1–2 arkipäivässä.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  note: {
    marginHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})

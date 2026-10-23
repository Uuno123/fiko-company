import { StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { Building, FileText, Landmark, ReceiptText, User } from 'lucide-react-native'
import { Card, ListRow, LockedRow, Screen } from '../components/ui'
import { changeRowStatus, displayChangeValue, useChangeRequests } from '../lib/changeRequests'
import { billingMethodLabel, useCourier } from '../lib/courier'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

// Laskutustiedot: Y-tunnus, laskutustapa (oma yritys, UKKO.fi tai Eezy),
// tilinumero ja tilinomistaja. Kaikki lukittuja - muutos tehdään
// muutospyynnöllä, ja tilinumeron muutokseen tarvitaan pankkitodiste.
export default function BillingScreen() {
  const router = useRouter()
  const t = useT()
  const { profile } = useCourier()
  const { pendingFor, rejectedFor } = useChangeRequests()

  const request = (field) => router.push({ pathname: '/change-request', params: { field } })
  // Kesken oleva tai hylätty pyyntö rivillä tilana (sama kuin Profiilissa).
  const rowStatus = (field) => changeRowStatus(field, pendingFor(field), rejectedFor(field))

  return (
    <Screen title={t('profile.billing')}>
      <Card title={t('billing.section')}>
        <LockedRow
          icon={Building}
          label={t('billing.businessId')}
          value={profile.businessId ?? t('common.notSet')}
          {...rowStatus('business_id')}
          onPress={() => request('business_id')}
        />
        <LockedRow
          icon={ReceiptText}
          label={t('billing.method')}
          value={billingMethodLabel(profile.billingMethod) ?? t('common.notSet')}
          {...rowStatus('billing_method')}
          onPress={() => request('billing_method')}
        />
      </Card>

      <Card title={t('billing.account')}>
        <LockedRow
          icon={Landmark}
          label="IBAN"
          value={profile.iban ? displayChangeValue('iban', profile.iban) : t('common.notSet')}
          {...rowStatus('iban')}
          onPress={() => request('iban')}
        />
        <LockedRow icon={User} label={t('billing.holder')} value={profile.ibanHolder ?? t('common.notSet')} />
        <ListRow icon={FileText} label={t('billing.uploadProof')} onPress={() => router.push('/documents')} />
      </Card>

      <Text style={styles.note}>{t('billing.note')}</Text>
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

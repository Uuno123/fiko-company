import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Megaphone, ReceiptText } from 'lucide-react-native'
import { Notice, SettingsRow, SettingsSection, SettingsTopBar, Toggle, settingsStyles } from '../../components/SettingsUI'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { colors, fonts } from '../../theme'

// Ilmoitukset kuten verkkosivulla (SettingsNotifications.jsx): tilausviestit
// aina päällä, tarjoukset ja uutiset kytkimellä (customers.marketing_opt_in).
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const { customer, refreshCustomer } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const marketing = Boolean(customer?.marketing_opt_in)

  async function toggleMarketing(next) {
    if (saving || !customer) return
    setError('')
    setSaving(true)
    const { error: updateError } = await supabase
      .from('customers')
      .update({ marketing_opt_in: next })
      .eq('id', customer.id)
    if (updateError) {
      setError('Tallennus epäonnistui. Yritä hetken kuluttua uudelleen.')
      setSaving(false)
      return
    }
    await refreshCustomer()
    setSaving(false)
  }

  return (
    <View style={settingsStyles.screen}>
      <SettingsTopBar title="Ilmoitukset" />
      <ScrollView contentContainerStyle={[settingsStyles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Notice kind="error">{error}</Notice>
        <SettingsSection title="Sähköposti-ilmoitukset">
          <SettingsRow
            first
            icon={ReceiptText}
            label="Tilausvahvistukset ja -päivitykset"
            trailing={<Text style={styles.fixed}>Aina päällä</Text>}
          />
          <SettingsRow
            icon={Megaphone}
            label="Tarjoukset ja uutiset"
            trailing={
              <Toggle
                value={marketing}
                onChange={toggleMarketing}
                disabled={saving}
                label="Tarjoukset ja uutiset sähköpostitse"
              />
            }
          />
        </SettingsSection>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  fixed: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
})

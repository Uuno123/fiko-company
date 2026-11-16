import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Notice, SettingsSection, SettingsTopBar, settingsStyles } from '../../components/SettingsUI'
import { Button, ErrorBanner, PasswordField } from '../../components/ui'
import { supabase } from '../../lib/supabase'

// Salasanan vaihto kuten verkkosivulla (SettingsPassword.jsx):
// supabase.auth.updateUser({ password }), vähintään 6 merkkiä.
function passwordError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  if (message.includes('different from the old')) return 'Uuden salasanan pitää olla eri kuin vanha.'
  if (message.includes('at least') || message.includes('weak')) return 'Salasana on liian lyhyt tai heikko.'
  if (message.includes('reauthentication') || message.includes('session')) {
    return 'Kirjaudu uudelleen sisään ja yritä sitten vaihtaa salasana.'
  }
  return 'Salasanan vaihto epäonnistui. Yritä hetken kuluttua uudelleen.'
}

export default function PasswordScreen() {
  const insets = useSafeAreaInsets()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function submit() {
    setError('')
    setSaved(false)
    if (password.length < 6) {
      setError('Salasanassa pitää olla vähintään 6 merkkiä.')
      return
    }
    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)
    if (updateError) {
      setError(passwordError(updateError))
      return
    }
    setPassword('')
    setSaved(true)
  }

  return (
    <View style={settingsStyles.screen}>
      <SettingsTopBar title="Salasana" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[settingsStyles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {saved ? <Notice>Salasana vaihdettu.</Notice> : null}
        <SettingsSection title="Vaihda salasana">
          <View style={{ padding: 16, gap: 18 }}>
            <ErrorBanner message={error} />
            <PasswordField
              label="Uusi salasana"
              hint="Vähintään 6 merkkiä"
              value={password}
              onChangeText={setPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={submit}
            />
            <Button title={submitting ? 'Vaihdetaan...' : 'Vaihda salasana'} onPress={submit} loading={submitting} />
          </View>
        </SettingsSection>
      </ScrollView>
    </View>
  )
}

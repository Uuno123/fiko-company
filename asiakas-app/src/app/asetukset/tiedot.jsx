import { useState } from 'react'
import { Linking, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { LogOut, Mail, MapPin, Phone, Trash2, User } from 'lucide-react-native'
import { EditSheet, Notice, SettingsRow, SettingsSection, SettingsTopBar, settingsStyles } from '../../components/SettingsUI'
import { Button, ErrorBanner, PhoneField, TextField } from '../../components/ui'
import {
  formatDisplayAddress,
  formatPhone,
  internationalPhone,
  nationalPhone,
  splitName,
} from '../../../../frontend/src/lib/format'
import { savedAddressSummary } from '../../../../frontend/src/lib/customerAddress'
import FavoritesSection from '../../components/FavoritesSection'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'

// Omat tiedot kuten verkkosivulla (SettingsProfile.jsx): henkilötiedot,
// toimitusosoite ja tili ryhmiteltyinä listoina. Nimen ja puhelimen rivi avaa
// alhaalta nousevan muokkausikkunan; tallennus customers-riville.
// Osoitteen muokkaus: app/asetukset/osoite.jsx. Lempipaikat: FavoritesSection.
export default function ProfileDetailsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { customer, refreshCustomer, signOut } = useAuth()
  const [editField, setEditField] = useState(null)
  const [saved, setSaved] = useState(false)

  const addressHints = [
    savedAddressSummary(customer),
    customer?.courier_instructions && `Ohjeet: ${customer.courier_instructions}`,
  ]

  return (
    <View style={settingsStyles.screen}>
      <SettingsTopBar title="Omat tiedot" />
      <ScrollView contentContainerStyle={[settingsStyles.content, { paddingBottom: insets.bottom + 32 }]}>
        {saved ? <Notice>Tiedot tallennettu.</Notice> : null}

        <SettingsSection title="Henkilötiedot">
          <SettingsRow
            first
            icon={User}
            label="Nimi"
            value={customer?.name || '-'}
            onPress={() => {
              setSaved(false)
              setEditField('name')
            }}
          />
          <SettingsRow
            icon={Phone}
            label="Puhelinnumero"
            value={formatPhone(customer?.phone) || 'Lisää puhelinnumero'}
            onPress={() => {
              setSaved(false)
              setEditField('phone')
            }}
          />
          <SettingsRow icon={Mail} label="Sähköposti" value={customer?.email || '-'} />
        </SettingsSection>

        <SettingsSection title="Toimitusosoite">
          {customer?.address ? (
            <SettingsRow
              first
              icon={MapPin}
              label="Osoite"
              value={formatDisplayAddress(customer.address)}
              hint={addressHints}
              onPress={() => router.push('/asetukset/osoite')}
            />
          ) : (
            <SettingsRow first icon={MapPin} label="Lisää toimitusosoite" onPress={() => router.push('/asetukset/osoite')} />
          )}
        </SettingsSection>

        <FavoritesSection customerId={customer?.id} onOpen={(id) => router.push(`/ravintola/${id}`)} />

        <SettingsSection title="Tili">
          <SettingsRow
            first
            icon={LogOut}
            label="Kirjaudu ulos"
            onPress={async () => {
              await signOut()
              router.replace('/')
            }}
          />
          <SettingsRow
            icon={Trash2}
            label="Pyydä tilin poistoa"
            danger
            onPress={() => Linking.openURL('mailto:tuki@bidrop.fi?subject=Tilin%20poistopyynt%C3%B6')}
          />
        </SettingsSection>
      </ScrollView>

      {customer ? (
        <EditFieldSheet
          field={editField}
          customer={customer}
          onClose={() => setEditField(null)}
          onSaved={async () => {
            await refreshCustomer()
            setEditField(null)
            setSaved(true)
          }}
        />
      ) : null}
    </View>
  )
}

// Nimen (etu- ja sukunimi) tai puhelinnumeron muokkaus.
function EditFieldSheet({ field, customer, onClose, onSaved }) {
  const isName = field === 'name'
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openedFor, setOpenedFor] = useState(null)

  // Ikkunan avautuessa kentät täytetään nykyisillä tiedoilla.
  if (field && openedFor !== field) {
    setOpenedFor(field)
    setFirst(splitName(customer.name).first)
    setLast(splitName(customer.name).last)
    setPhone(nationalPhone(customer.phone))
    setError('')
  }
  if (!field && openedFor) setOpenedFor(null)

  async function save() {
    setError('')
    let update
    if (isName) {
      if (!first.trim() || !last.trim()) {
        setError('Anna etu- ja sukunimi.')
        return
      }
      update = { name: `${first.trim()} ${last.trim()}` }
    } else {
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 6 || digits.length > 11) {
        setError('Tarkista puhelinnumero.')
        return
      }
      update = { phone: internationalPhone(phone) }
    }
    setSaving(true)
    const { error: updateError } = await supabase.from('customers').update(update).eq('id', customer.id)
    setSaving(false)
    if (updateError) {
      setError('Tallennus epäonnistui. Yritä hetken kuluttua uudelleen.')
      return
    }
    onSaved()
  }

  return (
    <EditSheet visible={Boolean(field)} title={isName ? 'Muokkaa nimeä' : 'Muokkaa puhelinnumeroa'} onClose={onClose}>
      <ErrorBanner message={error} />
      {isName ? (
        <View style={styles.nameRow}>
          <TextField style={{ flex: 1 }} label="Etunimi" value={first} onChangeText={setFirst} autoComplete="given-name" autoFocus />
          <TextField style={{ flex: 1 }} label="Sukunimi" value={last} onChangeText={setLast} autoComplete="family-name" />
        </View>
      ) : (
        <PhoneField label="Puhelinnumero" value={phone} onChangeText={setPhone} autoFocus />
      )}
      <View style={{ marginTop: 20 }}>
        <Button title="Tallenna" onPress={save} loading={saving} />
      </View>
    </EditSheet>
  )
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', gap: 10 },
})

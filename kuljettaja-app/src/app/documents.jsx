import { useState } from 'react'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, CreditCard, FileText, IdCard, Image as ImageIcon, Landmark } from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Card, ListRow, Screen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import { DOCUMENT_STATUS, DOCUMENT_TYPES, documentErrorText, missingDocuments, uploadDocument, useDocuments } from '../lib/documents'
import { colors, fonts } from '../theme'

const TYPE_ICONS = { id_card: IdCard, driving_licence: CreditCard, business_register: FileText, bank_proof: Landmark }
const STATUS_COLORS = { missing: colors.gray400, pending: colors.orange, approved: colors.open, rejected: colors.danger }

const SOURCES = [
  { key: 'camera', label: 'Ota kuva', icon: Camera },
  { key: 'library', label: 'Valitse galleriasta', icon: ImageIcon },
]

// Dokumentit: henkilöllisyys, ajokortti, Y-tunnus ja pankkitodiste. Kuva
// otetaan kameralla tai valitaan galleriasta ja lähetetään delivon
// tarkastettavaksi (migraatio 0052). Uusi kuva on aina uusi tarkastus.
export default function DocumentsScreen() {
  const { courier } = useAuth()
  const { profile } = useCourier()
  const { documents, latestOf, error: loadError, reload } = useDocuments()
  const missing = missingDocuments(documents, profile)
  const [picking, setPicking] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [error, setError] = useState('')

  const pick = async (source) => {
    const type = picking
    setPicking(null)
    setError('')
    // iOS ei avaa kameraa tai galleriaa, ennen kuin valikko on ehtinyt sulkeutua.
    if (Platform.OS === 'ios') await new Promise((resolve) => setTimeout(resolve, 400))
    try {
      const permission =
        source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setError(source === 'camera' ? 'Salli kameran käyttö puhelimen asetuksista.' : 'Salli kuvien käyttö puhelimen asetuksista.')
        return
      }
      const options = { mediaTypes: ['images'], quality: 0.7 }
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
      if (result.canceled || !result.assets?.[0]) return
      setUploading(type)
      await uploadDocument(courier.id, type, result.assets[0])
      await reload()
    } catch (err) {
      setError(documentErrorText(err))
    } finally {
      setUploading(null)
    }
  }

  return (
    <Screen title="Dokumentit">
      {loadError || error ? <Text style={styles.error}>{error || loadError}</Text> : null}

      <Card title="Dokumentit">
        {DOCUMENT_TYPES.map(({ key, label }) => {
          const latest = latestOf(key)
          const status = latest?.status ?? 'missing'
          // Pakollinen niin kauan, kuin tyypillä ei ole yhtään hyväksyttyä kuvaa.
          const required = missing.some((type) => type.key === key)
          let detail = DOCUMENT_STATUS[status]
          if (status === 'rejected' && latest.admin_note) detail = `${detail}: ${latest.admin_note}`
          if (required) detail = `${detail} · Pakollinen`
          return (
            <ListRow
              key={key}
              icon={TYPE_ICONS[key]}
              label={label}
              detail={detail}
              onPress={uploading ? undefined : () => setPicking(key)}
              right={
                uploading === key ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
                )
              }
            />
          )
        })}
      </Card>

      <Text style={styles.note}>
        Online-tilaan pääset, kun pakolliset dokumentit on hyväksytty. Kuvat näkevät vain sinä ja delivo, ja uusi
        kuva lähtee aina tarkastettavaksi.
      </Text>

      <ChoiceSheet
        visible={picking !== null}
        title={DOCUMENT_TYPES.find((type) => type.key === picking)?.label ?? ''}
        options={SOURCES}
        onSelect={pick}
        onClose={() => setPicking(null)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.danger,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  note: {
    marginHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
})

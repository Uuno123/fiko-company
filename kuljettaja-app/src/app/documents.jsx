import { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Camera, CreditCard, FileText, IdCard, Image as ImageIcon, Landmark } from 'lucide-react-native'
import ChoiceSheet from '../components/ChoiceSheet'
import { Card, ListRow, Screen } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useCourier } from '../lib/courier'
import {
  DOCUMENT_TYPES,
  documentErrorText,
  documentStatusLabel,
  documentTypeLabel,
  missingDocuments,
  pickDocumentImage,
  uploadDocument,
  useDocuments,
} from '../lib/documents'
import { useT } from '../lib/i18n'
import { colors, fonts } from '../theme'

const TYPE_ICONS = { id_card: IdCard, driving_licence: CreditCard, business_register: FileText, bank_proof: Landmark }
const STATUS_COLORS = { missing: colors.gray400, pending: colors.orange, approved: colors.open, rejected: colors.danger }

const SOURCES = [
  { key: 'camera', labelKey: 'docs.takePhoto', icon: Camera },
  { key: 'library', labelKey: 'docs.fromLibrary', icon: ImageIcon },
]

// Dokumentit: henkilöllisyys, ajokortti, Y-tunnus ja pankkitodiste. Kuva
// otetaan kameralla tai valitaan galleriasta ja lähetetään delivon
// tarkastettavaksi (migraatio 0052). Uusi kuva on aina uusi tarkastus.
export default function DocumentsScreen() {
  const { courier } = useAuth()
  const t = useT()
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
    try {
      const asset = await pickDocumentImage(source)
      if (!asset) return
      setUploading(type)
      await uploadDocument(courier.id, type, asset)
      await reload()
    } catch (err) {
      setError(documentErrorText(err))
    } finally {
      setUploading(null)
    }
  }

  return (
    <Screen title={t('menu.documents')}>
      {loadError || error ? <Text style={styles.error}>{error || loadError}</Text> : null}

      <Card title={t('menu.documents')}>
        {DOCUMENT_TYPES.map(({ key }) => {
          const latest = latestOf(key)
          const status = latest?.status ?? 'missing'
          // Pakollinen niin kauan, kuin tyypillä ei ole yhtään hyväksyttyä kuvaa.
          const required = missing.some((type) => type.key === key)
          let detail = documentStatusLabel(status)
          if (status === 'rejected' && latest.admin_note) detail = `${detail}: ${latest.admin_note}`
          if (required) detail = `${detail} · ${t('docs.required')}`
          return (
            <ListRow
              key={key}
              icon={TYPE_ICONS[key]}
              label={documentTypeLabel(key)}
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

      <Text style={styles.note}>{t('docs.note')}</Text>

      <ChoiceSheet
        visible={picking !== null}
        title={picking ? documentTypeLabel(picking) : ''}
        options={SOURCES.map(({ key, labelKey, icon }) => ({ key, label: t(labelKey), icon }))}
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

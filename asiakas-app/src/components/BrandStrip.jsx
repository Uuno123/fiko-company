import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SvgUri } from 'react-native-svg'
import { BRAND_LOGOS } from '../../../frontend/src/lib/brandLogos'
import BidropLogo from './BidropLogo'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

// Pystysuuntaiset suorakulmiot (käyttäjän pyyntö 15.11.2026, ympyröiden tilalla).
const W = 74
const H = 80

// Ravintolaketjujen logot headerin alla (käyttäjän pyyntö 15.11.2026): samat
// logot kuin verkkosivun etusivulla (lib/brandLogos.js, ladataan sieltä),
// pystyissä pyöreäkulmaisissa suorakulmioissa ja nimi alla. Painallus hakee ketjun.
// Logot vain designia varten - ketjuilta tarvitaan lupa ennen julkaisua.
// Puhelimen Image ei näytä SVG:tä, joten .svg-logot piirtää SvgUri (webissä
// tavallinen kuva, koska SvgUri hakee tiedoston fetchillä ja CORS estää sen).
export default function BrandStrip({ onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {/* Bidropin oma oranssi laatta ensimmäisenä (käyttäjän pyyntö 15.11.2026):
          valkoinen logo, avaa tarjoukset. */}
      <Pressable
        onPress={() => onSelect?.('Tarjoukset')}
        style={({ pressed }) => [styles.brand, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel="Bidropin tarjoukset"
      >
        <View style={[styles.logo, styles.bidrop]}>
          <BidropLogo size={13} dark accent="#ffffff" style={{ alignSelf: 'center' }} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          Tarjoukset
        </Text>
      </Pressable>
      {BRAND_LOGOS.map(({ name, search, logo, pad, bg, tile }) => {
        const uri = imageUri(logo)
        const inner = W - 2 * Math.round(10 + (pad ?? 0) * 0.4)
        const fill = bg ?? tile
        return (
          <Pressable
            key={name}
            onPress={() => onSelect?.(search ?? name)}
            style={({ pressed }) => [styles.brand, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel={name}
          >
            <View style={[styles.logo, fill && { backgroundColor: fill, borderColor: fill }]}>
              {logo.endsWith('.svg') && Platform.OS !== 'web' ? (
                <SvgUri uri={uri} width={inner} height={inner} />
              ) : (
                <Image source={{ uri }} style={{ width: inner, height: inner }} resizeMode="contain" />
              )}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingHorizontal: 16 },
  brand: { width: W, alignItems: 'center' },
  logo: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ececea',
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  bidrop: { backgroundColor: colors.orange, borderColor: colors.orange },
  name: { marginTop: 6, maxWidth: '100%', fontFamily: fonts.semibold, fontSize: 11.5, color: colors.black },
})

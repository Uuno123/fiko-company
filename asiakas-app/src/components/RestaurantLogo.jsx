import { Image, Platform, Text, View } from 'react-native'
import { SvgUri } from 'react-native-svg'
import { brandLogoFor } from '../../../frontend/src/lib/brandLogos'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

// Ravintolan pyöreä logo: ketjun logo (lib/brandLogos.js), muuten ravintolan
// kuva tai nimen alkukirjain. Käytössä seurannan tutkassa ja otsikoissa.
export default function RestaurantLogo({ name, imageUrl, size = 64, style }) {
  const brand = brandLogoFor(name)
  const inner = Math.round(size * 0.72)
  const photo = !brand && imageUri(imageUrl)
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: size / 2,
          backgroundColor: brand?.bg ?? '#ffffff',
        },
        style,
      ]}
    >
      {brand ? (
        brand.logo.endsWith('.svg') && Platform.OS !== 'web' ? (
          <SvgUri uri={imageUri(brand.logo)} width={inner} height={inner} />
        ) : (
          <Image source={{ uri: imageUri(brand.logo) }} style={{ width: inner, height: inner }} resizeMode="contain" />
        )
      ) : photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.headingBold, fontSize: size * 0.38, color: colors.black }}>
          {(name ?? 'R').trim().charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

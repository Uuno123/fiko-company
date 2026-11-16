import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CATEGORY_TILE_META } from '../../../frontend/src/lib/categories'
import { imageUri } from '../lib/restaurants'
import { colors, fonts } from '../theme'

const SIZE = 72
// Kokeilu (käyttäjän pyyntö 16.11.2026): laatat ilman taustaa, kuvat isompina.
// Takaisin oransseihin/harmaisiin laattoihin: SHOW_TILE_BACKGROUND = true.
const SHOW_TILE_BACKGROUND = true

// Kategoriat (käyttäjän pyyntö 16.11.2026): pyöreäkulmaiset laatat ja nimi
// alla, painallus hakee kategorian ravintolat. Pizza ensimmäisenä oranssilla
// laatalla käyttäjän 3D-kuvalla (assets/images/categories/pizza.png, musta
// tausta poistettu), samoin Burgerit (burger.png, 16.11.2026). Muut käyttävät verkkosivun kategoriakuvia vaaleilla laatoilla.
const CATEGORIES = [
  {
    key: 'Kebab & Pizza',
    label: 'Pizza',
    source: require('../../assets/images/categories/pizza.png'),
    tile: colors.orange,
  },
  {
    key: 'Burgerit',
    label: 'Burgerit',
    source: require('../../assets/images/categories/burger.png'),
    tile: colors.orange,
  },
  // Sushikuva hieman isompana (käyttäjän pyyntö 16.11.2026).
  { key: 'Aasialainen', label: 'Sushi', tile: colors.orange, imageSize: 68 },
  { key: 'Salaatit', label: 'Salaatit' },
  { key: 'Italialainen', label: 'Pasta' },
  { key: 'Kebab', label: 'Kebab' },
  { key: 'Kotiruoka', label: 'Kotiruoka' },
  { key: 'Ramen', label: 'Ramen' },
].map((category) => ({
  ...category,
  source: category.source ?? { uri: imageUri(CATEGORY_TILE_META[category.key]?.icon) },
}))

export default function CategoryTiles({ onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {CATEGORIES.map(({ key, label, source, tile, imageSize }) => (
        <Pressable
          key={key}
          onPress={() => onSelect?.(key)}
          style={({ pressed }) => [styles.item, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View style={[styles.tile, SHOW_TILE_BACKGROUND ? tile && { backgroundColor: tile } : styles.tileBare]}>
            <Image
              source={source}
              style={SHOW_TILE_BACKGROUND ? (imageSize ? { width: imageSize, height: imageSize } : styles.image) : styles.imageBare}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingHorizontal: 16 },
  item: { width: SIZE, alignItems: 'center' },
  tile: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    // Laatikot pyöristetyillä kulmilla (käyttäjän pyyntö 16.11.2026);
    // overflow pitää kuvan kulmien sisällä.
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f3f3f1',
  },
  image: { width: SIZE - 14, height: SIZE - 14 },
  tileBare: { backgroundColor: 'transparent' },
  imageBare: { width: SIZE, height: SIZE },
  label: { marginTop: 6, fontFamily: fonts.semibold, fontSize: 12, color: colors.black },
})

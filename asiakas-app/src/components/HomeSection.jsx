import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { ArrowRight } from 'lucide-react-native'
import RestaurantCard from './RestaurantCard'
import BidropLogo from './BidropLogo'
import { colors, fonts } from '../theme'

const GAP = 12
const SIDE = 16

// Otsikko oranssilla pisteellä kuten verkkosivulla ("Aivan nurkan takana.").
export function SectionTitle({ title, style, dot = true }) {
  return (
    <Text style={[styles.title, style]} accessibilityRole="header">
      {title}
      {dot ? <Text style={styles.dot}>.</Text> : null}
    </Text>
  )
}

function ArrowButton({ onPress, light = false }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, light && styles.arrowLight, pressed && styles.arrowPressed]}
      accessibilityRole="button"
      accessibilityLabel="Näytä kaikki"
    >
      <ArrowRight size={17} strokeWidth={2.4} color={colors.orange} />
    </Pressable>
  )
}

function CardRail({ items, cardWidth, onOpen, inset = SIDE, large = false, height }) {
  return (
    <FlatList
      horizontal
      style={height ? { height } : undefined}
      data={items}
      keyExtractor={(item) => String(item.id ?? item.name)}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: inset, gap: GAP }}
      snapToInterval={cardWidth + GAP}
      decelerationRate="fast"
      renderItem={({ item }) => (
        <RestaurantCard
          restaurant={item}
          width={cardWidth}
          large={large}
          onPress={item.isPlaceholder ? undefined : () => onOpen(item)}
        />
      )}
    />
  )
}

// Tavallinen rivi: otsikko, nuolinappi ja vaakaan vierivät kortit.
export function HomeRow({ section, onOpen, onSeeAll }) {
  const { width } = useWindowDimensions()
  const cardWidth = Math.round(width * 0.651)
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <SectionTitle title={section.title} style={styles.rowTitle} />
        <ArrowButton onPress={onSeeAll} />
      </View>
      <CardRail items={section.items} cardWidth={cardWidth} onOpen={onOpen} />
    </View>
  )
}

// Persikkaraita Bidrop-logolla (Kovimmat tarjoukset / Ilmaiset kuljetukset):
// tausta näytön reunasta reunaan ilman laatikkoa (käyttäjän pyyntö 15.11.2026).
export function DealPanel({ section, onOpen, onSeeAll }) {
  const { width } = useWindowDimensions()
  const panelWidth = width
  const cardWidth = Math.round((width - SIDE * 2) * 0.85)
  const isDeals = section.type === 'deals'
  // Taustan koko mitataan paneelista: puhelimella prosenttikokoinen Svg
  // laskettiin ennen paneelin lopullista korkeutta, jolloin persikkatausta jäi
  // lyhyeksi ja "Katso kaikki tarjoukset" näytti katkeavan (15.11.2026).
  const [panelHeight, setPanelHeight] = useState(0)
  return (
    <View
      style={[styles.panel, { width: panelWidth }]}
      onLayout={(e) => setPanelHeight(Math.ceil(e.nativeEvent.layout.height))}
    >
      <Svg
        style={[StyleSheet.absoluteFill, { height: panelHeight }]}
        width={panelWidth}
        height={panelHeight}
        viewBox={`0 0 ${panelWidth} ${panelHeight || 1}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={`panel-${section.key}`} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#ffe1d2" />
            <Stop offset="1" stopColor="#ffbf9f" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={panelWidth} height={panelHeight} fill={`url(#panel-${section.key})`} />
      </Svg>
      <View style={styles.panelHead}>
        <View style={{ flexShrink: 1 }}>
          <BidropLogo size={14} style={{ marginLeft: -5 }} />
          <SectionTitle title={section.title} style={styles.panelTitle} dot={!isDeals} />
        </View>
        {!isDeals ? <ArrowButton onPress={onSeeAll} light /> : null}
      </View>
      <CardRail
        items={section.items}
        cardWidth={cardWidth}
        onOpen={onOpen}
        inset={SIDE}
        large
        height={Math.ceil(cardWidth / 1.75) + 84}
      />
      {isDeals ? (
        <Pressable
          onPress={onSeeAll}
          style={({ pressed }) => [styles.panelButton, pressed && styles.arrowPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.panelButtonText}>Katso kaikki tarjoukset</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { marginTop: 38 },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: SIDE,
    marginBottom: 15,
  },
  title: { fontFamily: fonts.headingBold, fontSize: 20.5, letterSpacing: -0.4, color: '#2a1b12' },
  rowTitle: { flexShrink: 1 },
  dot: { color: colors.orange },
  arrow: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.orangeSoft,
  },
  arrowLight: { backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  arrowPressed: { opacity: 0.7 },
  panel: {
    marginTop: 44,
    paddingTop: 26,
    paddingBottom: 26,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: SIDE,
    marginBottom: 16,
  },
  panelTitle: { marginTop: 5, fontSize: 22.5 },
  panelButton: {
    alignItems: 'center',
    marginTop: 18,
    marginHorizontal: SIDE,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  panelButtonText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.black },
})

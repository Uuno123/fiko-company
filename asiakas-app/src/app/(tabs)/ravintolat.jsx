import { Fragment, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell, ChevronDown, Search, UserRound } from 'lucide-react-native'
import PromoCarousel from '../../components/PromoCarousel'
import BrandStrip from '../../components/BrandStrip'
import WheelBanner from '../../components/WheelBanner'
import AddressSheet from '../../components/AddressSheet'
import { DealPanel, HomeRow } from '../../components/HomeSection'
import { FeedEnd, HomeSkeleton } from '../../components/HomeExtras'
import { buildHomeSections } from '../../lib/homeRows'
import { useRestaurants } from '../../lib/restaurants'
import { useAuth } from '../../lib/auth'
import { useHasActiveOrder } from '../../lib/activeOrders'
import { addAddress, removeAddress, selectAddress, updateAddress, useDeliveryAddresses } from '../../lib/deliveryAddresses'
import { colors, fonts } from '../../theme'

// Koti: header (käyttäjä, osoite, kello), hakupalkki, kuvapromo ja
// ravintolarivit tarjouspaneeleineen (lib/homeRows.js). Ketjulogojen rivi
// (BrandStrip) hakupalkin alla.
export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, customer } = useAuth()
  const hasActiveOrder = useHasActiveOrder()
  const { restaurants, status, refreshing, refresh } = useRestaurants()

  // Valittu toimitusosoite (tilin osoite tai laitteelle lisätty, lib/deliveryAddresses.js):
  // ilman sitä ei "Aivan nurkan takana" -riviä.
  const { addresses, selected } = useDeliveryAddresses(customer)
  const [addressSheetOpen, setAddressSheetOpen] = useState(false)
  const address = useMemo(
    () => (selected ? { label: selected.full, lat: selected.lat, lng: selected.lng } : null),
    [selected],
  )
  const sections = useMemo(() => buildHomeSections(restaurants, address), [restaurants, address])
  const openRestaurant = (restaurant) => router.push(`/ravintola/${restaurant.id}`)
  // Tarjoukset avaa oman tarjoussivun (app/tarjoukset.jsx, 17.11.2026), muut haun.
  const searchFor = (q) =>
    q === 'Tarjoukset' ? router.push('/tarjoukset') : router.push({ pathname: '/haku', params: { q, t: String(Date.now()) } })

  return (
    <View style={styles.screen}>
      {/* Header (käyttäjän pyyntö 15.11.2026): vain osoite, kello ja käyttäjä. */}
      <View style={[styles.siteHeader, { paddingTop: insets.top }]}>
        {/* Vasemmalla käyttäjä, keskellä osoite, oikealla kello (15.11.2026). */}
        <View style={styles.siteHeaderRow}>
          <Pressable
            onPress={() => router.push(session ? '/tili' : '/kirjautuminen')}
            hitSlop={6}
            style={({ pressed }) => [styles.userButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={session ? 'Tili' : 'Kirjaudu sisään'}
          >
            <UserRound size={19} strokeWidth={2} color={colors.black} />
          </Pressable>

          <Pressable
            onPress={() => setAddressSheetOpen(true)}
            style={({ pressed }) => [styles.address, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Vaihda toimitusosoite"
          >
            <View style={styles.addressRow}>
              {/* Nuolen levyinen tyhjä tila: teksti tarkalleen keskellä. */}
              <View style={{ width: 14 }} />
              <Text style={styles.addressValue} numberOfLines={1}>
                {selected ? shortAddress(selected.full) : 'Lisää osoite'}
              </Text>
              <ChevronDown size={14} strokeWidth={2.6} color={colors.orange} />
            </View>
          </Pressable>

          <Pressable
            hitSlop={6}
            style={({ pressed }) => [styles.userButton, pressed && styles.pressed]}
            accessibilityRole="button"
            onPress={() => router.push('/tilaukset')}
            accessibilityLabel={hasActiveOrder ? 'Tilaukset ja ilmoitukset, tilaus käynnissä' : 'Tilaukset ja ilmoitukset'}
          >
            <Bell size={18} strokeWidth={2} color={colors.black} />
            {/* Oranssi pallo vain, kun on ilmoitettavaa: käynnissä oleva tilaus. */}
            {hasActiveOrder ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.orange} colors={[colors.orange]} />
        }
      >
        {/* Hakupalkki headerin ja bannerin välissä (käyttäjän pyyntö 16.11.2026):
            painallus avaa Haun kursori valmiiksi kentässä. Kategoriat poistettu
            (components/CategoryTiles.jsx talteen). */}
        <Pressable
          onPress={() => router.push({ pathname: '/haku', params: { focus: '1', t: String(Date.now()) } })}
          style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
          accessibilityRole="search"
          accessibilityLabel="Hae ravintoloita ja ruokia"
        >
          <Search size={19} strokeWidth={2.3} color={colors.black} />
          <Text style={styles.searchText}>Hae ravintoloita ja ruokia</Text>
        </Pressable>

        {/* Ketjulogot ylhäällä (palautettu käyttäjän pyynnöstä 16.11.2026). */}
        <View style={{ marginTop: 16 }}>
          <BrandStrip onSelect={searchFor} />
        </View>

        <View style={{ marginTop: 18 }}>
          <PromoCarousel />
        </View>

        {status === 'loading' ? (
          <HomeSkeleton />
        ) : status === 'error' ? (
          <Text style={styles.message}>Ravintoloiden haku epäonnistui. Vedä alas yrittääksesi uudelleen.</Text>
        ) : (
          <>
            {sections.map((section, index) => (
              <Fragment key={section.key}>
                {section.type === 'row' ? (
                  <HomeRow section={section} onOpen={openRestaurant} onSeeAll={() => searchFor(section.seeAll)} />
                ) : (
                  <DealPanel
                    section={section}
                    onOpen={openRestaurant}
                    onSeeAll={() => searchFor(section.type === 'deals' ? 'Tarjoukset' : 'Ilmainen kuljetus')}
                  />
                )}
                {/* Onnenpyörän banneri ensimmäisen rivin jälkeen: vie pyöräytyssivulle (16.11.2026). */}
                {index === 0 ? <WheelBanner onPress={() => router.push('/onnenpyora')} /> : null}
              </Fragment>
            ))}
            {/* Loppu: ravintolat päättyvät tähän (15.11.2026). */}
            {sections.length > 0 ? <FeedEnd onBrowse={() => searchFor('Kaikki ravintolat')} /> : null}
          </>
        )}
      </ScrollView>

      {/* Osoitteesta ensin lista: tallennetut osoitteet ja "Lisää uusi osoite" (16.11.2026). */}
      <AddressSheet
        visible={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
        addresses={addresses}
        selectedId={selected?.id ?? null}
        onSelect={(id) => {
          selectAddress(id)
          setAddressSheetOpen(false)
        }}
        onAdd={(picked) => {
          addAddress(picked)
          setAddressSheetOpen(false)
        }}
        onUpdate={updateAddress}
        onRemove={removeAddress}
        onEditHome={
          session
            ? () => {
                setAddressSheetOpen(false)
                router.push('/asetukset/osoite')
              }
            : null
        }
      />
    </View>
  )
}

// "Metsurintie 27, 70100 Kuopio" -> "Metsurintie 27, Kuopio" (kuten verkkosivulla).
function shortAddress(full) {
  const parts = String(full).split(',').map((part) => part.trim())
  if (parts.length < 2) return full
  const city = parts[parts.length - 1].replace(/^\d{5}\s*/, '')
  return `${parts[0]}, ${city}`
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  pressed: { opacity: 0.6 },
  siteHeader: {
    zIndex: 2,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e3',
  },
  siteHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray100,
    backgroundColor: colors.orange,
  },
  userButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.gray100,
  },
  address: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  addressValue: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14.75, color: colors.black },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    marginTop: 14,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.gray100,
  },
  searchBarPressed: { backgroundColor: colors.gray200 },
  searchText: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted },
  message: {
    marginTop: 40,
    paddingHorizontal: 32,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textMuted,
  },
})

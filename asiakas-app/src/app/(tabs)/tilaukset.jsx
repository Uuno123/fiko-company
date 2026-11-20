import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, SectionList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { ReceiptText } from 'lucide-react-native'
import { Button } from '../../components/ui'
import { SectionTitle } from '../../components/HomeSection'
import RestaurantLogo from '../../components/RestaurantLogo'
import { customerStatusLabel } from '../../../../frontend/src/lib/orderStatus'
import { cancelReasonShort } from '../../../../frontend/src/lib/cancelReasons'
import { formatPrice } from '../../../../frontend/src/lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { colors, fonts } from '../../theme'

const ACTIVE = ['awaiting_courier', 'pending', 'confirmed', 'preparing', 'ready']

// Tilaukset-välilehti: käynnissä olevat ylimpänä, sitten aiemmat. Kirjautumaton
// näkee kehotuksen kirjautua.
export default function OrdersScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const [orders, setOrders] = useState([])
  const [status, setStatus] = useState('loading')
  const [refreshing, setRefreshing] = useState(false)
  const sections = useMemo(() => groupOrders(orders), [orders])

  const load = useCallback(async () => {
    if (!session || !supabase) return
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, courier_status, courier_released_at, cancel_reason, delivery_method, total_cents, created_at, restaurants(name, image_url)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false })
    if (error) setStatus('error')
    else {
      setOrders(data ?? [])
      setStatus('ready')
    }
  }, [session])

  useEffect(() => {
    // Ensimmäinen haku seuraavassa mikrotehtävässä (ei synkronista tilapäivitystä efektissä).
    Promise.resolve().then(load)
  }, [load])
  // Lista päivittyy, kun välilehdelle palataan (esim. seurannasta).
  useFocusEffect(
    useCallback(() => {
      Promise.resolve().then(load)
    }, [load]),
  )

  if (!session) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ReceiptText size={36} strokeWidth={1.6} color={colors.black} />
        <Text style={styles.emptyTitle}>Tilauksesi näkyvät täällä</Text>
        <Text style={styles.emptyText}>Kirjaudu sisään nähdäksesi tilauksesi ja seurataksesi niitä.</Text>
        <View style={styles.emptyButton}>
          <Button title="Kirjaudu sisään" onPress={() => router.push('/kirjautuminen')} />
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* Välilehti: ei takaisin-nappia, otsikko yhdellä rivillä kuten Haussa (20.11.2026). */}
      <SectionTitle title="Tilaukset" style={styles.heading} />
      {status === 'loading' ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.black} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(order) => order.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true)
                await load()
                setRefreshing(false)
              }}
              tintColor={colors.black}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {status === 'error' ? 'Tilausten haku epäonnistui.' : 'Ei vielä tilauksia. Nälkä? Hoidetaan.'}
            </Text>
          }
          renderItem={({ item }) => <OrderRow order={item} onPress={() => router.push(`/tilaus/${item.id}`)} />}
        />
      )}
    </View>
  )
}

// Päivämääräväliotsikot (käyttäjän pyyntö 18.11.2026): käynnissä olevat
// ensin, sitten Tänään, Eilen, Tällä viikolla, Viime viikolla, Aiemmin tässä
// kuussa ja vanhemmat kuukausittain ("Lokakuu 2026"). Viikko alkaa maanantaina.
const MONTHS = ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu']
const DAY = 86400000

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function bucketOf(iso, now = new Date()) {
  const day = startOfDay(iso)
  const today = startOfDay(now)
  const weekStart = today - ((now.getDay() + 6) % 7) * DAY
  if (day >= today) return 'Tänään'
  if (day >= today - DAY) return 'Eilen'
  if (day >= weekStart) return 'Tällä viikolla'
  if (day >= weekStart - 7 * DAY) return 'Viime viikolla'
  const d = new Date(iso)
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return 'Aiemmin tässä kuussa'
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function groupOrders(orders) {
  const sections = []
  const active = orders.filter((o) => ACTIVE.includes(o.status))
  if (active.length) sections.push({ title: 'Käynnissä', data: active })
  for (const order of orders) {
    if (ACTIVE.includes(order.status)) continue
    const title = bucketOf(order.created_at)
    const last = sections[sections.length - 1]
    if (last && last.title === title) last.data.push(order)
    else sections.push({ title, data: [order] })
  }
  return sections
}

// Rivin aika: tänään ja eilen kellonaika, viikon sisällä viikonpäivä, muuten päivämäärä.
function whenLabel(iso) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
  const bucket = bucketOf(iso)
  if (bucket === 'Tänään') return `klo ${time}`
  if (bucket === 'Eilen') return `Eilen klo ${time}`
  if (bucket === 'Tällä viikolla' || bucket === 'Viime viikolla') {
    const weekday = d.toLocaleDateString('fi-FI', { weekday: 'long' })
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${d.getDate()}.${d.getMonth() + 1}.`
  }
  return d.toLocaleDateString('fi-FI')
}

// Rivi avaa tilauksen seurannan (app/tilaus/[id].jsx, 17.11.2026).
function OrderRow({ order, onPress }) {
  const active = ACTIVE.includes(order.status)
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      {/* Ketjun logo myös SVG:nä (puhelimen Image ei näytä SVG:tä, 18.11.2026). */}
      <RestaurantLogo
        name={order.restaurants?.name}
        imageUrl={order.restaurants?.image_url}
        size={48}
        style={styles.thumb}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {order.restaurants?.name ?? 'Ravintola'}
        </Text>
        <Text style={styles.rowMeta}>
          {whenLabel(order.created_at)} · {formatPrice(order.total_cents)}
        </Text>
        {/* Peruutuksen syy lyhyesti (18.11.2026), koko selitys seurannassa. */}
        {order.status === 'cancelled' && order.cancel_reason ? <Text style={styles.cancelReason}>{cancelReasonShort(order)}</Text> : null}
      </View>
      <Text style={[styles.status, active && styles.statusActive]}>
        {active ? customerStatusLabel(order) : order.status === 'cancelled' ? 'Peruttu' : 'Toimitettu'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  heading: { marginHorizontal: 16, marginBottom: 4, fontSize: 30, letterSpacing: -0.6 },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 2,
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: colors.textMuted,
  },
  emptyTitle: { marginTop: 16, fontFamily: fonts.heading, fontSize: 22, color: colors.black, textAlign: 'center' },
  emptyText: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: { alignSelf: 'stretch', marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  thumb: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ececea',
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbLetter: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.black },
  rowMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  status: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  cancelReason: { marginTop: 2, fontFamily: fonts.medium, fontSize: 12.5, color: colors.offerRed },
  statusActive: { color: colors.orange, fontFamily: fonts.semibold },
})

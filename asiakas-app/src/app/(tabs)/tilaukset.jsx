import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ReceiptText } from 'lucide-react-native'
import { Button } from '../../components/ui'
import TopBack, { TOP_BACK_SPACE } from '../../components/TopBack'
import { SectionTitle } from '../../components/HomeSection'
import { customerStatusLabel } from '../../../../frontend/src/lib/orderStatus'
import { formatPrice } from '../../../../frontend/src/lib/format'
import { restaurantThumb } from '../../../../frontend/src/lib/brandLogos'
import { imageUri } from '../../lib/restaurants'
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

  const load = useCallback(async () => {
    if (!session || !supabase) return
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, courier_status, delivery_method, total_cents, created_at, restaurants(name, image_url)')
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

  if (!session) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <TopBack />
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
    <View style={[styles.screen, { paddingTop: insets.top + TOP_BACK_SPACE }]}>
      <TopBack />
      <SectionTitle title="Tilaukset" style={styles.heading} />
      {status === 'loading' ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.black} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(order) => order.id}
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
          renderItem={({ item }) => <OrderRow order={item} />}
        />
      )}
    </View>
  )
}

function OrderRow({ order }) {
  const active = ACTIVE.includes(order.status)
  const thumb = restaurantThumb(order.restaurants?.name, order.restaurants?.image_url)
  const uri = imageUri(thumb?.src)
  return (
    <View style={styles.row}>
      <View style={styles.thumb}>
        {uri ? (
          <Image source={{ uri }} style={styles.thumbImage} resizeMode={thumb?.logo ? 'contain' : 'cover'} />
        ) : (
          <Text style={styles.thumbLetter}>{(order.restaurants?.name ?? 'R').charAt(0)}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName} numberOfLines={1}>
          {order.restaurants?.name ?? 'Ravintola'}
        </Text>
        <Text style={styles.rowMeta}>
          {new Date(order.created_at).toLocaleDateString('fi-FI')} · {formatPrice(order.total_cents)}
        </Text>
      </View>
      <Text style={[styles.status, active && styles.statusActive]}>
        {active ? customerStatusLabel(order) : order.status === 'cancelled' ? 'Peruttu' : 'Toimitettu'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  heading: { marginHorizontal: 16, marginTop: 6, marginBottom: 10, fontSize: 26 },
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
    backgroundColor: colors.gray100,
  },
  thumbImage: { width: '100%', height: '100%' },
  thumbLetter: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  rowName: { fontFamily: fonts.semibold, fontSize: 15.5, color: colors.black },
  rowMeta: { marginTop: 2, fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  status: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted },
  statusActive: { color: colors.orange, fontFamily: fonts.semibold },
})

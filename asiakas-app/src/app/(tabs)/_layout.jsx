import { Tabs } from 'expo-router'
import { House, ReceiptText, Search, ShoppingCart } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts } from '../../theme'

// Perinteinen alapalkki koko leveydeltä näytön alareunassa (käyttäjän pyyntö
// 16.11.2026): Koti, Haku, Ostoskori ja Tilaukset. Profiili aukeaa Kodin
// käyttäjäikonista, joten se piilotetaan palkista tabBarButtonilla - ei
// href: null, koska Expo Router ohjaa piilotetun välilehden takaisin Kotiin.
const hidden = { tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.gray200,
          backgroundColor: colors.surface,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="ravintolat"
        options={{ title: 'Koti', tabBarIcon: ({ color }) => <House size={23} strokeWidth={2} color={color} /> }}
      />
      <Tabs.Screen
        name="haku"
        options={{ title: 'Haku', tabBarIcon: ({ color }) => <Search size={23} strokeWidth={2} color={color} /> }}
      />
      <Tabs.Screen
        name="ostoskori"
        options={{
          title: 'Ostoskori',
          tabBarIcon: ({ color }) => <ShoppingCart size={23} strokeWidth={2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tilaukset"
        options={{
          title: 'Tilaukset',
          tabBarIcon: ({ color }) => <ReceiptText size={23} strokeWidth={2} color={color} />,
        }}
      />
      <Tabs.Screen name="tili" options={{ title: 'Profiili', ...hidden }} />
    </Tabs>
  )
}

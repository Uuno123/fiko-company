import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Timer } from 'lucide-react-native'
import { Button, Card, ListRow, Screen, SectionTitle } from '../components/ui'
import { useCourier } from '../lib/courier'
import { formatMinutes, formatTime } from '../lib/format'
import { colors, fonts } from '../theme'

const RELATIVE_OPTIONS = [30, 60, 120, 180]
// Tavalliset vuoron päättymisajat - vain ne, joihin on vielä yli vartti.
const CLOCK_HOURS = [14, 16, 18, 20, 22]

function inMinutes(minutes) {
  return new Date(Date.now() + minutes * 60000)
}

function todayAt(hour) {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return date
}

// Ajastettu offline: valitse milloin sovellus vie sinut automaattisesti
// offline-tilaan (lib/courier.js hoitaa ajastuksen).
export default function ScheduledOfflineScreen() {
  const router = useRouter()
  const { online, offlineAt, scheduleOffline } = useCourier()
  const clockOptions = CLOCK_HOURS.map(todayAt).filter((date) => date.getTime() - Date.now() > 15 * 60000)

  const choose = (date) => {
    scheduleOffline(date)
    router.back()
  }

  return (
    <Screen title="Ajastettu offline">
      <Text style={styles.intro}>
        Valitse milloin sovellus vie sinut automaattisesti offline-tilaan, esimerkiksi vuoron loppuessa. Voit perua
        ajastuksen milloin tahansa.
      </Text>

      {offlineAt ? (
        <Card style={styles.current}>
          <View style={styles.currentIcon}>
            <Timer size={22} strokeWidth={2} color={colors.orange} />
          </View>
          <View style={styles.currentText}>
            <Text style={styles.currentTitle}>Offline klo {formatTime(offlineAt)}</Text>
            <Text style={styles.currentDetail}>
              {formatMinutes(Math.max(1, Math.round((offlineAt.getTime() - Date.now()) / 60000)))} päästä
            </Text>
          </View>
        </Card>
      ) : null}
      {offlineAt ? (
        <View style={styles.cancel}>
          <Button title="Peru ajastus" variant="secondary" onPress={() => scheduleOffline(null)} />
        </View>
      ) : null}

      {!online ? (
        <Text style={styles.note}>Olet nyt offline. Ajastus koskee seuraavaa kertaa, kun menet online-tilaan.</Text>
      ) : null}

      <SectionTitle>Ajan päästä</SectionTitle>
      <Card>
        {RELATIVE_OPTIONS.map((minutes, index) => (
          <ListRow
            key={minutes}
            label={`${formatMinutes(minutes)} päästä`}
            value={`klo ${formatTime(inMinutes(minutes))}`}
            onPress={() => choose(inMinutes(minutes))}
            last={index === RELATIVE_OPTIONS.length - 1}
          />
        ))}
      </Card>

      {clockOptions.length ? (
        <>
          <SectionTitle>Kellonaikaan</SectionTitle>
          <Card>
            {clockOptions.map((date, index) => (
              <ListRow
                key={date.getTime()}
                label={`Tänään klo ${formatTime(date)}`}
                onPress={() => choose(date)}
                last={index === clockOptions.length - 1}
              />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: {
    marginTop: 4,
    marginHorizontal: 4,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  current: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 16,
    padding: 16,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
  },
  currentIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  currentText: {
    flex: 1,
  },
  currentTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.black,
  },
  currentDetail: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  cancel: {
    marginTop: 10,
  },
  note: {
    marginTop: 16,
    marginHorizontal: 4,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
})

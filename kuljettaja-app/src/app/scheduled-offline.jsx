import { useRouter } from 'expo-router'
import { Timer } from 'lucide-react-native'
import { Card, ListRow, Screen } from '../components/ui'
import { useCourier } from '../lib/courier'
import { formatMinutes, formatTime } from '../lib/format'

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
  const { offlineAt, scheduleOffline } = useCourier()
  const clockOptions = CLOCK_HOURS.map(todayAt).filter((date) => date.getTime() - Date.now() > 15 * 60000)

  const choose = (date) => {
    scheduleOffline(date)
    router.back()
  }

  return (
    <Screen title="Ajastettu offline">
      {offlineAt ? (
        <>
          <Card title="Ajastus">
            <ListRow
              icon={Timer}
              label={`Offline klo ${formatTime(offlineAt)}`}
              value={`${formatMinutes(Math.max(1, Math.round((offlineAt.getTime() - Date.now()) / 60000)))} päästä`}
            />
            <ListRow label="Peru ajastus" onPress={() => scheduleOffline(null)} right={null} danger />
          </Card>
        </>
      ) : null}

      <Card title="Ajan päästä">
        {RELATIVE_OPTIONS.map((minutes) => (
          <ListRow
            key={minutes}
            label={`${formatMinutes(minutes)} päästä`}
            value={`klo ${formatTime(inMinutes(minutes))}`}
            onPress={() => choose(inMinutes(minutes))}
          />
        ))}
      </Card>

      {clockOptions.length ? (
        <>
          <Card title="Kellonaikaan">
            {clockOptions.map((date) => (
              <ListRow key={date.getTime()} label={`Tänään klo ${formatTime(date)}`} onPress={() => choose(date)} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

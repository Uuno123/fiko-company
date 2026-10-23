import { useRouter } from 'expo-router'
import { Timer } from 'lucide-react-native'
import { Card, ListRow, Screen } from '../components/ui'
import { useCourier } from '../lib/courier'
import { formatMinutes, formatTime } from '../lib/format'
import { useT } from '../lib/i18n'

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
  const t = useT()
  const { offlineAt, scheduleOffline } = useCourier()
  const clockOptions = CLOCK_HOURS.map(todayAt).filter((date) => date.getTime() - Date.now() > 15 * 60000)

  const choose = (date) => {
    scheduleOffline(date)
    router.back()
  }

  return (
    <Screen title={t('home.scheduledOffline')}>
      {offlineAt ? (
        <>
          <Card title={t('scheduled.current')}>
            <ListRow
              icon={Timer}
              label={t('scheduled.offlineAt', { time: formatTime(offlineAt) })}
              value={t('scheduled.in', { duration: formatMinutes(Math.max(1, Math.round((offlineAt.getTime() - Date.now()) / 60000))) })}
            />
            <ListRow label={t('scheduled.cancel')} onPress={() => scheduleOffline(null)} right={null} danger />
          </Card>
        </>
      ) : null}

      <Card title={t('scheduled.after')}>
        {RELATIVE_OPTIONS.map((minutes) => (
          <ListRow
            key={minutes}
            label={t('scheduled.in', { duration: formatMinutes(minutes) })}
            value={t('home.atTime', { time: formatTime(inMinutes(minutes)) })}
            onPress={() => choose(inMinutes(minutes))}
          />
        ))}
      </Card>

      {clockOptions.length ? (
        <>
          <Card title={t('scheduled.atClock')}>
            {clockOptions.map((date) => (
              <ListRow key={date.getTime()} label={t('scheduled.todayAt', { time: formatTime(date) })} onPress={() => choose(date)} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  FileText,
  Megaphone,
  MonitorSmartphone,
  PackageX,
  Printer,
  Store,
} from 'lucide-react'
import { orderStatusLabel } from '../../lib/orderStatus.js'
import { NEWS } from '../demo.js'
import { useDashboard } from '../context.js'
import { useMenu } from '../hooks.js'
import { BarChart, Badge, Card, Delta, PageHeader, Segmented, Stat } from '../ui.jsx'
import { DAY_MS, daysAgo, formatPrice, inRange, percentChange, startOfDay, sumSales } from '../utils.js'
import { STATUS_TONE } from '../OrderDetail.jsx'

const SALES_RANGES = [
  { value: 'today', label: 'Tänään' },
  { value: 'yesterday', label: 'Eilen' },
  { value: 'week', label: '7 päivää' },
]

const WEEKDAY_SHORT = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La']

function hourlyBuckets(orders, dayStart) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }))
  for (const order of orders) {
    const t = new Date(order.created_at)
    if (t >= dayStart && t < new Date(dayStart.getTime() + DAY_MS)) buckets[t.getHours()].value += sumSales([order])
  }
  // Näytetään tavallinen aukioloikkuna (10-22) tai laajempi, jos tilauksia on sen ulkopuolella.
  const withSales = buckets.filter((b) => b.value > 0).map((b) => b.hour)
  const from = Math.min(10, ...withSales)
  const to = Math.max(22, ...withSales)
  return buckets.slice(from, to + 1).map((b) => ({ key: b.hour, label: `${b.hour}`, value: b.value }))
}

function SalesOverview({ orders }) {
  const [range, setRange] = useState('today')
  const valid = orders.filter((o) => o.status !== 'cancelled')
  const today = startOfDay()

  const { total, previous, data } = useMemo(() => {
    if (range === 'week') {
      const from = daysAgo(6)
      const days = Array.from({ length: 7 }, (_, i) => {
        const start = new Date(from.getTime() + i * DAY_MS)
        const value = sumSales(valid.filter((o) => inRange(o, start, new Date(start.getTime() + DAY_MS))))
        return { key: i, label: i === 6 ? 'Tänään' : WEEKDAY_SHORT[start.getDay()], value, highlight: i === 6 }
      })
      const prevFrom = daysAgo(13)
      return {
        total: days.reduce((s, d) => s + d.value, 0),
        previous: sumSales(valid.filter((o) => inRange(o, prevFrom, from))),
        data: days,
      }
    }
    const dayStart = range === 'today' ? today : daysAgo(1)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const compareStart = new Date(dayStart.getTime() - 7 * DAY_MS)
    // Tänään on vielä kesken, joten viikon takaista verrataan samaan kellonaikaan asti.
    const elapsed = range === 'today' ? Date.now() - dayStart.getTime() : DAY_MS
    return {
      total: sumSales(valid.filter((o) => inRange(o, dayStart, dayEnd))),
      previous: sumSales(valid.filter((o) => inRange(o, compareStart, new Date(compareStart.getTime() + elapsed)))),
      data: hourlyBuckets(valid, dayStart),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, range])

  return (
    <Card
      title="Myyntikatsaus"
      className="pd-home__sales"
      action={<Segmented size="sm" label="Aikaväli" value={range} onChange={setRange} options={SALES_RANGES} />}
    >
      <div className="pd-sales-head">
        <strong>{formatPrice(total)}</strong>
        <Delta value={percentChange(total, previous)} suffix={range === 'week' ? 'edelliseen viikkoon' : 'viikon takaiseen'} />
      </div>
      <BarChart data={data} formatValue={formatPrice} height={220} />
    </Card>
  )
}

function useRecommendations(restaurant, items, status) {
  return useMemo(() => {
    if (status !== 'ready') return []
    const list = []
    const noImage = items.filter((i) => !i.image_url)
    const noDescription = items.filter((i) => !i.description?.trim())
    const soldOut = items.filter((i) => i.is_available === false)
    if (!restaurant.image_url) {
      list.push({ id: 'cover', icon: Store, title: 'Lisää ravintolalle kansikuva', text: 'Kuva näkyy asiakkaille etusivulla ja haussa.', to: 'asetukset' })
    }
    if (noImage.length > 0) {
      list.push({ id: 'img', icon: Camera, title: `Lisää kuva ${noImage.length} tuotteelle`, text: 'Kuvalliset tuotteet myyvät selvästi useammin.', to: 'ruokalista' })
    }
    if (noDescription.length > 0) {
      list.push({ id: 'desc', icon: FileText, title: `Kirjoita kuvaus ${noDescription.length} tuotteelle`, text: 'Kerro ainesosat ja maku - asiakas päättää nopeammin.', to: 'ruokalista' })
    }
    if (soldOut.length > 0) {
      list.push({ id: 'soldout', icon: PackageX, title: `${soldOut.length} tuotetta merkitty loppuneeksi`, text: 'Palauta ne valikoimaan kun niitä taas on.', to: 'ruokalista' })
    }
    list.push({ id: 'campaign', icon: Megaphone, title: 'Kokeile kampanjaa hiljaisille tunneille', text: 'Esim. -20 % arki-iltaisin tuo lisää tilauksia.', to: 'markkinointi' })
    return list
  }, [restaurant.image_url, items, status])
}

export default function HomeView() {
  const { restaurant, ordersState, pendingCount, basePath, storeStatus } = useDashboard()
  const { orders } = ordersState
  const menu = useMenu(restaurant.id)
  const recommendations = useRecommendations(restaurant, menu.items, menu.status)

  const today = startOfDay()
  const yesterday = daysAgo(1)
  const todays = orders.filter((o) => inRange(o, today, new Date(today.getTime() + DAY_MS)))
  // Eilistä verrataan samaan kellonaikaan asti - muuten kesken oleva päivä näyttäisi aina laskua.
  const yesterdays = orders.filter((o) => inRange(o, yesterday, new Date(Date.now() - DAY_MS)))
  const completedToday = todays.filter((o) => o.status === 'completed').length
  const cancelledToday = todays.filter((o) => o.status === 'cancelled').length
  const salesToday = sumSales(todays.filter((o) => o.status !== 'cancelled'))
  const salesYesterday = sumSales(yesterdays.filter((o) => o.status !== 'cancelled'))
  const activeOrders = orders.filter((o) => ['confirmed', 'preparing', 'ready'].includes(o.status))
  const rejectionRate = todays.length > 0 ? Math.round((cancelledToday / todays.length) * 100) : 0

  const statusLabel = { open: 'Auki', paused: 'Tauolla', closed: 'Suljettu' }[storeStatus.state]
  const statusTone = { open: 'success', paused: 'warning', closed: 'neutral' }[storeStatus.state]
  const greetingDate = new Date().toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="pd-view">
      <PageHeader title={`Tervetuloa, ${restaurant.name}`} description={greetingDate.charAt(0).toUpperCase() + greetingDate.slice(1)} />

      {pendingCount > 0 && (
        <Link to={`${basePath}/tilaukset`} className="pd-alert-banner">
          <BellRing size={20} aria-hidden="true" />
          <strong>
            {pendingCount} {pendingCount === 1 ? 'uusi tilaus odottaa' : 'uutta tilausta odottaa'} hyväksyntää
          </strong>
          <span>Avaa tilaukset</span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}

      <div className="pd-home">
        <div className="pd-home__col">
          <Card className="pd-store-card">
            <div className="pd-store-card__head">
              <div>
                <h2>{restaurant.name}</h2>
                <p>
                  {restaurant.address
                    ? restaurant.city && !restaurant.address.includes(restaurant.city)
                      ? `${restaurant.address}, ${restaurant.city}`
                      : restaurant.address
                    : restaurant.city || restaurant.category}
                </p>
              </div>
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
            <div className="pd-stats-row">
              <Stat label="Valmiit tilaukset tänään" value={completedToday} hint={`${activeOrders.length} työn alla`} />
              <Stat label="Hylätyt tänään" value={cancelledToday} hint={`${rejectionRate} % tilauksista`} />
              <Stat
                label="Myynti tänään"
                value={formatPrice(salesToday)}
                delta={percentChange(salesToday, salesYesterday)}
                deltaSuffix="eiliseen samaan aikaan"
              />
            </div>
          </Card>

          <Card title="Suositukset" subtitle="Nopeita parannuksia ruokalistan ja datan perusteella">
            <ul className="pd-reco">
              {menu.status === 'loading' && <li className="pd-skeleton pd-skeleton--row" />}
              {recommendations.map((reco) => {
                const Icon = reco.icon
                return (
                  <li key={reco.id}>
                    <Link to={`${basePath}/${reco.to}`} className="pd-reco__item">
                      <span className="pd-reco__icon">
                        <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="pd-reco__text">
                        <strong>{reco.title}</strong>
                        <span>{reco.text}</span>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
              {menu.status === 'ready' && recommendations.length === 0 && (
                <li className="pd-reco__done">
                  <CheckCircle2 size={18} aria-hidden="true" /> Kaikki kunnossa - hyvää työtä!
                </li>
              )}
            </ul>
          </Card>

          <Card title="Tutustu työkaluihin">
            <div className="pd-tools">
              <Link to={`${basePath}/asetukset`} className="pd-tool">
                <MonitorSmartphone size={22} strokeWidth={1.5} aria-hidden="true" />
                <strong>Tilauslaite</strong>
                <span>Näyttö pysyy päällä ja äänimerkki soi uusista tilauksista.</span>
              </Link>
              <Link to={`${basePath}/tilaukset`} className="pd-tool">
                <Printer size={22} strokeWidth={1.5} aria-hidden="true" />
                <strong>Tilauslaput</strong>
                <span>Tulosta tilaus keittiöön suoraan tilauksen tiedoista.</span>
              </Link>
              <Link to={`${basePath}/markkinointi`} className="pd-tool">
                <Megaphone size={22} strokeWidth={1.5} aria-hidden="true" />
                <strong>Kampanjat</strong>
                <span>Tarjoukset ja ilmainen kuljetus hiljaisille hetkille.</span>
              </Link>
            </div>
          </Card>
        </div>

        <div className="pd-home__col">
          <SalesOverview orders={orders} />

          <Card title="Viimeisimmät tilaukset" action={<Link className="pd-link" to={`${basePath}/historia`}>Kaikki</Link>}>
            <ul className="pd-recent">
              {orders.slice(0, 5).map((order) => (
                <li key={order.id}>
                  <span className="pd-recent__number">{order.order_number}</span>
                  <span className="pd-recent__name">{order.delivery_name || 'Asiakas'}</span>
                  <Badge tone={STATUS_TONE[order.status]}>{orderStatusLabel(order.status, order.delivery_method)}</Badge>
                  <span className="pd-recent__price">{formatPrice(sumSales([order]))}</span>
                </li>
              ))}
              {orders.length === 0 && <li className="pd-muted">Ei vielä tilauksia.</li>}
            </ul>
          </Card>

          <Card title="Uutiset ja vinkit">
            <ul className="pd-news">
              {NEWS.map((item) => (
                <li key={item.id}>
                  <Badge tone="neutral">{item.tag}</Badge>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

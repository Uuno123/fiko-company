import { useMemo, useState } from 'react'
import { useDashboard } from '../context.js'
import { BarChart, Card, PageHeader, Segmented, Stat } from '../ui.jsx'
import { DAY_MS, daysAgo, formatPrice, inRange, lineTotalCents, percentChange, sumSales } from '../utils.js'

const PERIODS = [
  { value: 7, label: '7 päivää' },
  { value: 30, label: '30 päivää' },
  { value: 90, label: '90 päivää' },
]

const HEAT_DAYS = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']
const HEAT_HOURS = Array.from({ length: 14 }, (_, i) => i + 10)

function periodOrders(orders, days, offset = 0) {
  const to = new Date(daysAgo(offset - 1).getTime())
  const from = daysAgo(days - 1 + offset)
  return orders.filter((o) => inRange(o, from, to))
}

export default function StatsView() {
  const { ordersState } = useDashboard()
  const { orders } = ordersState
  const [days, setDays] = useState(30)

  const stats = useMemo(() => {
    const current = periodOrders(orders, days)
    const previous = periodOrders(orders, days, days)
    const valid = current.filter((o) => o.status !== 'cancelled')
    const prevValid = previous.filter((o) => o.status !== 'cancelled')
    const sales = sumSales(valid)
    const prevSales = sumSales(prevValid)
    const avg = valid.length ? Math.round(sales / valid.length) : 0
    const prevAvg = prevValid.length ? Math.round(prevSales / prevValid.length) : 0
    const cancelRate = current.length ? Math.round(((current.length - valid.length) / current.length) * 100) : 0
    const prevCancelRate = previous.length ? Math.round(((previous.length - prevValid.length) / previous.length) * 100) : 0

    // Päivittäin 7/30 pv, viikoittain 90 pv (13 pylvästä on luettavampi kuin 90).
    const bucketDays = days === 90 ? 7 : 1
    const bucketCount = Math.ceil(days / bucketDays)
    const start = daysAgo(days - 1)
    const chart = Array.from({ length: bucketCount }, (_, i) => {
      const from = new Date(start.getTime() + i * bucketDays * DAY_MS)
      const to = new Date(from.getTime() + bucketDays * DAY_MS)
      const label =
        bucketDays === 7 ? `vk ${i + 1}` : days === 7 ? from.toLocaleDateString('fi-FI', { weekday: 'short' }) : `${from.getDate()}.${from.getMonth() + 1}`
      return { key: i, label, value: sumSales(valid.filter((o) => inRange(o, from, to))), highlight: i === bucketCount - 1 }
    })

    const products = new Map()
    for (const order of valid) {
      for (const line of order.order_items ?? []) {
        const entry = products.get(line.name) ?? { name: line.name, qty: 0, sales: 0 }
        entry.qty += line.quantity
        entry.sales += lineTotalCents(line)
        products.set(line.name, entry)
      }
    }
    const topProducts = [...products.values()].sort((a, b) => b.qty - a.qty).slice(0, 8)

    const heat = HEAT_DAYS.map(() => HEAT_HOURS.map(() => 0))
    for (const order of valid) {
      const t = new Date(order.created_at)
      const day = (t.getDay() + 6) % 7
      const hourIndex = HEAT_HOURS.indexOf(t.getHours())
      if (hourIndex >= 0) heat[day][hourIndex] += 1
    }
    const heatMax = Math.max(1, ...heat.flat())

    const delivery = valid.filter((o) => o.delivery_method === 'delivery').length
    const customers = new Map()
    for (const order of valid) {
      if (order.customer_id) customers.set(order.customer_id, (customers.get(order.customer_id) ?? 0) + 1)
    }
    const returning = [...customers.values()].filter((n) => n > 1).length

    const promised = valid.filter((o) => o.estimated_ready_at)
    const avgPromised = promised.length
      ? Math.round(
          promised.reduce((s, o) => s + (new Date(o.estimated_ready_at) - new Date(o.created_at)) / 60_000, 0) / promised.length,
        )
      : null

    return {
      current,
      valid,
      sales,
      prevSales,
      avg,
      prevAvg,
      cancelRate,
      prevCancelRate,
      prevCount: prevValid.length,
      chart,
      topProducts,
      heat,
      heatMax,
      delivery,
      customers: customers.size,
      returning,
      avgPromised,
    }
  }, [orders, days])

  const maxQty = Math.max(1, ...stats.topProducts.map((p) => p.qty))
  const deliveryShare = stats.valid.length ? Math.round((stats.delivery / stats.valid.length) * 100) : 0

  return (
    <div className="pd-view">
      <PageHeader
        title="Tilastot"
        description="Myynti, suosituimmat tuotteet ja kiireisimmät ajat."
        actions={<Segmented value={days} onChange={setDays} options={PERIODS} label="Aikaväli" />}
      />

      <div className="pd-summary">
        <Stat label="Myynti (ravintolalle)" value={formatPrice(stats.sales)} delta={percentChange(stats.sales, stats.prevSales)} />
        <Stat label="Tilaukset" value={stats.valid.length} delta={percentChange(stats.valid.length, stats.prevCount)} />
        <Stat label="Keskiostos" value={formatPrice(stats.avg)} delta={percentChange(stats.avg, stats.prevAvg)} />
        <Stat
          label="Hylätyt ja perutut"
          value={`${stats.cancelRate} %`}
          delta={stats.prevCancelRate || stats.cancelRate ? stats.cancelRate - stats.prevCancelRate : 0}
          deltaInvert
        />
      </div>

      <Card title="Myynti" subtitle={days === 90 ? 'Viikoittain' : 'Päivittäin'}>
        <BarChart data={stats.chart} formatValue={formatPrice} height={240} />
      </Card>

      <div className="pd-two-col">
        <Card title="Myydyimmät tuotteet" subtitle="Kappalemäärän mukaan, hinnat ennen alennuksia">
          {stats.topProducts.length === 0 ? (
            <p className="pd-muted">Ei myyntiä valitulla aikavälillä.</p>
          ) : (
            <ol className="pd-top">
              {stats.topProducts.map((p, i) => (
                <li key={p.name}>
                  <span className="pd-top__rank">{i + 1}</span>
                  <span className="pd-top__name">
                    <strong>{p.name}</strong>
                    <span className="pd-top__bar">
                      <span style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                    </span>
                  </span>
                  <span className="pd-top__qty">{p.qty} kpl</span>
                  <span className="pd-top__sales">{formatPrice(p.sales)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Kiireisimmät ajat" subtitle="Tilausmäärät viikonpäivän ja kellonajan mukaan">
          <div className="pd-heat" role="img" aria-label="Tilausmäärät viikonpäivittäin ja tunneittain">
            <span />
            {HEAT_HOURS.map((h) => (
              <span key={h} className="pd-heat__hour">
                {h % 2 === 0 ? h : ''}
              </span>
            ))}
            {HEAT_DAYS.map((day, d) => (
              <HeatRow key={day} day={day} values={stats.heat[d]} max={stats.heatMax} />
            ))}
          </div>
          <div className="pd-heat__legend">
            <span>Vähän</span>
            <span className="pd-heat__scale" aria-hidden="true" />
            <span>Paljon</span>
          </div>
        </Card>
      </div>

      <div className="pd-summary">
        <Stat label="Kotiinkuljetus" value={`${deliveryShare} %`} hint={`Nouto ${stats.valid.length ? 100 - deliveryShare : 0} %`} />
        <Stat label="Asiakkaita" value={stats.customers} hint={`${stats.returning} tilasi useammin kuin kerran`} />
        <Stat
          label="Palaavat asiakkaat"
          value={`${stats.customers ? Math.round((stats.returning / stats.customers) * 100) : 0} %`}
        />
        <Stat label="Luvattu valmistusaika" value={stats.avgPromised != null ? `${stats.avgPromised} min` : '–'} hint="Keskimäärin hyväksyttäessä" />
      </div>
    </div>
  )
}

function HeatRow({ day, values, max }) {
  return (
    <>
      <span className="pd-heat__day">{day}</span>
      {values.map((value, i) => (
        <span
          key={i}
          className="pd-heat__cell"
          title={`${day} klo ${HEAT_HOURS[i]}: ${value} tilausta`}
          style={{ '--heat': value === 0 ? 0 : 0.15 + (value / max) * 0.85 }}
        />
      ))}
    </>
  )
}

import { addDays, formatShortDate, startOfDay, weekdayShort } from './format'
import { tr } from './i18n'

// Kuljettajan tilitys (kumppanisivu: "Ansiot maksetaan kahden viikon välein").
// Jakso on kaksi viikkoa maanantaista sunnuntaihin, ja palkkio maksetaan
// jakson jälkeisenä perjantaina. Maksettu keikka tunnistetaan
// orders.courier_paid_at-kentästä (migraatio 0064).

export const PAYOUT_PERIOD_DAYS = 14
// Ensimmäinen jakso alkaa maanantaina 19.10.2026 (paikallista aikaa).
const FIRST_PERIOD_START = new Date(2026, 9, 19)
// Jakso päättyy sunnuntaina, maksu perjantaina: 5 päivää jakson viimeisestä päivästä.
const PAY_DAYS_AFTER_PERIOD = 5

// { key, start, end (viimeinen päivä), payDate } jakson numerolla (0 = ensimmäinen).
export function payoutPeriodByKey(key) {
  const start = addDays(FIRST_PERIOD_START, key * PAYOUT_PERIOD_DAYS)
  const end = addDays(start, PAYOUT_PERIOD_DAYS - 1)
  return { key, start, end, payDate: addDays(end, PAY_DAYS_AFTER_PERIOD) }
}

// Jakso, johon päivä kuuluu.
export function payoutPeriod(date) {
  const day = startOfDay(date)
  // Pyöristys: kesäajan vaihtuminen tekee päivästä 23 tai 25 tuntia.
  const days = Math.round((day - FIRST_PERIOD_START) / 86400000)
  return payoutPeriodByKey(Math.floor(days / PAYOUT_PERIOD_DAYS))
}

// Yhden jakson tilitys (Ansioiden alalaatikko valitulle viikolle):
// { period, isCurrent, paidTotal, unpaidTotal, paidAt (viimeisin maksu) }.
export function periodPayout(gigs, date, now = new Date()) {
  const period = payoutPeriod(date)
  let paidTotal = 0
  let unpaidTotal = 0
  let paidAt = null
  for (const gig of gigs) {
    if (payoutPeriod(gig.deliveredAt).key !== period.key) continue
    if (gig.paidAt) {
      paidTotal += gig.pay.total
      if (!paidAt || gig.paidAt > paidAt) paidAt = gig.paidAt
    } else {
      unpaidTotal += gig.pay.total
    }
  }
  return { period, isCurrent: period.key === payoutPeriod(now).key, paidTotal, unpaidTotal, paidAt }
}

// Maksamattomat keikat jaksoittain, vanhin ensin:
// [{ period, total (senttiä), count }]. Nykyinen jakso on mukana aina
// (myös ilman keikkoja), jotta seuraava maksupäivä näkyy.
export function unpaidByPeriod(gigs, now = new Date()) {
  const current = payoutPeriod(now)
  const periods = new Map([[current.key, { period: current, total: 0, count: 0 }]])
  for (const gig of gigs) {
    if (gig.paidAt) continue
    const period = payoutPeriod(gig.deliveredAt)
    const entry = periods.get(period.key) ?? { period, total: 0, count: 0 }
    entry.total += gig.pay.total
    entry.count += 1
    periods.set(period.key, entry)
  }
  return [...periods.values()].sort((a, b) => a.period.key - b.period.key)
}

// Tilitysraportit (Tilitykset-näkymä), uusin ensin. Nykyinen jakso on aina
// mukana, muut vain jos niillä on keikkoja. status:
//   open     - jakso on kesken, keikat kertyvät vielä
//   upcoming - jakso päättyi, maksupäivä on tulossa
//   awaiting - maksupäivä meni, osa tai kaikki on vielä maksamatta
//   paid     - kaikki jakson keikat on maksettu tilille
export function payoutStatements(gigs, now = new Date()) {
  const current = payoutPeriod(now)
  const byKey = new Map([[current.key, { period: current, gigs: [] }]])
  for (const gig of gigs) {
    const period = payoutPeriod(gig.deliveredAt)
    const entry = byKey.get(period.key) ?? { period, gigs: [] }
    entry.gigs.push(gig)
    byKey.set(period.key, entry)
  }
  const today = startOfDay(now)
  return [...byKey.values()]
    .sort((a, b) => b.period.key - a.period.key)
    .map(({ period, gigs: periodGigs }) => {
      let paidTotal = 0
      let unpaidTotal = 0
      let paidAt = null
      for (const gig of periodGigs) {
        if (gig.paidAt) {
          paidTotal += gig.pay.total
          if (!paidAt || gig.paidAt > paidAt) paidAt = gig.paidAt
        } else {
          unpaidTotal += gig.pay.total
        }
      }
      let status = 'paid'
      if (period.key === current.key) status = 'open'
      else if (unpaidTotal > 0) status = period.payDate >= today ? 'upcoming' : 'awaiting'
      return {
        period,
        gigs: [...periodGigs].sort((a, b) => a.deliveredAt - b.deliveredAt),
        total: paidTotal + unpaidTotal,
        paidTotal,
        unpaidTotal,
        paidAt,
        status,
      }
    })
}

// Yhden jakson raportti; jakso ilman keikkoja näytetään tyhjänä.
export function payoutStatementFor(gigs, key, now = new Date()) {
  const found = payoutStatements(gigs, now).find((statement) => statement.period.key === key)
  if (found) return found
  return {
    period: payoutPeriodByKey(key),
    gigs: [],
    total: 0,
    paidTotal: 0,
    unpaidTotal: 0,
    paidAt: null,
    status: 'paid',
  }
}

// "19.10.–1.11.2026"
export function formatPeriodRange(period) {
  const { start, end } = period
  const sameYear = start.getFullYear() === end.getFullYear()
  return `${formatShortDate(start)}${sameYear ? '' : start.getFullYear()}–${formatShortDate(end)}${end.getFullYear()}`
}

// Raportin tila pillerinä: { tone (StatusPill), text }.
export function statementStatus(statement) {
  const { payDate } = statement.period
  const payText = `${weekdayShort(payDate)} ${formatShortDate(payDate)}`
  if (statement.status === 'open') return { tone: 'neutral', text: tr('payouts.status.open', { date: payText }) }
  if (statement.total === 0) return { tone: 'neutral', text: tr('payouts.status.nothing') }
  if (statement.status === 'upcoming')
    return { tone: 'pending', text: tr('payouts.status.upcoming', { date: payText }) }
  if (statement.status === 'awaiting') return { tone: 'danger', text: tr('payouts.status.awaiting') }
  return { tone: 'success', text: tr('payouts.status.paid', { date: formatShortDate(statement.paidAt ?? payDate) }) }
}

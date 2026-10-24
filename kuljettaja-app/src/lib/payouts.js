import { addDays, startOfDay } from './format'

// Kuljettajan tilitys (kumppanisivu: "Ansiot maksetaan kahden viikon välein").
// Jakso on kaksi viikkoa maanantaista sunnuntaihin, ja palkkio maksetaan
// jakson jälkeisenä perjantaina. Maksettu keikka tunnistetaan
// orders.courier_paid_at-kentästä (migraatio 0064).

export const PAYOUT_PERIOD_DAYS = 14
// Ensimmäinen jakso alkaa maanantaina 19.10.2026 (paikallista aikaa).
const FIRST_PERIOD_START = new Date(2026, 9, 19)
// Jakso päättyy sunnuntaina, maksu perjantaina: 5 päivää jakson viimeisestä päivästä.
const PAY_DAYS_AFTER_PERIOD = 5

// { start, end (viimeinen päivä), payDate } jaksolle, johon päivä kuuluu.
export function payoutPeriod(date) {
  const day = startOfDay(date)
  // Pyöristys: kesäajan vaihtuminen tekee päivästä 23 tai 25 tuntia.
  const days = Math.round((day - FIRST_PERIOD_START) / 86400000)
  const index = Math.floor(days / PAYOUT_PERIOD_DAYS)
  const start = addDays(FIRST_PERIOD_START, index * PAYOUT_PERIOD_DAYS)
  const end = addDays(start, PAYOUT_PERIOD_DAYS - 1)
  return { key: index, start, end, payDate: addDays(end, PAY_DAYS_AFTER_PERIOD) }
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

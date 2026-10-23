import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { maskIban, useChangeRequests } from '../changeRequests.js'
import { useDashboard } from '../context.js'
import { Card, PageHeader, Segmented, Stat } from '../ui.jsx'
import { COMMITMENT_MONTHS, EXTRA_DELIVERY_CENTS, findPlan, monthlyPlanCharges, planOrdersLabel } from '../../lib/partnerPlans.js'
import { formatDate, formatPrice, restaurantPlan, restaurantShareCents, sumSales } from '../utils.js'
import ChangeRequestDrawer from './settings/ChangeRequestDrawer.jsx'

const PERIODS = [
  { value: 'this', label: 'Tämä kuukausi' },
  { value: 'last', label: 'Edellinen kuukausi' },
]

function monthRange(which) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (which === 'last' ? 1 : 0), 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  return { start, end }
}

// Talous: myynti, kuukausimaksu ja arvioitu tilitys. Provisiota ei ole -
// koko ruokasumma kuuluu ravintolalle, ja delivo laskuttaa vain paketin
// kuukausimaksun (ja kuljetukset paketin yli). Myynti = subtotal - alennus
// (utils.restaurantShareCents), ei asiakkaan maksamaa kokonaissummaa.
export default function FinanceView() {
  const { restaurant, ordersState, basePath, toast } = useDashboard()
  const { orders } = ordersState
  const [period, setPeriod] = useState('this')
  const [changingPlan, setChangingPlan] = useState(false)
  const changes = useChangeRequests(restaurant.id)
  const plan = restaurantPlan(restaurant)
  const pendingPlan = changes.pendingFor('plan')

  const month = useMemo(() => {
    const { start, end } = monthRange(period)
    const list = orders.filter((o) => {
      const t = new Date(o.created_at)
      return t >= start && t < end && o.status !== 'cancelled'
    })
    const sales = sumSales(list)
    const deliveries = list.filter((o) => o.delivery_method === 'delivery').length
    const charges = monthlyPlanCharges(plan, deliveries)
    return { list, sales, deliveries, charges, net: sales - charges.totalCents, start }
  }, [orders, period, plan])

  const monthName = month.start.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })

  async function requestPlan(payload) {
    await changes.submit(payload)
    setChangingPlan(false)
    toast('Paketin vaihtopyyntö lähetetty - Bidrop vahvistaa sen')
  }

  return (
    <div className="pd-view">
      <PageHeader
        title="Talous"
        description="Myynti, kuukausimaksu, tilitykset ja laskut. Ei provisiota - koko ruokasumma kuuluu sinulle."
        actions={<Segmented value={period} onChange={setPeriod} options={PERIODS} label="Kausi" />}
      />

      <div className="pd-summary">
        <Stat label={`Myynti, ${monthName}`} value={formatPrice(month.sales)} hint={`${month.list.length} tilausta`} />
        {plan.delivery ? (
          <Stat
            label="Kuljetustilaukset"
            value={`${month.deliveries} / ${plan.includedDeliveries.toLocaleString('fi-FI')}`}
            hint={
              month.charges.extraDeliveries > 0
                ? `Yli paketin ${month.charges.extraDeliveries} × ${formatPrice(EXTRA_DELIVERY_CENTS)}`
                : 'Sisältyy kuukausimaksuun'
            }
          />
        ) : (
          <Stat label="Noutotilaukset" value={month.list.length} hint="Nouto-paketti, ei kuljetuksia" />
        )}
        <Stat
          label="Kuukausimaksu"
          value={`−${formatPrice(month.charges.totalCents)}`}
          hint={month.charges.extraCents ? `+ alv · sis. lisäkuljetukset ${formatPrice(month.charges.extraCents)}` : `${plan.name} + alv`}
        />
        <Stat label="Arvioitu tilitys" value={formatPrice(month.net)} hint="Myynti − kuukausimaksu" />
      </div>

      <div className="pd-two-col pd-two-col--narrow-right">
        <div className="pd-stack">
          <Card title="Tilauskohtainen erittely" subtitle="Viimeisimmät tilaukset valitulta kaudelta" padded={false}>
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Tilaus</th>
                    <th>Päivä</th>
                    <th>Tapa</th>
                    <th className="pd-num">Sinulle</th>
                  </tr>
                </thead>
                <tbody>
                  {month.list.slice(0, 12).map((o) => (
                    <tr key={o.id}>
                      <td className="pd-strong">{o.order_number}</td>
                      <td>{formatDate(o.created_at)}</td>
                      <td>{o.delivery_method === 'delivery' ? 'Kuljetus' : 'Nouto'}</td>
                      <td className="pd-num pd-strong">{formatPrice(restaurantShareCents(o))}</td>
                    </tr>
                  ))}
                  {month.list.length === 0 && (
                    <tr>
                      <td colSpan={4} className="pd-muted">
                        Ei tilauksia tällä kaudella.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Tilitykset ja laskut">
            <p className="pd-muted pd-finance-note">
              Ruokasummat tilitetään tilillesi kahden viikon välein, ja kuukausimaksu laskutetaan kuukauden alussa (maksuaika 14
              päivää). Tilitykset ja laskut näkyvät täällä ensimmäisen tilityksen jälkeen.
            </p>
          </Card>
        </div>

        <div className="pd-stack">
          <Card title="Paketti">
            <div className="pd-current-plan">
              <strong>{plan.name}</strong>
              <span>
                {formatPrice(plan.priceCents)} / kk + alv · {planOrdersLabel(plan)}
              </span>
            </div>
            {pendingPlan && (
              <p className="pd-locked__status is-pending">
                Vaihtopyyntö: {findPlan(pendingPlan.new_value)?.name ?? pendingPlan.new_value} - odottaa Bidropin vahvistusta
              </p>
            )}
            <button
              type="button"
              className="pd-btn pd-btn--secondary pd-btn--block"
              onClick={() => setChangingPlan(true)}
              disabled={Boolean(pendingPlan)}
            >
              {pendingPlan ? 'Vaihtopyyntö lähetetty' : 'Vaihda pakettia'}
            </button>
            <p className="pd-muted">
              Sitoutumisaika {COMMITMENT_MONTHS} kk. Isompaan pakettiin voi siirtyä milloin tahansa, pienempään seuraavan laskutuskauden
              alusta.
            </p>
          </Card>


          <Card title="Yritys- ja maksutiedot" subtitle="Tilitykset maksetaan tälle tilille">
            <dl className="pd-company-summary">
              <div>
                <dt>Yritys</dt>
                <dd>{restaurant.company_name || '–'}</dd>
              </div>
              <div>
                <dt>Y-tunnus</dt>
                <dd>{restaurant.business_id || '–'}</dd>
              </div>
              <div>
                <dt>Tilinumero</dt>
                <dd>{maskIban(restaurant.iban) || '–'}</dd>
              </div>
            </dl>
            <Link to={`${basePath}/asetukset?osio=yritys`} className="pd-btn pd-btn--secondary pd-btn--block">
              <Lock size={15} aria-hidden="true" /> Muuta tietoja muutospyynnöllä
            </Link>
          </Card>
        </div>
      </div>

      {changingPlan && (
        <ChangeRequestDrawer field="plan" currentValue={plan.key} onClose={() => setChangingPlan(false)} onSubmit={requestPlan} />
      )}
    </div>
  )
}

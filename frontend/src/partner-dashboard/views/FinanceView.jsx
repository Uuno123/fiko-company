import { useMemo, useState } from 'react'
import { Check, Download, FileText } from 'lucide-react'
import { DEMO_COMPANY, DEMO_INVOICES, DEMO_PAYOUTS } from '../demo.js'
import { useDashboard } from '../context.js'
import { Badge, Card, DemoTag, ErrorNote, Field, Modal, PageHeader, Segmented, Stat } from '../ui.jsx'
import { PLANS, formatDate, formatPrice, planForCommission, restaurantShareCents, sumSales } from '../utils.js'

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

function PlanModal({ current, onClose, onChoose }) {
  const [selected, setSelected] = useState(current.key)
  return (
    <Modal
      title="Vaihda pakettia"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="pd-btn pd-btn--ghost" onClick={onClose}>
            Peruuta
          </button>
          <button type="button" className="pd-btn pd-btn--primary" disabled={selected === current.key} onClick={() => onChoose(selected)}>
            Vaihda pakettiin
          </button>
        </>
      }
    >
      <div className="pd-plans">
        {PLANS.map((plan) => (
          <button
            key={plan.key}
            type="button"
            className={`pd-plan${selected === plan.key ? ' is-selected' : ''}`}
            onClick={() => setSelected(plan.key)}
          >
            <span className="pd-plan__name">
              {plan.name}
              {current.key === plan.key && <Badge tone="neutral">Nykyinen</Badge>}
            </span>
            <strong>{formatPrice(plan.priceCents)} / kk</strong>
            <span className="pd-muted">{plan.commission === 0 ? 'Ei välityspalkkiota' : `+ ${plan.commission} % välityspalkkio`}</span>
            {selected === plan.key && <Check className="pd-plan__check" size={18} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <p className="pd-inline-demo">
        <DemoTag /> Vaihto astuu voimaan seuraavan laskutuskauden alussa.
      </p>
    </Modal>
  )
}

function CompanyCard() {
  const { toast } = useDashboard()
  const [form, setForm] = useState(DEMO_COMPANY)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  function save() {
    if (!/^\d{7}-\d$/.test(form.businessId.trim())) return setError('Y-tunnus muodossa 1234567-8')
    if (!/^FI\d{2}[\d ]{14,}$/.test(form.iban.replace(/\s+/g, ' ').trim().toUpperCase())) return setError('Tarkista IBAN (FI + 16 numeroa)')
    setError('')
    toast('Yritystiedot tallennettu')
  }

  return (
    <Card title="Yritys- ja maksutiedot" subtitle="Tilitykset maksetaan tälle tilille" demo>
      <div className="pd-form-grid">
        <Field label="Yrityksen nimi">
          <input className="pd-input" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
        </Field>
        <Field label="Y-tunnus">
          <input className="pd-input" value={form.businessId} onChange={(e) => set('businessId', e.target.value)} />
        </Field>
        <Field label="Tilinumero (IBAN)" className="pd-field--full">
          <input className="pd-input" value={form.iban} onChange={(e) => set('iban', e.target.value)} />
        </Field>
        <Field label="Laskutussähköposti">
          <input className="pd-input" type="email" value={form.billingEmail} onChange={(e) => set('billingEmail', e.target.value)} />
        </Field>
        <Field label="Laskutusosoite">
          <input className="pd-input" value={form.billingAddress} onChange={(e) => set('billingAddress', e.target.value)} />
        </Field>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="pd-card__foot">
        <button type="button" className="pd-btn pd-btn--primary" onClick={save}>
          Tallenna
        </button>
      </div>
    </Card>
  )
}

export default function FinanceView() {
  const { restaurant, ordersState, toast } = useDashboard()
  const { orders } = ordersState
  const [period, setPeriod] = useState('this')
  const [planKey, setPlanKey] = useState(() => planForCommission(restaurant.commission_rate_percent).key)
  const [showPlans, setShowPlans] = useState(false)
  const currentPlan = PLANS.find((p) => p.key === planKey) ?? planForCommission(restaurant.commission_rate_percent)
  const commissionPercent = Number(restaurant.commission_rate_percent ?? 25)

  const month = useMemo(() => {
    const { start, end } = monthRange(period)
    const list = orders.filter((o) => {
      const t = new Date(o.created_at)
      return t >= start && t < end && o.status !== 'cancelled'
    })
    const sales = sumSales(list)
    const commission = Math.round((sales * commissionPercent) / 100)
    return { list, sales, commission, net: sales - commission, start }
  }, [orders, period, commissionPercent])

  const monthName = month.start.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' })

  return (
    <div className="pd-view">
      <PageHeader
        title="Talous"
        description="Myynti, välityspalkkiot, tilitykset ja laskut."
        actions={<Segmented value={period} onChange={setPeriod} options={PERIODS} label="Kausi" />}
      />

      <div className="pd-summary">
        <Stat label={`Myynti, ${monthName}`} value={formatPrice(month.sales)} hint={`${month.list.length} tilausta`} />
        <Stat label={`Välityspalkkio ${commissionPercent} %`} value={`−${formatPrice(month.commission)}`} />
        <Stat label="Kuukausimaksu" value={currentPlan.priceCents != null ? `−${formatPrice(currentPlan.priceCents)}` : 'Sopimuksen mukaan'} />
        <Stat
          label="Arvioitu tilitys"
          value={formatPrice(month.net - (currentPlan.priceCents ?? 0))}
          hint="Myynti − palkkio − kuukausimaksu"
        />
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
                    <th className="pd-num">Myynti</th>
                    <th className="pd-num">Palkkio</th>
                    <th className="pd-num">Sinulle</th>
                  </tr>
                </thead>
                <tbody>
                  {month.list.slice(0, 12).map((o) => {
                    const share = restaurantShareCents(o)
                    const fee = Math.round((share * commissionPercent) / 100)
                    return (
                      <tr key={o.id}>
                        <td className="pd-strong">{o.order_number}</td>
                        <td>{formatDate(o.created_at)}</td>
                        <td className="pd-num">{formatPrice(share)}</td>
                        <td className="pd-num pd-muted">−{formatPrice(fee)}</td>
                        <td className="pd-num pd-strong">{formatPrice(share - fee)}</td>
                      </tr>
                    )
                  })}
                  {month.list.length === 0 && (
                    <tr>
                      <td colSpan={5} className="pd-muted">
                        Ei tilauksia tällä kaudella.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Tilitykset" subtitle="Maksetaan viikoittain tilillesi" demo padded={false}>
            <ul className="pd-list pd-list--padded">
              {DEMO_PAYOUTS.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.period}</strong>
                    <span className="pd-muted">{p.status === 'paid' ? `Maksettu ${formatDate(p.date)}` : `Maksetaan ${formatDate(p.date)}`}</span>
                  </span>
                  <span className="pd-list__end">
                    <strong>{formatPrice(p.amountCents)}</strong>
                    <Badge tone={p.status === 'paid' ? 'success' : 'info'}>{p.status === 'paid' ? 'Maksettu' : 'Tulossa'}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="pd-stack">
          <Card title="Paketti" demo>
            <div className="pd-current-plan">
              <strong>{currentPlan.name}</strong>
              <span>
                {currentPlan.priceCents != null ? `${formatPrice(currentPlan.priceCents)} / kk` : 'Oma sopimus'} ·{' '}
                {currentPlan.commission === 0 ? 'ei välityspalkkiota' : `${currentPlan.commission} % välityspalkkio`}
              </span>
            </div>
            <button type="button" className="pd-btn pd-btn--secondary pd-btn--block" onClick={() => setShowPlans(true)}>
              Vaihda pakettia
            </button>
            <p className="pd-muted">Ei sitoutumisaikaa - voit vaihtaa tai perua milloin vain.</p>
          </Card>

          <Card title="Laskut" demo padded={false}>
            <ul className="pd-list pd-list--padded">
              {DEMO_INVOICES.map((inv) => (
                <li key={inv.id}>
                  <FileText size={18} strokeWidth={1.75} aria-hidden="true" className="pd-muted" />
                  <span>
                    <strong>{inv.title}</strong>
                    <span className="pd-muted">
                      {inv.number} · {formatDate(inv.date)} · {formatPrice(inv.amountCents)}
                    </span>
                  </span>
                  <button type="button" className="pd-icon-btn" aria-label={`Lataa lasku ${inv.number}`} onClick={() => toast('PDF-laskut tulossa pian')}>
                    <Download size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <CompanyCard />
        </div>
      </div>

      {showPlans && (
        <PlanModal
          current={currentPlan}
          onClose={() => setShowPlans(false)}
          onChoose={(key) => {
            setPlanKey(key)
            setShowPlans(false)
            toast(`Paketti vaihtuu: ${PLANS.find((p) => p.key === key).name}`)
          }}
        />
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Megaphone, Rocket } from 'lucide-react'
import { useDashboard } from '../context.js'
import { Badge, Card, EmptyState, PageHeader } from '../ui.jsx'
import { restaurantPlan } from '../utils.js'

// Markkinointi ilman esimerkkidataa (käyttäjä: "poista kaikki feikki data").
// Kampanjoille ei ole vielä tietokantaa eikä kassan alennusta, joten niistä
// kerrotaan vain, että ne ovat tulossa. Valmis luontinäkymä odottaa
// tiedostossa marketing/CampaignDrawer.jsx, kunnes kampanjat tallentuvat ja
// vähentyvät kassalla. Nostettu näkyvyys tulee oikeasti paketista.
export default function MarketingView() {
  const { restaurant, basePath } = useDashboard()
  const plan = restaurantPlan(restaurant)

  return (
    <div className="pd-view">
      <PageHeader title="Markkinointi" description="Näkyvyys ja tarjoukset, jotka tuovat uusia asiakkaita." />

      <div className="pd-two-col pd-two-col--narrow-right">
        <Card title="Kampanjat">
          <EmptyState
            icon={Megaphone}
            title="Kampanjat tulossa"
            text="Pian voit luoda tarjouksia, esimerkiksi −20 % tai ilmaisen kuljetuksen. Ne näkyvät asiakkaille ravintolakortissa ja vähentyvät kassalla automaattisesti."
          />
        </Card>

        <Card className="pd-boost">
          <span className="pd-boost__icon">
            <Rocket size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h2>Nostettu näkyvyys</h2>
          {plan.key === 'iso' ? (
            <>
              <p>Ravintolasi näkyy korkeammalla etusivulla ja hakutuloksissa {plan.name}-paketin ansiosta.</p>
              <Badge tone="success">Käytössä</Badge>
            </>
          ) : (
            <>
              <p>Iso ravintola -paketissa ravintolasi näkyy korkeammalla etusivulla ja haussa.</p>
              <Link to={`${basePath}/talous`} className="pd-btn pd-btn--secondary">
                Katso paketit
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

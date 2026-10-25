import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { CourierApplyForm, RestaurantApplyForm } from '../components/partner-site/ApplyForms.jsx'
import SiteFooter from '../components/partner-site/SiteFooter.jsx'
import SiteHeader from '../components/partner-site/SiteHeader.jsx'
import { Checks } from '../components/partner-site/parts.jsx'
import { PARTNER_EMAIL, applyPageCopy, partnerNav } from '../components/partner-site/copy.js'
import { useDocumentTitle, usePartnerLang } from '../components/partner-site/hooks.js'
import '../components/partner-site/PartnerSite.css'

// Erillinen hakusivu (käyttäjän pyyntö 25.10.2026): ravintolat
// /kumppanina/hae ja kuljettajat /kumppanina/kuljettajat/hae. Vasemmalla
// edut ja mitä seuraavaksi tapahtuu, oikealla lyhyt hakemus.
// kind: 'restaurant' | 'courier'.
function PartnerApply({ kind }) {
  const [lang, setLang] = usePartnerLang()
  const t = applyPageCopy(kind, lang)
  const nav = partnerNav(kind, lang)
  useDocumentTitle(t.documentTitle)
  const isCourier = kind === 'courier'
  const home = isCourier ? '/kumppanina/kuljettajat' : '/kumppanina'

  return (
    <div className="ps-page">
      <SiteHeader lang={lang} onLangChange={setLang} links={nav.links} cta={nav.cta} />
      <main className="ps-applypage">
        {/* Puhelimella lomake heti otsikon jälkeen, edut ja jatko sen alla. */}
        <div className="ps-container ps-applypage__grid">
          <div className="ps-applypage__intro">
            <Link to={home} className="ps-back">
              <ArrowLeft size={18} strokeWidth={2.2} aria-hidden="true" />
              {t.back}
            </Link>
            <h1 className="ps-h1">{t.title}</h1>
            <p className="ps-lead">{t.lead}</p>
          </div>
          <div className="ps-applypage__card">
            {isCourier ? <CourierApplyForm lang={lang} /> : <RestaurantApplyForm lang={lang} />}
          </div>
          <div className="ps-applypage__more">
            <Checks items={isCourier ? t.facts : [t.offer, ...t.facts.slice(1)]} />
            <div className="ps-next">
              <h2>{t.nextTitle}</h2>
              <ol>
                {t.next.map((step, index) => (
                  <li key={index}>
                    <span className="ps-steps__num">{index + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>
            </div>
            <p className="ps-applypage__contact">
              {t.contact} <a href={`mailto:${PARTNER_EMAIL}`}>{PARTNER_EMAIL}</a>
            </p>
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}

export default PartnerApply

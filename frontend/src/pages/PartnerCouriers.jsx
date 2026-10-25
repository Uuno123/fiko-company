import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Faq from '../components/partner-site/Faq.jsx'
import SiteFooter from '../components/partner-site/SiteFooter.jsx'
import SiteHeader from '../components/partner-site/SiteHeader.jsx'
import { ApplyBand, BenefitGrid, Checks, PhoneFrame, SectionHead, Steps } from '../components/partner-site/parts.jsx'
import { APPLY_PATHS, applyPageCopy, courierCopy, partnerNav, sharedCopy } from '../components/partner-site/copy.js'
import { useDocumentTitle, useHashScroll, usePartnerLang, useReveal } from '../components/partner-site/hooks.js'
import '../components/partner-site/PartnerSite.css'

// Kumppanisivu kuljettajille (/kumppanina/kuljettajat), uusittu 24.10.2026:
// omat työajat, oma hinta (koko hinta kuljettajalle), keikan kulku, sovellus
// kuvakaappauksin, vaatimukset, ehtojen tiivistelmä ja UKK. Hakemus omalla
// sivullaan (PartnerApply); sovellus ladataan hyväksynnän jälkeen.
function PartnerCouriers() {
  const [lang, setLang] = usePartnerLang()
  const t = courierCopy(lang)
  const s = sharedCopy(lang)
  useDocumentTitle(t.title)
  useHashScroll()
  const pageRef = useReveal([lang])

  const nav = partnerNav('courier', lang)
  const apply = applyPageCopy('courier', lang)

  return (
    <div className="ps-page" ref={pageRef}>
      <SiteHeader lang={lang} onLangChange={setLang} links={nav.links} cta={nav.cta} />

      <main>
        <section className="ps-hero ps-hero--dark">
          <div className="ps-container ps-hero__grid">
            <div className="ps-hero__text">
              <p className="ps-kicker ps-kicker--light">{t.hero.kicker}</p>
              <h1 className="ps-hero__title">{t.hero.title}</h1>
              <p className="ps-hero__lead">{t.hero.lead}</p>
              <div className="ps-hero__actions">
                <Link to={APPLY_PATHS.courier} className="ps-btn ps-btn--orange ps-btn--lg">
                  {t.hero.primary}
                </Link>
                <Link to="/kumppanina/kuljettajat#miten-toimii" className="ps-btn ps-btn--ghost-light ps-btn--lg">
                  {t.hero.secondary}
                </Link>
              </div>
              <Checks items={t.hero.facts} className="ps-hero__facts" />
            </div>
            <div className="ps-hero__visual ps-hero__visual--phone">
              <PhoneFrame src="/partner/screens/app-earnings.jpg" alt={t.hero.imageAlt} eager />
            </div>
          </div>
        </section>

        <section className="ps-section" id="hyodyt">
          <div className="ps-container">
            <SectionHead kicker={t.benefits.kicker} title={t.benefits.title} />
            <BenefitGrid items={t.benefits.items} />
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="miten-toimii">
          <div className="ps-container">
            <SectionHead kicker={t.how.kicker} title={t.how.title} />
            <Steps steps={t.how.steps} columns={3} />
          </div>
        </section>

        <section className="ps-section" id="sovellus">
          <div className="ps-container ps-app">
            <div className="ps-app__text" data-reveal>
              <p className="ps-kicker">{t.app.kicker}</p>
              <h2 className="ps-h2">{t.app.title}</h2>
              <p className="ps-lead">{t.app.lead}</p>
              <Checks items={t.app.items} />
            </div>
            <div className="ps-app__phones" data-reveal>
              {t.app.images.map((image) => (
                <PhoneFrame key={image.src} src={image.src} alt={image.alt} />
              ))}
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="vaatimukset">
          <div className="ps-container ps-container--narrow">
            <SectionHead kicker={t.requirements.kicker} title={t.requirements.title} />
            <div className="ps-card" data-reveal>
              <Checks items={t.requirements.items} className="ps-checks--two" />
            </div>
          </div>
        </section>

        <section className="ps-section" id="ehdot">
          <div className="ps-container ps-container--narrow">
            <SectionHead kicker={t.terms.kicker} title={t.terms.title} />
            <div data-reveal>
              <Checks items={t.terms.items} className="ps-checks--spaced" />
              <Link to="/kumppanina/ehdot#kuljettajat" className="ps-link">
                {s.termsLink} <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="ukk">
          <div className="ps-container ps-container--narrow">
            <Faq title={s.faqTitle} items={t.faq} />
          </div>
        </section>

        <ApplyBand title={apply.band.title} body={apply.band.body} to={APPLY_PATHS.courier} label={apply.band.button} />
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

export default PartnerCouriers

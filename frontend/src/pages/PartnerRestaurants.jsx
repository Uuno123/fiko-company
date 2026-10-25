import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Info } from 'lucide-react'
import Faq from '../components/partner-site/Faq.jsx'
import SiteFooter from '../components/partner-site/SiteFooter.jsx'
import SiteHeader from '../components/partner-site/SiteHeader.jsx'
import { ApplyBand, BenefitGrid, BrowserFrame, Checks, SectionHead, Steps } from '../components/partner-site/parts.jsx'
import {
  APPLY_PATHS,
  COMPARISON_SOURCES,
  applyPageCopy,
  money,
  partnerNav,
  restaurantCopy,
  sharedCopy,
} from '../components/partner-site/copy.js'
import { useDocumentTitle, useHashScroll, usePartnerLang, useReveal } from '../components/partner-site/hooks.js'
import '../components/partner-site/PartnerSite.css'

// Kumppanisivu ravintoloille (/kumppanina), uusittu 24.10.2026 käyttäjän
// sisältösuunnitelman mukaan: Ei provisiota -lupaus, hyödyt, tilauksen kulku,
// kojelauta kuvakaappauksin, julkiset hinnat, vertailu Woltiin, markkinointi,
// aloitus, ehtojen tiivistelmä ja UKK. Hakemus omalla sivullaan (PartnerApply).
// Suomeksi ja englanniksi.
function PartnerRestaurants() {
  const [lang, setLang] = usePartnerLang()
  const t = restaurantCopy(lang)
  const s = sharedCopy(lang)
  useDocumentTitle(t.title)
  useHashScroll()
  const pageRef = useReveal([lang])
  const [tabKey, setTabKey] = useState(t.dashboard.tabs[0].key)
  const tab = t.dashboard.tabs.find((item) => item.key === tabKey) ?? t.dashboard.tabs[0]

  const nav = partnerNav('restaurant', lang)
  const apply = applyPageCopy('restaurant', lang)

  return (
    <div className="ps-page" ref={pageRef}>
      <SiteHeader lang={lang} onLangChange={setLang} links={nav.links} cta={nav.cta} />

      <main>
        <section className="ps-hero">
          <div className="ps-container ps-hero__grid">
            <div className="ps-hero__text">
              <p className="ps-kicker">{t.hero.kicker}</p>
              <h1 className="ps-hero__title">{t.hero.title}</h1>
              <p className="ps-hero__lead">{t.hero.lead}</p>
              <div className="ps-hero__actions">
                <Link to={APPLY_PATHS.restaurant} className="ps-btn ps-btn--orange ps-btn--lg">
                  {t.hero.primary}
                </Link>
                <Link to="/kumppanina#hinnat" className="ps-btn ps-btn--ghost ps-btn--lg">
                  {t.hero.secondary}
                </Link>
              </div>
              <Checks items={t.hero.facts} className="ps-hero__facts" />
            </div>
            <div className="ps-hero__visual">
              <span className="ps-offer">{t.hero.offer}</span>
              <BrowserFrame src="/partner/screens/dashboard-orders.jpg" alt={t.hero.imageAlt} eager />
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
            <Steps steps={t.how.steps} />
            <p className="ps-callout" data-reveal>
              <Info size={20} strokeWidth={2.2} aria-hidden="true" />
              <span>{t.how.note}</span>
            </p>
          </div>
        </section>

        <section className="ps-section" id="kojelauta">
          <div className="ps-container">
            <SectionHead kicker={t.dashboard.kicker} title={t.dashboard.title} lead={t.dashboard.lead} />
            <div className="ps-tabs" role="tablist" aria-label={t.dashboard.title}>
              {t.dashboard.tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={item.key === tab.key}
                  className={item.key === tab.key ? 'is-active' : ''}
                  onClick={() => setTabKey(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="ps-showcase" data-reveal>
              <div className="ps-showcase__text">
                <h3>{tab.title}</h3>
                <p>{tab.body}</p>
                <Checks items={t.dashboard.extras} />
              </div>
              <BrowserFrame src={tab.image} alt={tab.alt} />
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="hinnat">
          <div className="ps-container">
            <SectionHead kicker={t.pricing.kicker} title={t.pricing.title} lead={t.pricing.lead} center />
            <p className="ps-offer ps-offer--center" data-reveal>
              {t.pricing.offer}
            </p>
            <div className="ps-plans">
              {t.plans.map((plan) => (
                <article key={plan.key} className={`ps-plan${plan.popular ? ' ps-plan--popular' : ''}`} data-reveal>
                  {plan.popular ? <span className="ps-plan__badge">{t.pricing.popular}</span> : null}
                  <h3>{plan.name}</h3>
                  <p className="ps-plan__orders">{plan.orders}</p>
                  <p className="ps-plan__price">
                    <strong>{money(plan.priceCents, lang)}</strong>
                    <span>
                      {t.pricing.perMonth} {t.pricing.vat}
                    </span>
                  </p>
                  <p className="ps-plan__free">{t.hero.offer}</p>
                  <Checks items={plan.features} />
                  <Link
                    to={APPLY_PATHS.restaurant}
                    className={`ps-btn ps-btn--block ${plan.popular ? 'ps-btn--orange' : 'ps-btn--outline'}`}
                  >
                    {t.pricing.choose}
                  </Link>
                </article>
              ))}
            </div>
            <div className="ps-extras" data-reveal>
              <h3>{t.pricing.extrasTitle}</h3>
              <dl>
                {t.pricing.extras.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="ps-note">{t.pricing.note}</p>
          </div>
        </section>

        <section className="ps-section" id="vertailu">
          <div className="ps-container ps-container--narrow">
            <SectionHead kicker={t.comparison.kicker} title={t.comparison.title} lead={t.comparison.lead} />
            <div className="ps-table-wrap" data-reveal>
              <table className="ps-compare">
                <thead>
                  <tr>
                    {t.comparison.head.map((heading, index) => (
                      <th key={heading || 'empty'} scope="col" className={index === 1 ? 'is-bidrop' : ''}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.comparison.rows.map(([label, bidrop, other]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td className="is-bidrop">{bidrop}</td>
                      <td>{other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ps-footnotes">
              {t.comparison.footnotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
              <p>
                {t.comparison.sourcesTitle}:{' '}
                {COMPARISON_SOURCES.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 ? ' · ' : ''}
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="markkinointi">
          <div className="ps-container">
            <SectionHead kicker={t.marketing.kicker} title={t.marketing.title} />
            <div className="ps-marketing">
              <article className="ps-boost" data-reveal>
                <span className="ps-boost__tag">{t.marketing.boost.tag}</span>
                <h3>{t.marketing.boost.title}</h3>
                <p>{t.marketing.boost.body}</p>
                <p className="ps-boost__price">
                  <strong>{t.marketing.boost.price}</strong>
                  <span>{t.marketing.boost.vat}</span>
                </p>
              </article>
              <article className="ps-card" data-reveal>
                <h3>{t.marketing.campaigns.title}</h3>
                <p>{t.marketing.campaigns.lead}</p>
                <ol className="ps-numbered">
                  {t.marketing.campaigns.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ol>
              </article>
            </div>
          </div>
        </section>

        <section className="ps-section" id="aloitus">
          <div className="ps-container">
            <SectionHead kicker={t.start.kicker} title={t.start.title} />
            <Steps steps={t.start.steps} />
            <div className="ps-card ps-requirements" data-reveal>
              <h3>{t.start.requirementsTitle}</h3>
              <Checks items={t.start.requirements} />
            </div>
          </div>
        </section>

        <section className="ps-section ps-section--muted" id="ehdot">
          <div className="ps-container ps-container--narrow">
            <SectionHead kicker={t.terms.kicker} title={t.terms.title} />
            <div data-reveal>
              <Checks items={t.terms.items} className="ps-checks--spaced" />
              <Link to="/kumppanina/ehdot" className="ps-link">
                {s.termsLink} <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <section className="ps-section" id="ukk">
          <div className="ps-container ps-container--narrow">
            <Faq title={s.faqTitle} items={t.faq} />
          </div>
        </section>

        <ApplyBand
          title={apply.band.title}
          body={apply.band.body}
          to={APPLY_PATHS.restaurant}
          label={apply.band.button}
        />
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}

export default PartnerRestaurants

import { Link } from 'react-router-dom'
import SiteFooter from '../components/partner-site/SiteFooter.jsx'
import SiteHeader from '../components/partner-site/SiteHeader.jsx'
import { APPLY_PATHS, sharedCopy } from '../components/partner-site/copy.js'
import { termsCopy } from '../components/partner-site/termsCopy.js'
import { useDocumentTitle, useHashScroll, usePartnerLang } from '../components/partner-site/hooks.js'
import '../components/partner-site/PartnerSite.css'

// Kumppaniehdot (/kumppanina/ehdot): ravintoloiden ja kuljettajien ehdot
// kokonaan. Kumppanisivujen "Lue kaikki ehdot" -linkit tuovat tänne;
// #kuljettajat vie suoraan kuljettajien osaan.
function TermsGroup({ group, index }) {
  return (
    <section className="ps-terms__group">
      <h3>
        <span>{index + 1}.</span> {group.title}
      </h3>
      {group.intro ? <p>{group.intro}</p> : null}
      {group.ordered ? (
        <ol>
          {group.ordered.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ol>
      ) : null}
      {group.items ? (
        <ul>
          {group.items.map((item) =>
            typeof item === 'string' ? (
              <li key={item}>{item}</li>
            ) : (
              <li key={item.lead}>
                <strong>{item.lead}</strong> {item.text}
              </li>
            ),
          )}
        </ul>
      ) : null}
    </section>
  )
}

function PartnerTerms() {
  const [lang, setLang] = usePartnerLang()
  const t = termsCopy(lang)
  const s = sharedCopy(lang)
  useDocumentTitle(`Bidrop – ${t.title}`)
  useHashScroll()

  const links = [
    { to: '/kumppanina', label: s.nav.restaurants },
    { to: '/kumppanina/kuljettajat', label: s.nav.couriers },
    { to: '/kumppanina/ehdot#ravintolat', label: t.tabs.restaurants },
    { to: '/kumppanina/ehdot#kuljettajat', label: t.tabs.couriers },
  ]

  return (
    <div className="ps-page">
      <SiteHeader
        lang={lang}
        onLangChange={setLang}
        links={links}
        cta={{ to: APPLY_PATHS.restaurant, label: s.nav.applyRestaurant }}
      />
      <main className="ps-terms">
        <div className="ps-container ps-container--narrow">
          <h1 className="ps-h1">{t.title}</h1>
          <p className="ps-lead">{t.lead}</p>
          <nav className="ps-terms__toc" aria-label={t.title}>
            <Link to="/kumppanina/ehdot#ravintolat">{t.tabs.restaurants}</Link>
            <Link to="/kumppanina/ehdot#kuljettajat">{t.tabs.couriers}</Link>
          </nav>

          <div id="ravintolat" className="ps-terms__part">
            <h2 className="ps-h2">{t.tabs.restaurants}</h2>
            {t.restaurants.map((group, index) => (
              <TermsGroup key={index} group={group} index={index} />
            ))}
          </div>

          <div id="kuljettajat" className="ps-terms__part">
            <h2 className="ps-h2">{t.tabs.couriers}</h2>
            {t.couriers.map((group, index) => (
              <TermsGroup key={index} group={group} index={index} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}

export default PartnerTerms

import { Fragment } from 'react'
import { DEALS_LINK_INDEX, DEALS_QUERY } from '../lib/categories.js'
import CategoryPill from './CategoryPill.jsx'

// Mobiilin etusivun kategoriarivi: ikoni + nimi -pillerit (CategoryPill), sama
// tyyli kuin työpöydän palkissa (käyttäjän valinta 27.10.2026). Pilleri hakee
// kategorialla, oranssi Tarjoukset kolmantena. Rivin tyylit Home.css:ssä
// (.home-quick-cats).
//
// Rivi pysyy kiinni headerin alla myös alas vieritettäessä, eikä mikään
// pilleri muutu vierittäessä aktiiviseksi (käyttäjän pyynnöt 27.10.2026 -
// aiempi piiloon liukuminen ja näkyvän rivin korostus poistettu).
function MobileCategoryRow({ categories }) {
  return (
    <nav className="home-quick-cats" aria-label="Kategoriat">
      <div className="home-quick-cats__row">
        {categories.map((category, index) => (
          <Fragment key={category}>
            {index === DEALS_LINK_INDEX && <CategoryPill category={DEALS_QUERY} offers />}
            <CategoryPill category={category} />
          </Fragment>
        ))}
      </div>
    </nav>
  )
}

export default MobileCategoryRow

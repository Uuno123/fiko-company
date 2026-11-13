import { useEffect, useState } from 'react'
import { Search, Smartphone } from 'lucide-react'
import Header from './Header.jsx'
import MobileMenu from './MobileMenu.jsx'
import BottomSheet from './BottomSheet.jsx'
import SearchDialog from './SearchDialog.jsx'
import { useCart } from '../lib/CartContext.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { formatPrice } from '../lib/format.js'

// Täsmälleen sama header kuin etusivulla (käyttäjän pyyntö 13.11.2026):
// kaikilla sivuilla paitsi ostoskorissa ja kassalla. Etusivun headerin tyylit
// ovat Home.css:ssä .page--home-luokan alla, joten kääre saa saman luokan;
// display: contents pitää headerin sticky-käytöksen ennallaan.
// Vain isolla näytöllä (käyttäjä 13.11.2026: "ei mobiilissa"): kapealla
// näytöllä sivun entinen header (hakusivuilla osoite + haku, muilla perus).
const COMPACT_QUERY = '(max-width: 780px)'

// search: sivun oma hakukenttä (hakutulokset, kategoria), muuten paikallinen.
export default function MainHeader({ search, flatUntilScroll }) {
  const cart = useCart()
  const { isAuthenticated } = useAuth()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [appSheetOpen, setAppSheetOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches)
  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    const update = (event) => setCompact(event.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const cartProp =
    cart.count > 0
      ? {
          count: cart.count,
          totalCents: cart.totalCents,
          groups: cart.groups,
          onClear: cart.clear,
          onClearRestaurant: cart.clearRestaurant,
          formatPrice,
        }
      : null

  if (compact) {
    return search ? (
      <Header showAddress flatUntilScroll={flatUntilScroll} search={search} cart={cartProp} />
    ) : (
      <Header />
    )
  }

  return (
    <div className={`page--home main-header${isAuthenticated ? '' : ' is-guest'}`} style={{ display: 'contents' }}>
      <Header
        search={search ?? { value: query, onChange: setQuery, placeholder: 'Hae ravintoloita...' }}
        flatUntilScroll={flatUntilScroll}
        showAddress
        cartAlways
        onMenu={() => setMenuOpen(true)}
        actions={
          <>
            <button
              type="button"
              className="home-header-search"
              aria-label="Hae ravintoloita ja ruokia"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button type="button" className="home-open-app" onClick={() => setAppSheetOpen(true)}>
              Avaa sovellus
            </button>
          </>
        }
        cart={cartProp}
      />

      {searchOpen && <SearchDialog onClose={() => setSearchOpen(false)} />}

      {menuOpen && <MobileMenu onClose={() => setMenuOpen(false)} onOpenApp={() => setAppSheetOpen(true)} />}

      {appSheetOpen && (
        <BottomSheet compact onClose={() => setAppSheetOpen(false)} labelledBy="app-sheet-title">
          {(close) => (
            <div className="app-sheet">
              <Smartphone className="app-sheet__icon" size={28} strokeWidth={1.8} aria-hidden="true" />
              <h2 id="app-sheet-title">Sovellus on vielä uunissa</h2>
              <p>Bidrop-sovellus tulee pian App Storeen ja Google Playhin. Siihen asti tilaat kätevästi täältä.</p>
              <button type="button" className="app-sheet__ok" onClick={close}>
                Selvä
              </button>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import Header from '../components/Header.jsx'
import CategoryBar from '../components/CategoryBar.jsx'
import MobileCategoryRow from '../components/MobileCategoryRow.jsx'
import Footer from '../components/Footer.jsx'
import PickupOfferBanner from '../components/PickupOfferBanner.jsx'
import RankingInfo from '../components/RankingInfo.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import DealsRow from '../components/DealsRow.jsx'
import Spinner from '../components/Spinner.jsx'
import SearchSuggest, { RestaurantResultCard } from '../components/SearchSuggest.jsx'
import { getRestaurants } from '../lib/api.js'
import {
  ALL,
  CATEGORY_TILE_META,
  DEFAULT_TILE_META,
  DEALS_RESTAURANTS,
  FILLER_TEMPLATES_BY_CATEGORY,
  categorySlug,
  padWithFillers,
} from '../lib/categories.js'
import { useFavorites } from '../lib/useFavorites.js'
import { useCart } from '../lib/CartContext.jsx'
import { useDeliveryAddress, withDistance } from '../lib/deliveryAddress.js'
import { SORT_COMPARATORS, rankRestaurants, useRankingSignals } from '../lib/ranking.js'
import { formatPrice } from '../lib/format.js'
import './Home.css'

// Mobiilin kategoriariveille ei näytetä kahvilaosiota lainkaan (käyttäjän päätös).
const HIDDEN_MOBILE_CATEGORIES = ['Kahvila']

// "Lähelläsi"-rivi osoitteen antaneille: näin monta lähintä kaikista kategorioista.
const NEARBY_COUNT = 10
const NEARBY_ROW = 'Lähelläsi'
// Kovimmat tarjoukset -rivi tulee tämän kategoriarivin jälkeen. Ravintolat ja
// järjestys: DEALS_RESTAURANTS (lib/categories.js, sama lista kuin haussa).
const DEALS_AFTER = 'Kebab & Pizza'

// Mainokset kiertävät automaattisesti. Kaikki kolme ovat oikeita: DELIVO10 ja
// TERVETULOA löytyvät kassan PROMO_CODES-listalta ja backendin payments-reitiltä,
// ja noudossa ei tosiaan veloiteta kuljetusmaksua (kuljetushinta sovitaan vain kotiinkuljetuksessa).
// Järjestys on tarkoituksella sekoitettu väreittäin, ei lisäysjärjestyksessä:
// tervetuloa (punainen lahjapaketti) ja Mcdonalds (punainen kuva) on pidetty
// erillään toisistaan niin ettei kaksi punaista diaa voi koskaan osua
// peräkkäin - työpöydällä niitä näkyy kaksi rinnakkain kerrallaan, joten
// vierekkäiset diat näkyvät aina samaan aikaan.
const HOME_ADS = [
  {
    id: 'bidrop10',
    img: '/promo-banner.png',
    code: 'BIDROP10',
    lead: 'Käytä koodia',
    title: 'Saat 10 % alennuksen tilauksestasi!',
  },
  {
    id: 'nosto-2',
    img: 'https://imageproxy.wolt.com/assets/67ea79d0e3aca1debaea9cdd',
    code: null,
    lead: 'Suosittu juuri nyt',
    title: 'Hesburger Kuopio',
  },
  {
    id: 'tervetuloa',
    img: '/promo-banner-gift-v2.png',
    code: 'TERVETULOA',
    lead: 'Käytä koodia',
    title: 'Saat 3 € alennuksen tilauksestasi!',
  },
  {
    id: 'nosto-3',
    img: 'https://imageproxy.wolt.com/assets/68a57621e6b217110a27d3ea',
    code: null,
    lead: 'Ilmainen kuljetus juuri nyt',
    title: 'Volkan ravintola',
  },
  {
    id: 'nosto-1',
    img: 'https://imageproxy.wolt.com/assets/6735be5986f45b72713e2127',
    code: null,
    lead: 'Kuumana juuri nyt',
    title: 'Mcdonalds',
  },
  {
    id: 'nouto',
    img: '/promo-banner-shopping-bag-v2.png',
    code: null,
    lead: 'Nouda itse ravintolasta',
    title: 'Ei kuljetusmaksua — nouda itse',
  },
]
const AD_ROTATE_MS = 5000

function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const cart = useCart()
  const [restaurants, setRestaurants] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') ?? ALL)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? '')
  const deliveryAddress = useDeliveryAddress()
  const { popularity } = useRankingSignals()
  const [adIndex, setAdIndex] = useState(0)
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [searchOpen, setSearchOpen] = useState(false)
  const navigate = useNavigate()
  const rowsRef = useRef(null)
  const adTrackRef = useRef(null)
  // Ohjelmallinen scrollTo laukaisee itse scroll-tapahtumia koko animaation ajan
  // - ilman tätä lippua alla oleva scroll-kuuntelija tulkitsisi ne pyyhkäisyksi
  // kesken liikkeen ja laskisi adIndexin takaisin lähtöruutuun, jolloin nuoli
  // näytti siltä että dia lähtee liikkeelle mutta peruuntuu itsestään.
  const isProgrammaticAdScroll = useRef(false)
  const adScrollTarget = useRef(0)
  const adScrollSafetyTimer = useRef(null)

  // Reagoi ?q=/?category=-parametreihin myös silloin kun ollaan jo etusivulla
  // (esim. promo-karusellin kategoria-nosto navigoi tänne ilman uudelleenmounttausta,
  // jolloin useState-lazy-alkuarvo ei enää ajaisi uudelleen). Siivotaan osoiterivi heti.
  useEffect(() => {
    if (!searchParams.has('q') && !searchParams.has('category')) return

    if (searchParams.has('q')) setSearchQuery(searchParams.get('q') ?? '')
    if (searchParams.has('category')) setActiveCategory(searchParams.get('category') ?? ALL)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    let cancelled = false

    getRestaurants()
      .then((data) => {
        if (cancelled) return
        setRestaurants(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Kaupunkisuodatin korvattiin toimitusosoitteella: ravintoloita ei enää
  // piiloteta kaupungin mukaan, vaan ne järjestetään etäisyyden mukaan.
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const baseFiltered = restaurants.filter((r) => !normalizedQuery || r.name.toLowerCase().includes(normalizedQuery))
  // Mobiilissa ei ole enää kategoriavalitsinta - näytetään sen sijaan yksi vaakarivi per
  // kategoria (samaan tapaan kuin Wolt), riippumatta activeCategory-tilasta.
  //
  // Rivi näytetään myös kategorialle jolla ei ole vielä yhtään oikeaa ravintolaa,
  // kunhan sille on täytepohjia (FILLER_TEMPLATES_BY_CATEGORY) - muuten yhdeksän
  // uutta kategoriaa (Kebab, Ramen, jne.) eivät näkyisi missään vaikka niille on
  // sekä kuva kategoriarivillä että täyteravintola.
  const categoriesWithContent = Array.from(
    new Set([...baseFiltered.map((r) => r.category), ...Object.keys(FILLER_TEMPLATES_BY_CATEGORY)]),
  )
  const mobileCategoryGroups = categoriesWithContent
    .filter((category) => !HIDDEN_MOBILE_CATEGORIES.includes(category))
    .map((category) => ({
      category,
      // Järjestys lib/ranking.js:n säännöllä: sponsoroidut paikoille 1 ja 4,
      // muut pisteiden mukaan, kiinni olevat ja täytepohjat lopussa.
      items: rankRestaurants(
        withDistance(
          padWithFillers(
            category,
            baseFiltered.filter((r) => r.category === category),
          ),
          deliveryAddress,
        ),
        { address: deliveryAddress, popularity },
      ),
    }))
    .filter((group) => group.items.length > 0)

  // Lähimmät kaikista kategorioista omana rivinään ennen kategorioita - se on
  // koko osoitteen kysymisen pointti. Ilman osoitetta riviä ei ole.
  const nearbyGroup = deliveryAddress
    ? {
        category: NEARBY_ROW,
        // Lähin ensin (asiakkaan kannalta valmis järjestys), ylimpänä enintään yksi
        // sponsori. Kategoriarivien sponsorimerkit pois - tämä rivi valitsee omansa.
        items: rankRestaurants(
          mobileCategoryGroups.flatMap((group) => group.items.map(({ sponsored: _sponsored, ...r }) => r)),
          { address: deliveryAddress, popularity, compare: SORT_COMPARATORS.distance },
        ).slice(0, NEARBY_COUNT),
      }
    : null

  // Kategoriarivit näkyvät nyt myös työpöydällä (otsikko + vaakarivi, kuten
  // Woltissa). activeCategory tulee vain ?category=-parametrista - työpöydän
  // kategorialaatikot vievät nykyään hakutuloksiin eivätkä suodata tätä sivua.
  const visibleCategoryGroups =
    activeCategory === ALL
      ? [...(nearbyGroup ? [nearbyGroup] : []), ...mobileCategoryGroups]
      : mobileCategoryGroups.filter((group) => group.category === activeCategory)

  // Kovimmat tarjoukset -rivi (DealsRow) Kebab & Pizza -rivin jälkeen:
  // DEALS_RESTAURANTS-listan ravintolat samoista (täydennetyistä) riveistä,
  // listan järjestyksessä. Korttien sponsorimerkit pois. Noutokuponki siirtyy
  // yhden rivin alemmas, ettei kaksi nostoa osu peräkkäin.
  const rowRestaurants = mobileCategoryGroups.flatMap((group) => group.items)
  const dealsItems = DEALS_RESTAURANTS.map((name) => rowRestaurants.find((r) => r.name === name))
    .filter(Boolean)
    .map(({ sponsored: _sponsored, ...r }) => r)
  const dealsAfterIndex =
    activeCategory === ALL && dealsItems.length > 0
      ? visibleCategoryGroups.findIndex((group) => group.category === DEALS_AFTER)
      : -1
  const pickupAfterIndex = dealsAfterIndex >= 0 ? dealsAfterIndex + 1 : 1

  // adIndex riippuvuutena: ajastin nollautuu myös kun palloa painetaan, jolloin
  // käsin valittu mainos ehtii näkyä täyden ajan.
  useEffect(() => {
    const timer = setInterval(() => setAdIndex((i) => (i + 1) % HOME_ADS.length), AD_ROTATE_MS)
    return () => clearInterval(timer)
  }, [adIndex])

  // Bannerit ovat vierivällä radalla, joten indeksin vaihtuminen tarkoittaa
  // vieritystä eikä ristiinhäivytystä. offsetLeft luetaan diasta itsestään,
  // jottei leveyttä ja väliä tarvitse laskea uudestaan CSS:n rinnalla.
  useEffect(() => {
    const track = adTrackRef.current
    const slide = track?.children[adIndex]
    if (!track || !slide) return
    const target = slide.offsetLeft - track.offsetLeft
    // Jos rata on jo kohdallaan (esim. ensimmäinen renderöinti, adIndex=0 ja
    // scrollLeft=0), scrollTo ei liikuta mitään eikä siis laukaise yhtään
    // scroll-tapahtumaa - lippu jäisi ikuisesti "käynnissä"-tilaan eikä
    // ensimmäistä oikeaa pyyhkäisyä koskaan huomattaisi.
    if (Math.abs(track.scrollLeft - target) < 1) return
    isProgrammaticAdScroll.current = true
    adScrollTarget.current = target
    clearTimeout(adScrollSafetyTimer.current)
    // Varmuuskatkaisu: jos selain jostain syystä ei koskaan saavuta täsmälleen
    // kohdetta (esim. animaatio perutaan kesken), lippu ei saa jäädä ikuisesti
    // päälle ja tukkia kaikkea myöhempää pyyhkäisyä.
    adScrollSafetyTimer.current = setTimeout(() => {
      isProgrammaticAdScroll.current = false
    }, 1000)
    track.scrollTo({ left: target, behavior: 'smooth' })
  }, [adIndex])

  // Pyyhkäisy radalla päivittää pallot. Ilman tätä käsin vieritetty banneri
  // näyttäisi pallojen mukaan väärältä.
  //
  // isProgrammaticAdScroll suodattaa pois scrollTo():n omat tapahtumat: ilman
  // sitä tämä kuuntelija laskisi lähimmän dian jo animaation ensimmäisillä
  // freimeillä (jolloin rata on vielä lähellä lähtöruutua) ja asettaisi
  // adIndexin takaisin - mikä puolestaan laukaisisi yllä olevan efektin
  // vierittämään radan takaisin, eli nuoli näytti siltä että dia peruuntuu itse
  // itsensä kesken liikkeen.
  //
  // Lippu puretaan SIJAINNIN perusteella (onko rata saapunut adScrollTargetiin),
  // ei ajastimella - aiempi 120ms debounce -versio lakkasi luottamasta
  // ohjelmalliseen vieritykseen liian aikaisin aina kun selain ehti jättää yli
  // 120ms:n tauon kahden scroll-tapahtuman väliin kesken animaation, jolloin
  // tämä kuuntelija luuli sen olevan käyttäjän pyyhkäisy kesken matkan ja
  // laski adIndexin takaisin lähtöruutuun.
  useEffect(() => {
    const track = adTrackRef.current
    if (!track) return undefined

    function onTrackScroll() {
      if (isProgrammaticAdScroll.current) {
        if (Math.abs(track.scrollLeft - adScrollTarget.current) < 2) {
          isProgrammaticAdScroll.current = false
          clearTimeout(adScrollSafetyTimer.current)
        }
        return
      }

      const slides = Array.from(track.children)
      const nearest = slides.reduce(
        (best, slide, i) => {
          const distance = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft)
          return distance < best.distance ? { i, distance } : best
        },
        { i: 0, distance: Infinity },
      )
      setAdIndex((current) => (current === nearest.i ? current : nearest.i))
    }

    track.addEventListener('scroll', onTrackScroll, { passive: true })
    return () => {
      track.removeEventListener('scroll', onTrackScroll)
      clearTimeout(adScrollSafetyTimer.current)
    }
  }, [])

  // Hakuehdotukset ovat datassa oikeasti esiintyviä kategorioita, yleisimmät
  // ensin - ei käsin keksittyä listaa, joka vanhenisi kun valikoima muuttuu.
  const popularSearches = useMemo(() => {
    const counts = new Map()
    for (const restaurant of restaurants) {
      if (!restaurant.category) continue
      counts.set(restaurant.category, (counts.get(restaurant.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([category]) => category)
  }, [restaurants])

  // Samalla järjestyssäännöllä kuin rivit (lib/ranking.js).
  const popularRestaurants = useMemo(
    () =>
      rankRestaurants(withDistance(restaurants, deliveryAddress), { address: deliveryAddress, popularity })
        .filter((r) => !r.isPlaceholder)
        .slice(0, 8),
    [restaurants, deliveryAddress, popularity],
  )

  // Kategoriarivin nuolet. Vieritettävä säiliö haetaan napin omasta rivistä,
  // jolloin jokainen rivi ei tarvitse omaa refiä. Askel on kaksi korttia,
  // jotta nuoli tuntuu liikuttavan riviä eikä nytkäyttävän sitä.
  function scrollRow(e, direction) {
    const scroller = e.currentTarget.closest('.category-row')?.querySelector('.category-row__scroll')
    if (!scroller) return
    const card = scroller.querySelector('.restaurant-card')
    const step = card ? card.getBoundingClientRect().width + 16 : scroller.clientWidth * 0.8
    scroller.scrollBy({ left: direction * step * 2, behavior: 'smooth' })
  }

  return (
    <div className="page page--home">
      {/* Mobiilin koko ruudun hakunäkymä. Ehdotukset tulevat samasta
          SearchSuggest-komponentista kuin headerin pudotusvalikossa. */}
      {searchOpen && (
        <div className="home-search-overlay">
          <div className="home-search-overlay__bar">
            <div className="home-search">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2.2" />
                <path d="m17.5 17.5-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                aria-label="Hae Bidropista"
                placeholder="Hae Bidropista"
                value={searchQuery}
                autoFocus
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setSearchOpen(false)
                    navigate(`/haku?q=${encodeURIComponent(searchQuery.trim())}`)
                  }
                }}
              />
              {searchQuery && (
                <button type="button" aria-label="Tyhjennä haku" onClick={() => setSearchQuery('')}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              className="home-search-overlay__close"
              aria-label="Sulje haku"
              onClick={() => setSearchOpen(false)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {searchQuery.trim() ? (
            <SearchSuggest query={searchQuery} variant="fullscreen" onNavigate={() => setSearchOpen(false)} />
          ) : (
            <div className="home-search-start">
              {popularSearches.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Suositut haut</h3>
                  {/* Ehdotukset ovat kategorioita, joten ne vievät suoraan
                      kategoriasivulle - hakusanalla ne löytäisivät vain ne
                      ravintolat joiden NIMESSÄ sana esiintyy. */}
                  <div className="home-search-chips">
                    {popularSearches.map((term) => (
                      <Link key={term} to={`/kategoria/${categorySlug(term)}`} onClick={() => setSearchOpen(false)}>
                        {term}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {mobileCategoryGroups.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Kategoriat</h3>
                  <div className="home-search-cats">
                    {mobileCategoryGroups.map(({ category }) => {
                      const tile = CATEGORY_TILE_META[category] ?? DEFAULT_TILE_META
                      return (
                        <Link
                          key={category}
                          to={`/haku?q=${encodeURIComponent(category)}`}
                          className="home-cat-tile"
                          onClick={() => setSearchOpen(false)}
                        >
                          <span className="home-cat-tile__art" aria-hidden="true">
                            {tile.img ? <img src={tile.img} alt="" loading="lazy" /> : tile.emoji}
                          </span>
                          <span className="home-cat-tile__label">{category}</span>
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}

              {popularRestaurants.length > 0 && (
                <section className="home-search-start__section">
                  <h3 className="search-suggest-section__title">Suositut ravintolat</h3>
                  <div className="search-suggest-restaurants">
                    {popularRestaurants.map((r) => (
                      <RestaurantResultCard key={r.id} restaurant={r} onNavigate={() => setSearchOpen(false)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      <Header
        search={{ value: searchQuery, onChange: setSearchQuery, placeholder: 'Hae ravintoloita...' }}
        showAddress
        cart={
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
        }
      />

      {/* Työpöydän kategoriat teksteinä headerin alla, kiinni vieritettäessä. Tämä on
          sivun suora lapsi eikä .home-contentin sisällä, jotta sticky pysyy koko sivun. */}
      <CategoryBar />

      <main className="home-content">
        {/* Mobiilin yläosa: haku. Toimitusosoite kysytään vasta ravintolaa
            avattaessa (AddressGate), ei etusivulla. */}
        <div className="home-mobile-top">
          <div className="home-search" onClick={() => setSearchOpen(true)}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2.2" />
              <path d="m17.5 17.5-4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              aria-label="Hae ravintoloita"
              placeholder="Hae Bidropista"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" aria-label="Tyhjennä haku" onClick={() => setSearchQuery('')}>
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

        </div>

        {/* Työpöydän värikkäät kategorialaatikot korvattiin tekstipalkilla
            headerin alla (CategoryBar, käyttäjän pyyntö 25.10.2026). */}
        <div className="home-promo">
          <div className="home-ad">
            {/* Vierivä rata, jossa banneri kerrallaan näkyy useampi - sama idea
                kuin Woltin nostokarusellissa. Mukana sekä kampanjabannerit että
                ruokakuvanostot kategorioihin. */}
            <div className="home-ad__track" ref={adTrackRef}>
              {HOME_ADS.map((ad) => (
                <article
                  key={ad.id}
                  className={`home-ad__slide home-ad__slide--${ad.kind ?? 'promo'}`}
                  style={{ backgroundImage: `url(${ad.img})` }}
                >
                  <div className="home-ad__content">
                    <span className="home-ad__lead">
                      {ad.lead}
                      {ad.code && <span className="home-ad__code">{ad.code}</span>}
                      {ad.code && ' kassalla'}
                    </span>
                    <strong className="home-ad__title">{ad.title}</strong>
                  </div>
                </article>
              ))}
            </div>

            {/* Nuolet vain työpöydällä (piilotettu CSS:llä kapealla) - puhelimella
                pyyhkäisy ja pallot riittävät. */}
            <button
              type="button"
              className="home-ad__arrow home-ad__arrow--prev"
              aria-label="Edellinen mainos"
              onClick={() => setAdIndex((i) => (i - 1 + HOME_ADS.length) % HOME_ADS.length)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="home-ad__arrow home-ad__arrow--next"
              aria-label="Seuraava mainos"
              onClick={() => setAdIndex((i) => (i + 1) % HOME_ADS.length)}
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="home-ad__dots">
            {HOME_ADS.map((ad, i) => (
              <button
                key={ad.id}
                type="button"
                className={`home-ad__dot${i === adIndex ? ' home-ad__dot--active' : ''}`}
                aria-label={`Mainos ${i + 1}/${HOME_ADS.length}`}
                aria-current={i === adIndex}
                onClick={() => setAdIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Sticky kategoriarivi tarttuu headeriin. Tämä on tarkoituksella
            .home-content:n suora lapsi eikä .home-mobile-top:n sisällä: sticky
            pysyy vain oman vanhempansa laatikon sisällä, joten hakukentän
            vieressä se irtoaisi heti kun hakukenttä on vieritetty ohi. */}
        {mobileCategoryGroups.length > 0 && (
          <MobileCategoryRow categories={mobileCategoryGroups.map((group) => group.category)} rowsRef={rowsRef} />
        )}

        {status === 'loading' && <Spinner label="Haetaan ravintoloita" />}

        {status === 'error' && (
          <p className="state-message state-message--error">Ravintoloiden haku epäonnistui: {errorMessage}</p>
        )}

        {status === 'ready' && visibleCategoryGroups.length === 0 && (
          <p className="state-message">Ei ravintoloita näillä valinnoilla.</p>
        )}

        {/* Erillinen työpöytäruudukko poistettu: kategoriarivit otsikoineen
            näkyvät nyt molemmilla, joten ruudukko olisi sama sisältö toiseen
            kertaan ilman kategoriaotsikoita. Rivit näytetään myös ilman yhtään
            oikeaa ravintolaa (0042 poisti ne) - silloin niissä on pelkät mallit. */}
        {status === 'ready' && visibleCategoryGroups.length > 0 && (
          <div className="category-rows" ref={rowsRef}>
            {visibleCategoryGroups.map(
              ({ category, items }, groupIndex) =>
                items.length > 0 && (
                  <Fragment key={category}>
                    <section className="category-row" id={`cat-${categorySlug(category)}`}>
                      <div className="category-row__header">
                        <h2 className="category-row__title">{category}</h2>
                        <div className="category-row__actions">
                          {/* Lähelläsi-rivi ei ole kategoria, joten sillä ei ole omaa sivua. */}
                          {category !== NEARBY_ROW && (
                            <Link className="category-row__see-all" to={`/kategoria/${categorySlug(category)}`}>
                              Kaikki
                            </Link>
                          )}
                          {/* Nuolet vain työpöydällä - puhelimella rivi pyyhkäistään. */}
                          <button
                            type="button"
                            className="category-row__nav"
                            aria-label={`${category}: edelliset`}
                            onClick={(e) => scrollRow(e, -1)}
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="category-row__nav"
                            aria-label={`${category}: seuraavat`}
                            onClick={(e) => scrollRow(e, 1)}
                          >
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="m8 4 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="category-row__scroll">
                        {items.map((restaurant) => (
                          <RestaurantCard
                            key={restaurant.id}
                            restaurant={restaurant}
                            disabled={restaurant.isPlaceholder}
                            isFavorite={favoriteIds.has(restaurant.id)}
                            onToggleFavorite={restaurant.isPlaceholder ? undefined : toggleFavorite}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Kebab & Pizza -rivin jälkeen Kovimmat tarjoukset, sen jälkeisen
                        rivin perään tumma noutokuponki: rytmittää valkoista sivua
                        ja mainostaa noutotarjousta. */}
                    {groupIndex === dealsAfterIndex && (
                      <DealsRow
                        items={dealsItems}
                        favoriteIds={favoriteIds}
                        onToggleFavorite={toggleFavorite}
                        onScrollRow={scrollRow}
                      />
                    )}
                    {groupIndex === pickupAfterIndex && <PickupOfferBanner />}
                  </Fragment>
                ),
            )}
            <RankingInfo />
          </div>
        )}

      </main>

      {/* Kelluva ostoskori oikeassa alakulmassa headerin korikuvakkeen sijaan:
          pieni oranssi pallo, jossa vain ikoni ja tuotemäärä (käyttäjän pyyntö
          27.10.2026). Vie suoraan ostoskoriin; kori tyhjennetään siellä. */}
      {cart.count > 0 && (
        <Link
          to="/ostoskori"
          className="home-cart-fab"
          aria-label={`Ostoskori: ${cart.count} ${cart.count === 1 ? 'tuote' : 'tuotetta'}, ${formatPrice(cart.totalCents)}`}
        >
          <ShoppingBag size={22} strokeWidth={2} aria-hidden="true" />
          <span className="home-cart-fab__count" aria-hidden="true">
            {cart.count}
          </span>
        </Link>
      )}

      <Footer />
    </div>
  )
}

export default Home

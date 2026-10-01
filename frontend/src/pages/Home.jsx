import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import CategoryFilter from '../components/CategoryFilter.jsx'
import RestaurantCard from '../components/RestaurantCard.jsx'
import Spinner from '../components/Spinner.jsx'
import SearchSuggest, { RestaurantResultCard } from '../components/SearchSuggest.jsx'
import { getRestaurants } from '../lib/api.js'
import {
  ALL,
  CATEGORY_TILE_META,
  DEFAULT_TILE_META,
  CATEGORY_NAMES,
  FILLER_TEMPLATES_BY_CATEGORY,
  categorySlug,
  padWithFillers,
} from '../lib/categories.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { getFavoriteRestaurantIds, addFavorite, removeFavorite } from '../lib/favorites.js'
import { useCart } from '../lib/CartContext.jsx'
import { sortByDistance, useDeliveryAddress, withDistance } from '../lib/deliveryAddress.js'
import { formatPrice } from '../lib/format.js'
import './Home.css'

// Mobiilin kategoriariveille ei näytetä kahvilaosiota lainkaan (käyttäjän päätös).
const HIDDEN_MOBILE_CATEGORIES = ['Kahvila']

// "Lähelläsi"-rivi osoitteen antaneille: näin monta lähintä kaikista kategorioista.
const NEARBY_COUNT = 10
const NEARBY_ROW = 'Lähelläsi'

// Mainokset kiertävät automaattisesti. Kaikki kolme ovat oikeita: DELIVO10 ja
// TERVETULOA löytyvät kassan PROMO_CODES-listalta ja backendin payments-reitiltä,
// ja noudossa ei tosiaan veloiteta kuljetusmaksua (ks. DELIVERY_FEE_CENTS).
// Järjestys on tarkoituksella sekoitettu väreittäin, ei lisäysjärjestyksessä:
// tervetuloa (punainen lahjapaketti) ja Mcdonalds (punainen kuva) on pidetty
// erillään toisistaan niin ettei kaksi punaista diaa voi koskaan osua
// peräkkäin - työpöydällä niitä näkyy kaksi rinnakkain kerrallaan, joten
// vierekkäiset diat näkyvät aina samaan aikaan.
const HOME_ADS = [
  {
    id: 'delivo10',
    img: '/promo-banner.png',
    code: 'DELIVO10',
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
    title: 'Ei kuljetusmaksua — säästä 5,99 €',
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
  const [isScrolled, setIsScrolled] = useState(false)
  const [adIndex, setAdIndex] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState(() => new Set())
  const [activeRowSlug, setActiveRowSlug] = useState(null)
  const [cartFabOpen, setCartFabOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { customer } = useAuth()
  const navigate = useNavigate()
  const rowsRef = useRef(null)
  const cartFabRef = useRef(null)
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

  // Kategoriarivi näyttää koko vakiolistan (CATEGORY_NAMES), ei vain niitä
  // joissa on jo ravintoloita - muuten uusi kategoria ei näkyisi ennen kuin
  // sinne saadaan ensimmäinen ravintola. "Ilmainen kuljetus" ei ole enää
  // rivillä: se on suodatin, ei ruokalaji.
  const categories = [ALL, ...CATEGORY_NAMES]

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
      // Järjestys pysyy ennallaan (mainospaikat), kortit vain saavat etäisyyden.
      // Etäisyysjärjestys on ainoastaan Lähelläsi-rivillä.
      items: withDistance(
        padWithFillers(
          category,
          baseFiltered.filter((r) => r.category === category),
        ),
        deliveryAddress,
      ),
    }))
    .filter((group) => group.items.length > 0)

  // Lähimmät kaikista kategorioista omana rivinään ennen kategorioita - se on
  // koko osoitteen kysymisen pointti. Ilman osoitetta riviä ei ole.
  const nearbyGroup = deliveryAddress
    ? {
        category: NEARBY_ROW,
        items: sortByDistance(
          mobileCategoryGroups.flatMap((group) => group.items),
          deliveryAddress,
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

  // Vieritettäessä kategoriarivi kutistuu pillereiksi, jotta headeriin kiinni
  // jäävä yläosa vie mahdollisimman vähän ruutua.
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 64)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // Suosikit haetaan kerralla yhdellä kyselyllä, jotta jokainen kortti ei tee omaansa.
  useEffect(() => {
    if (!customer?.id) {
      setFavoriteIds(new Set())
      return
    }
    let cancelled = false
    getFavoriteRestaurantIds(customer.id)
      .then((ids) => {
        if (!cancelled) setFavoriteIds(new Set(ids))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [customer?.id])

  // Korostaa kategoriapallon sen mukaan mikä rivi on näkyvissä, jotta aktiivinen
  // tila kertoo oikeasti sijainnin sivulla eikä ole pelkkä koriste.
  useEffect(() => {
    const sections = rowsRef.current?.querySelectorAll('.category-row')
    if (!sections?.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiveRowSlug(visible.target.id.replace(/^cat-/, ''))
      },
      { rootMargin: '-150px 0px -60% 0px' },
    )
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [mobileCategoryGroups.length])

  // Painallus napin ulkopuolelle sulkee sen, ettei laajennettu tila jää päälle
  // ja tee seuraavasta osumasta vahingossa navigointia.
  useEffect(() => {
    if (!cartFabOpen) return undefined
    function handleClickOutside(e) {
      if (!cartFabRef.current?.contains(e.target)) setCartFabOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [cartFabOpen])

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

  const popularRestaurants = useMemo(() => {
    const open = restaurants.filter((r) => r.is_open !== false)
    const pool = open.length > 0 ? open : restaurants
    return [...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8)
  }, [restaurants])

  async function toggleFavorite(restaurantId) {
    if (!customer?.id) return
    const isFav = favoriteIds.has(restaurantId)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(restaurantId)
      else next.add(restaurantId)
      return next
    })
    try {
      if (isFav) await removeFavorite(customer.id, restaurantId)
      else await addFavorite(customer.id, restaurantId)
    } catch {
      // Palautetaan näkymä jos tallennus ei mennyt läpi.
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(restaurantId)
        else next.delete(restaurantId)
        return next
      })
    }
  }

  function scrollToCategory(e, category) {
    e.preventDefault()
    document.getElementById(`cat-${categorySlug(category)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
                aria-label="Hae delivosta"
                placeholder="Hae delivosta"
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
                          to={`/kategoria/${categorySlug(category)}`}
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
              placeholder="Hae delivosta"
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

        {/* Kategoriat ennen banneria: sama järjestys kuin Woltissa - ensin
            mitä haetaan, sitten kampanja, sitten ravintolat. Mobiilissa tämä
            rivi on piilossa (CategoryFilter.css), joten mobiilin järjestys ei
            muutu: haku, banneri, sticky kategoriarivi, kategoriarivit. */}
        {status === 'ready' && categories.length > 1 && (
          <CategoryFilter categories={categories} />
        )}

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
                    <button
                      type="button"
                      className="home-ad__cta"
                      onClick={(e) => mobileCategoryGroups[0] && scrollToCategory(e, mobileCategoryGroups[0].category)}
                    >
                      Tilaa nyt
                    </button>
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
          <div className={`home-quick-cats${isScrolled ? ' home-quick-cats--compact' : ''}`}>
            {mobileCategoryGroups.map(({ category }) => {
              const tile = CATEGORY_TILE_META[category] ?? DEFAULT_TILE_META
              return (
                <a
                  key={category}
                  href={`#cat-${categorySlug(category)}`}
                  className={`home-cat-tile${
                    activeRowSlug === categorySlug(category) ? ' home-cat-tile--active' : ''
                  }`}
                  onClick={(e) => scrollToCategory(e, category)}
                >
                  <span className="home-cat-tile__art" aria-hidden="true">
                    {tile.img ? <img src={tile.img} alt="" loading="lazy" /> : tile.emoji}
                  </span>
                  <span className="home-cat-tile__label">{category}</span>
                </a>
              )
            })}
          </div>
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
                            onToggleFavorite={customer && !restaurant.isPlaceholder && !restaurant.isDemo ? toggleFavorite : undefined}
                          />
                        ))}
                      </div>
                    </section>

                    {/* Tumma jakaja toisen kategoriarivin jälkeen: rytmittää
                        valkoista sivua ja kertoo samalla delivon ydinlupauksen. */}
                    {groupIndex === 1 && (
                      <div className="home-pickup-banner">
                        <span className="home-pickup-banner__icon" aria-hidden="true">
                          🛍️
                        </span>
                        <span className="home-pickup-banner__text">
                          <strong>Nouda itse, ei kuljetusmaksua</strong>
                          <span>Säästät {formatPrice(599)} jokaisesta tilauksesta</span>
                        </span>
                      </div>
                    )}
                  </Fragment>
                ),
            )}
          </div>
        )}

      </main>

      {/* Kelluva ostoskori alareunassa headerin korikuvakkeen sijaan: se on
          peukalon ulottuvilla ja näyttää summan ilman että koria avaa.
          Ensimmäinen painallus levittää napin ja paljastaa tyhjennyksen,
          toinen vie ostoskoriin - näin tyhjennys ei ole vahingossa osuvan
          napin takana, mutta kassalle pääsee silti kahdella painalluksella. */}
      {cart.count > 0 && (
        <div className={`home-cart-fab${cartFabOpen ? ' home-cart-fab--open' : ''}`} ref={cartFabRef}>
          <Link
            to="/ostoskori"
            className="home-cart-fab__main"
            onClick={(e) => {
              if (!cartFabOpen) {
                e.preventDefault()
                setCartFabOpen(true)
              }
            }}
          >
            <span className="home-cart-fab__icon" aria-hidden="true">
              <ShoppingBag size={18} />
              <span className="home-cart-fab__count">{cart.count}</span>
            </span>
            <span>Ostoskori</span>
            <span className="home-cart-fab__total">{formatPrice(cart.totalCents)}</span>
          </Link>

          <button
            type="button"
            className="home-cart-fab__clear"
            aria-hidden={!cartFabOpen}
            tabIndex={cartFabOpen ? 0 : -1}
            onClick={() => {
              cart.clear()
              setCartFabOpen(false)
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Tyhjennä
          </button>
        </div>
      )}

      <Footer />
    </div>
  )
}

export default Home

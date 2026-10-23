import { Fragment, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowRight,
  BellRing,
  Bike,
  BriefcaseBusiness,
  ChevronDown,
  Clock,
  MapPin,
  Smartphone,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react'
import DelivoLogo from '../components/DelivoLogo.jsx'
import Footer from '../components/Footer.jsx'
import PartnerHeader from '../components/PartnerHeader.jsx'
import {
  DoodleArrow,
  DoodleSparkle,
  DoodleUnderline,
  FoodMarquee,
  JourneyMap,
  Note,
  OrdersMockup,
  Reveal,
} from '../components/partner/PartnerVisuals.jsx'
import { COMPANY } from '../lib/company.js'
import { DELIVERY_PRICE_RANGE, SERVICE_FEE_CENTS } from '../lib/delivery.js'
import { DELIVERY_BID } from '../lib/deliveryTime.js'
import { formatPrice } from '../lib/format.js'
import {
  COMMITMENT_MONTHS,
  DEVICE_SETUP_CENTS,
  EXTRA_DELIVERY_CENTS,
  PARTNER_PLANS,
  findPlan,
  formatWholePrice,
  planOrdersLabel,
} from '../lib/partnerPlans.js'
import './PartnerLanding.css'

const JOURNEY_STEPS = [
  { title: 'Asiakas tilaa', body: 'Kotiinkuljetuksessa lähellä olevat kuljettajat tarjoavat hinnan, ja asiakas valitsee.' },
  { title: 'Ravintola hyväksyy', body: 'Kun kuljetuksesta on sovittu, tilaus tulee laitteellesi ja valitset valmistusajan.' },
  { title: 'Kuljettaja noutaa', body: 'Valittu kuljettaja hakee tilauksen, kun ruoka on valmis.' },
  { title: 'Perillä', body: 'Asiakas seuraa kuljettajaa kartalla koko matkan.' },
]

const RESTAURANT_POINTS = [
  { Icon: BellRing, text: 'Tilaukset reaaliajassa tilauslaitteelle ja kojelaudalle' },
  { Icon: UtensilsCrossed, text: 'Ruokalista, hinnat ja aukiolot omissa käsissäsi' },
  { Icon: TrendingUp, text: 'Myynti ja arvioitu tilitys jokaisesta tilauksesta' },
  { Icon: Bike, text: 'Kotiinkuljetus ilman omia kuljettajia' },
]

const ONBOARDING = [
  { title: 'Jätä hakemus', body: 'Yrityksesi ja ravintolasi tiedot muutamassa minuutissa.' },
  { title: 'Sopimus', body: 'Käsittelemme hakemuksen, sovimme paketin ja teemme kirjallisen sopimuksen.' },
  {
    title: 'Asennus ja avaus',
    body: 'Asennamme kojelaudan tablettiisi (tai tuomme tabletin), lisäät ruokalistan ja tilaukset alkavat - yleensä 1–2 viikossa hakemuksesta.',
  },
]

const FEATURED_PLAN = 'kuljetus'

const PICKUP_PLAN = findPlan('nouto')
const DELIVERY_PLAN = findPlan('kuljetus')
const LARGE_PLAN = findPlan('iso')
// Kuukausitilausmäärä, josta Iso ravintola tulee Kuljetus-pakettia edullisemmaksi (50:n tarkkuudella).
const LARGE_PLAN_FROM =
  Math.round(
    (DELIVERY_PLAN.includedDeliveries + (LARGE_PLAN.priceCents - DELIVERY_PLAN.priceCents) / EXTRA_DELIVERY_CENTS) / 50,
  ) * 50

const COURIER_BENEFITS = [
  { Icon: Clock, title: 'Omat työajat', body: 'Mene online-tilaan silloin kun sopii.' },
  { Icon: MapPin, title: 'Keikat lähelläsi', body: 'Näet tilaukset 8 km säteellä ja tarjoat niihin.' },
  { Icon: Wallet, title: 'Sinä hinnoittelet', body: `Tarjoat ${DELIVERY_PRICE_RANGE}, ja koko hinta on sinun.` },
  { Icon: Smartphone, title: 'Kaikki sovelluksessa', body: 'Nouto koodilla, toimitus kuitataan sijainnilla.' },
]

// Valokuvat: Unsplash (ilmainen lisenssi). Pizzauuni Fabrizio Pullara, mopolähetti
// Rowan Freeman, pyörälähetti Patrick Connor Klopf, tilauslaput mediha ekici,
// annostelu Ruben Mavarez ja kokki Tommaso Ubezio. Ei kilpailijoiden logoja.
const POLAROIDS = [
  { image: '/partner/order-tickets.jpg', caption: 'uusi tilaus 18.42' },
  { image: '/partner/plating.jpg', caption: 'annostelu käynnissä' },
  { image: '/partner/chef.jpg', caption: 'valmis lähtöön!' },
]

const FAQ_ITEMS = [
  {
    q: 'Paljonko Bidrop maksaa ravintolalle?',
    a: `Vain kiinteän kuukausimaksun, provisiota tilauksista ei ole: ${PICKUP_PLAN.name} ${formatPrice(PICKUP_PLAN.priceCents)}/kk (vain noutotilaukset), ${DELIVERY_PLAN.name} ${formatPrice(DELIVERY_PLAN.priceCents)}/kk (sisältää ${DELIVERY_PLAN.includedDeliveries} kuljetustilausta kuukaudessa) tai ${LARGE_PLAN.name} ${formatPrice(LARGE_PLAN.priceCents)}/kk (sisältää ${LARGE_PLAN.includedDeliveries.toLocaleString('fi-FI')} kuljetustilausta). Lisäksi käyttöönotto (asennus, koulutus ja tarvittaessa tabletti) maksaa kertaalleen ${formatWholePrice(DEVICE_SETUP_CENTS)}. Kaikki hinnat + alv.`,
  },
  {
    q: 'Entä jos kuljetustilauksia tulee yli paketin?',
    a: `Paketin ylittävistä kuljetustilauksista peritään ${formatPrice(EXTRA_DELIVERY_CENTS)} kappaleelta, ei prosenttia. Jos kuljetustilauksia tulee säännöllisesti yli ${LARGE_PLAN_FROM} kuukaudessa, ${LARGE_PLAN.name} -paketti tulee edullisemmaksi.`,
  },
  {
    q: 'Onko sopimuksessa sitoutumisaikaa?',
    a: `Kyllä, sitoutumisaika on ${COMMITMENT_MONTHS} kuukautta, minkä jälkeen sopimuksen voi irtisanoa kuukauden irtisanomisajalla. Isompaan pakettiin voit nostaa milloin tahansa, pienempään siirtyä seuraavan laskutuskauden alusta.`,
  },
  {
    q: 'Kauanko aloitus kestää?',
    a: 'Yleensä 1–2 viikkoa hakemuksesta: käsittelemme hakemuksen, teemme sopimuksen ja asennamme kojelaudan. Ruokalistan lisäät itse kojelaudalla.',
  },
  {
    q: 'Tarvitsenko oman tabletin?',
    a: `Et välttämättä. Kojelauta toimii omalla tabletilla tai puhelimella selaimessa. Jos sopivaa laitetta ei ole, tuomme tabletin - se sisältyy ${formatWholePrice(DEVICE_SETUP_CENTS)} käyttöönottoon.`,
  },
  {
    q: 'Miten haen ravintolana mukaan?',
    a: 'Täytä kumppanuushakemus yritys- ja ravintolatiedoillasi, mukaan lukien Y-tunnus. Käsittelemme hakemuksen ja olemme sinuun yhteydessä sähköpostitse.',
  },
  {
    q: 'Hoidatteko kuljetuksen puolestani?',
    a: 'Kyllä, Kuljetus- ja Iso ravintola -paketeissa. Kotiinkuljetuksen hinnasta asiakas sopii Bidropin kuljettajan kanssa ennen kuin tilaus tulee sinulle, ja kuljettaja hakee ruoan kun se on valmis. Omia kuljettajia ei tarvita.',
  },
  {
    q: 'Paljonko kuljettaja tienaa?',
    a: `Tarjoat jokaiseen keikkaan oman hintasi (${DELIVERY_PRICE_RANGE}). Kun asiakas hyväksyy, koko hinta on sinun - Bidrop ei ota siitä osuutta. Asiakas voi myös tarjota oman hintansa, jonka voit hyväksyä suoraan.`,
  },
  {
    q: 'Pitääkö kuljettajalla olla yritys?',
    a: 'Kyllä. Kuljettajana toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä laskutuspalvelun kautta.',
  },
  {
    q: 'Milloin kuljettajalle maksetaan?',
    a: 'Kahden viikon välein. Bidrop laskee ansiot sovelluksen keikoista ja tekee laskun puolestasi, joten sinun ei tarvitse laskuttaa itse.',
  },
  {
    q: 'Millä puhelimella kuljettajasovellus toimii?',
    a: 'Android- ja iPhone-puhelimilla. Sijaintia käytetään vain, kun olet online-tilassa tai keikalla.',
  },
  {
    q: 'Miten keikat jaetaan kuljettajille?',
    a: `Kotiinkuljetustilaus näkyy online-tilassa oleville kuljettajille 8 km säteellä. Kukin tarjoaa hintansa, ja asiakas valitsee. Jos hinnasta ei sovita ${DELIVERY_BID.biddingMinutes} minuutissa, tilaus perutaan eikä asiakasta veloiteta.`,
  },
]

// Ravintolan vaatimukset ja ehtojen tiivistelmä (luonnos 22.10.2026). Hinnat ja
// sitoutumisaika tulevat partnerPlans.js:stä, jotta ne pysyvät samoina
// hinnaston, UKK:n ja hakemuslomakkeen kanssa.
const RESTAURANT_REQUIREMENTS = [
  'Y-tunnus ja ravintola Kuopiossa - kotiinkuljetus noin 8 km säteellä ravintolasta.',
  'Ilmoitus elintarvikehuoneistosta ja omavalvontasuunnitelma.',
  'Ruokalista hintoineen ja allergeenitietoineen - kuvat suositeltavia.',
  'Tabletti tai puhelin, jossa kojelauta on auki aukioloaikoina. Jos sellaista ei ole, tuomme tabletin.',
]

const TERMS = [
  {
    title: 'Sitoutuminen ja irtisanominen',
    items: [
      `Sopimus on ${COMMITMENT_MONTHS} kuukauden määräaikainen.`,
      `${COMMITMENT_MONTHS} kuukauden jälkeen sopimus jatkuu toistaiseksi voimassa olevana, ja sen voi irtisanoa 1 kuukauden irtisanomisajalla.`,
      'Kumpikin osapuoli voi purkaa sopimuksen heti, jos toinen rikkoo ehtoja olennaisesti eikä korjaa asiaa 14 päivän kuluessa huomautuksesta.',
      'Paketin voi nostaa isompaan milloin tahansa. Pienempään voi siirtyä seuraavan laskutuskauden alusta.',
      'Bidrop ilmoittaa hintamuutoksista vähintään 30 päivää etukäteen. Hinnat eivät nouse ensimmäisen 12 kuukauden aikana.',
    ],
  },
  {
    title: 'Tilitykset ja laskutus',
    items: [
      'Asiakkaiden maksamat ruokasummat tilitetään ravintolan tilille kahden viikon välein yhteenvedon kera.',
      'Kuukausimaksu laskutetaan kuukauden alussa, maksuaika 14 päivää.',
      'Jos ravintolan tilitykset ja Bidropin laskut ovat samalta kaudelta, ne voidaan sopia kuitattavaksi keskenään.',
    ],
  },
  {
    title: 'Kampanjat ja tarjoukset',
    intro:
      'Bidrop voi tehdä ravintolan tuotteisiin tarjouksia ja alennuksia tuodakseen ravintolalle lisää tilauksia. Ravintolan tuotteisiin tehdyn alennuksen kustannus kuuluu ravintolalle, eli ravintola saa tilauksesta alennetun hinnan. Jotta tämä on reilua, Bidrop sitoutuu näihin rajoihin:',
    ordered: [
      'Enintään 20 % alennus tuotteen normaalihinnasta.',
      'Enintään 2 kampanjaa kuukaudessa, ja yksi kampanja kestää enintään 7 päivää.',
      'Ravintolan alennusten yhteiskustannus on enintään 150 € kuukaudessa, ellei ravintola itse hyväksy enempää.',
      'Bidrop ilmoittaa kampanjasta vähintään 7 päivää etukäteen (tuotteet, alennus, ajankohta).',
      'Ravintola voi kieltäytyä kampanjasta ilmoittamalla siitä ennen kampanjan alkua, ilman seuraamuksia. Ravintola voi myös kieltää kampanjat kokonaan asetuksista.',
      'Alennus ei koske alkoholijuomia eikä tuotteita, jotka ravintola on merkinnyt kampanjoiden ulkopuolelle.',
      'Jos Bidrop itse jakaa asiakkaalle alennuskoodin (esim. "ensimmäinen tilaus –5 €"), Bidrop maksaa sen, ei ravintola.',
    ],
    outro: 'Ravintola voi lisäksi tehdä omia tarjouksiaan sovelluksessa milloin haluaa.',
  },
  {
    title: 'Peruutukset ja reklamaatiot',
    items: [
      {
        lead: 'Ravintolan virhe (tuote loppu, väärä tai puutteellinen annos, laatuongelma):',
        text: 'asiakkaalle palautettava summa vähennetään ravintolan seuraavasta tilityksestä.',
      },
      {
        lead: 'Kuljetuksen tai Bidropin virhe (myöhästyminen kuljettajan takia, ruoka vahingoittunut matkalla, tekninen vika):',
        text: 'Bidrop vastaa hyvityksestä.',
      },
      {
        lead: 'Asiakas peruu ennen kuin ravintola on hyväksynyt tilauksen:',
        text: 'ei kustannuksia ravintolalle. Hyväksymisen jälkeen tilausta ei voi perua ilman ravintolan suostumusta.',
      },
      'Ravintola vastaa Bidropin kautta tulleeseen reklamaatioon 24 tunnin kuluessa. Epäselvissä tapauksissa Bidrop selvittää asian ja kertoo ratkaisun perusteluineen.',
    ],
  },
  {
    title: 'Ravintolan vastuut',
    items: [
      'Hinnat, tuotetiedot ja allergeenitiedot pidetään ajan tasalla sovelluksessa.',
      'Aukioloajat ovat oikein, ja ravintola sulkee tilausten vastaanoton, jos ei pysty valmistamaan tilauksia.',
      'Ruoka pakataan niin, että se kestää kuljetuksen.',
      'Ravintolalla on voimassa olevat elintarvikeluvat (omavalvonta, ilmoitus elintarvikehuoneistosta).',
    ],
  },
  {
    title: 'Tietojen muutokset ja arvostelut',
    items: [
      'Ruokalistan, hinnat, kuvat ja aukioloajat ravintola muuttaa itse kojelaudalla milloin tahansa.',
      'Ravintolan nimi, osoite, Y-tunnus, tilinumero ja paketti muuttuvat muutospyynnöllä, johon liitetään dokumentti (esim. kaupparekisteriote tai pankkitodiste). Bidrop käsittelee pyynnön yleensä 1–2 arkipäivässä.',
      'Asiakas voi arvostella ravintolan vain valmiin tilauksen jälkeen. Ravintola voi vastata arvosteluihin, mutta ei poistaa niitä. Asiattomat arvostelut Bidrop poistaa.',
    ],
  },
]

// "Kuljettajan ehdot": pelisäännöt ja käytännöt tiivistelmänä (luonnos
// 22.10.2026, käyttäjän päätökset). Hintahaarukka ja osuus deliveryTime.js:stä.
const COURIER_TERMS = [
  {
    title: 'Ansiot ja maksut',
    items: [
      `Tarjoat jokaiseen keikkaan hinnan (${DELIVERY_PRICE_RANGE}). Asiakas hyväksyy tarjouksesi tai tarjoaa omaa hintaansa, jonka voit hyväksyä. Koko sovittu hinta on sinun - Bidrop ei ota siitä osuutta.`,
      'Ansiot maksetaan kahden viikon välein. Bidrop laskee ne sovelluksen keikoista ja tekee laskun puolestasi (itselaskutus), joten sinun ei tarvitse laskuttaa itse.',
      'Yrittäjänä hoidat itse tuloverosi ja mahdollisen arvonlisäveron. Kevytyrittäjänä laskutuspalvelu (esim. UKKO.fi tai Eezy) hoitaa ne puolestasi.',
    ],
  },
  {
    title: 'Aloitus ja dokumentit',
    items: [
      'Toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä. Ikäraja on 18 vuotta.',
      'Lisää sovelluksessa henkilöllisyystodistus. Autolla tai mopolla ajaessa tarvitaan myös ajokortti, ja omalla yrityksellä laskuttaessa pankkitodiste tilinumerosta.',
      'Pääset online-tilaan, kun Bidrop on hyväksynyt dokumentit - yleensä 1–2 arkipäivässä.',
    ],
  },
  {
    title: 'Keikat',
    items: [
      'Mene online-tilaan silloin kun haluat - vuorolistoja ei ole.',
      'Näet kotiinkuljetustilaukset noin 8 km säteellä: ravintolan, ruoan summan, matkan ja asiakkaan mahdollisen hintatarjouksen. Tarkka osoite näkyy, kun asiakas on valinnut sinut.',
      'Voit tehdä yhden hintatarjouksen kerrallaan. Kun asiakas valitsee sinut, keikka on sinun.',
      'Jos toinen kuljettaja luopuu keikasta, se tarjotaan suoraan lähimmälle samalla hinnalla - sinulla on 60 sekuntia aikaa vastata. Kaksi vastaamatonta peräkkäin siirtää sinut offline-tilaan.',
      'Hyväksytyn keikan voi perua ennen noutoa, jolloin se siirtyy toiselle kuljettajalle.',
    ],
  },
  {
    title: 'Nouto ja toimitus',
    items: [
      'Ravintola antaa noutokoodin, jolla kuittaat noudon sovelluksessa.',
      'Toimitus kuitataan sovelluksessa perillä, ja sijaintisi tarkistetaan toimitusosoitteen kohdalla.',
      'Jos asiakasta ei tavoiteta, osoite on väärä tai ruoka vahingoittuu matkalla, ota yhteyttä tukeen sovelluksesta.',
    ],
  },
  {
    title: 'Varusteet ja vakuutus',
    items: [
      'Ruoka kuljetetaan puhtaassa, lämpöä pitävässä laukussa. Oma laukku käy, ja Bidrop-laukun voi halutessaan ostaa omakustannushintaan.',
      'Yrittäjänä et kuulu työnantajan lakisääteiseen tapaturmavakuutukseen, joten oma tapaturmavakuutus on suositeltava. Kevytyrittäjäpalveluissa se on usein mukana.',
      'Huolehdit itse kulkuneuvosi kunnosta ja sen vakuutuksista.',
    ],
  },
  {
    title: 'Sovellus ja sijainti',
    items: [
      'Kuljettajasovellus toimii Android- ja iPhone-puhelimilla.',
      'Sijaintiasi käytetään vain, kun olet online-tilassa tai keikalla: lähimmän kuljettajan valintaan, toimituksen kuittaukseen ja siihen, että asiakas näkee kuljetuksen etenemisen.',
      'Kun olet offline, sijaintiasi ei seurata.',
    ],
  },
  {
    title: 'Tietojen muutokset ja tilin sulkeminen',
    items: [
      'Nimi, sähköposti, kulkuneuvo, Y-tunnus ja tilinumero muuttuvat muutospyynnöllä sovelluksessa. Puhelinnumeron ja sovelluksen asetukset muutat itse.',
      'Bidrop voi sulkea tilin, jos dokumentit eivät ole voimassa tai ehtoja rikotaan olennaisesti.',
    ],
  },
]

// Ehdot avattavina kohtina (<details>), jotta sivu ei veny.
function TermsItem({ title, items, intro, ordered, outro }) {
  return (
    <details className="pl-terms__item">
      <summary>
        {title}
        <ChevronDown size={22} strokeWidth={2.4} aria-hidden="true" />
      </summary>
      <div className="pl-terms__body">
        {intro && <p>{intro}</p>}
        {ordered && (
          <ol>
            {ordered.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ol>
        )}
        {items && (
          <ul>
            {items.map((item) =>
              typeof item === 'string' ? (
                <li key={item}>{item}</li>
              ) : (
                <li key={item.lead}>
                  <strong>{item.lead}</strong> {item.text}
                </li>
              ),
            )}
          </ul>
        )}
        {outro && <p>{outro}</p>}
      </div>
    </details>
  )
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Usein kysytyt keskusteluna: kysymys napista, delivo "kirjoittaa" vastauksen.
function ChatFaq() {
  const [asked, setAsked] = useState([])
  const [typing, setTyping] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  function ask(index) {
    if (typing !== null) return
    setAsked((list) => [...list, index])
    if (prefersReducedMotion()) return
    setTyping(index)
    timer.current = setTimeout(() => setTyping(null), 750)
  }

  const remaining = FAQ_ITEMS.map((_, index) => index).filter((index) => !asked.includes(index))

  return (
    <div className="pl-chat">
      <div className="pl-chat__log" aria-live="polite">
        <div className="pl-bubble pl-bubble--delivo">
          <span className="pl-bubble__avatar" aria-hidden="true">
            d
          </span>
          <p>Hei! Mitä haluaisit tietää? Valitse kysymys alta.</p>
        </div>
        {asked.map((index) => (
          <Fragment key={index}>
            <div className="pl-bubble pl-bubble--you">
              <p>{FAQ_ITEMS[index].q}</p>
            </div>
            <div className="pl-bubble pl-bubble--delivo">
              <span className="pl-bubble__avatar" aria-hidden="true">
                d
              </span>
              {typing === index ? (
                <p className="pl-bubble__typing" aria-label="Bidrop kirjoittaa">
                  <span />
                  <span />
                  <span />
                </p>
              ) : (
                <p>{FAQ_ITEMS[index].a}</p>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <div className="pl-chat__chips">
        {remaining.length > 0 ? (
          remaining.map((index) => (
            <button type="button" key={index} onClick={() => ask(index)} disabled={typing !== null}>
              {FAQ_ITEMS[index].q}
            </button>
          ))
        ) : (
          <button type="button" onClick={() => setAsked([])}>
            Aloita alusta
          </button>
        )}
      </div>
    </div>
  )
}

// delivon kumppanisivu ravintoloille ja kuljettajille. Tarkoituksella vaihteleva:
// jaettu kuvahero, liikkuva ruokanauha, piirretty tilauksen reitti, käsin
// kirjoitetut huomautukset, hinnasto ruokalistana polaroideineen, tiivis musta
// kuljettajaosio kuittilaskurilla ja kysymykset keskusteluna. Oranssi on pieni
// korostus, pinnat valkoisia, mustia ja oikeita valokuvia.
const HERO_SIDES = ['Ravintoloille', 'Kuljettajille']

function PartnerLanding() {
  // Puhelimella heron puoliskot ovat vierekkäin pyyhkäistävinä kortteina.
  const splitRef = useRef(null)
  const [heroSide, setHeroSide] = useState(0)

  function handleHeroScroll() {
    const el = splitRef.current
    const max = el.scrollWidth - el.clientWidth
    if (max > 0) setHeroSide(el.scrollLeft > max / 2 ? 1 : 0)
  }

  function showHeroSide(index) {
    const el = splitRef.current
    el.scrollTo({ left: index === 0 ? 0 : el.scrollWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="page">
      <PartnerHeader />

      <main className="pl">
        <h1 className="pl-sr-only">Bidrop kumppanit – ravintoloille ja kuljettajille</h1>

        <section className="ph">
          <div className="ph__intro">
            <p className="ph__brand">
              <DelivoLogo className="ph__logo" /> <span>kumppanit</span>
            </p>
            <Reveal as="p" className="ph__pick">
              <Note>valitse puolesi</Note>
              <DoodleArrow className="ph__pick-arrow" />
            </Reveal>
            <div className="ph__switch" aria-hidden="true">
              {HERO_SIDES.map((label, index) => (
                <button
                  type="button"
                  tabIndex={-1}
                  key={label}
                  className={heroSide === index ? 'is-active' : ''}
                  onClick={() => showHeroSide(index)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="ph__split" ref={splitRef} onScroll={handleHeroScroll}>
            <article className="ph__half ph__half--restaurant">
              <img className="ph__img" src="/partner/pizza-oven.jpg" alt="" />
              <div className="ph__text">
                <span className="ph__label">Ravintoloille</span>
                <h2>
                  Sinun keittiösi.
                  <br />
                  Meidän kyytimme.
                </h2>
                <p>Uudet asiakkaat, tilaukset suoraan omalle laitteelle ja kotiinkuljetus ilman omia kuljettajia.</p>
                <div className="ph__actions">
                  <Link to="/kumppani/rekisteroidy" className="ph-btn">
                    Jätä hakemus
                  </Link>
                  <a href="#ravintoloille" className="ph-link">
                    Lue lisää <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <span className="ph-sticker ph-sticker--orange">
                <strong>0 %</strong>
                provisiota, vain kuukausimaksu
              </span>
            </article>

            <article className="ph__half ph__half--courier">
              <img className="ph__img" src="/partner/scooter-courier.jpg" alt="" />
              <div className="ph__text">
                <span className="ph__label">Kuljettajille</span>
                <h2>
                  Sinun aikasi.
                  <br />
                  Sinun keikkasi.
                </h2>
                <p>Aja silloin kun sinulle sopii. Tarjoat keikoille oman hintasi, ja asiakas valitsee.</p>
                <div className="ph__actions">
                  <Link to="/kumppani/kuljettajaksi" className="ph-btn">
                    Hae kuljettajaksi
                  </Link>
                  <a href="#kuljettajille" className="ph-link">
                    Lue lisää <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
                  </a>
                </div>
              </div>
              <span className="ph-sticker ph-sticker--white">
                <strong>{DELIVERY_PRICE_RANGE}</strong>sinä hinnoittelet
              </span>
            </article>
          </div>
        </section>

        <FoodMarquee />

        <section className="pl-journey" id="nain-se-toimii">
          <div className="pl-container">
            <Reveal className="pl-journey__head">
              <h2 className="pl-title">Näin tilaus kulkee</h2>
              <Note className="pl-journey__note">kaikki reaaliajassa!</Note>
              <DoodleSparkle className="pl-journey__sparkle" />
            </Reveal>
            <Reveal className="pl-journey__map">
              <JourneyMap />
            </Reveal>
            <ol className="pl-journey__steps">
              {JOURNEY_STEPS.map((step, index) => (
                <Reveal as="li" delay={index * 110} key={step.title}>
                  <span className="pl-journey__num">{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="pl-section" id="ravintoloille">
          <div className="pl-container pl-resto">
            <Reveal className="pl-resto__device">
              <OrdersMockup />
              <span className="pl-annot pl-annot--order">
                <Note>uusi tilaus kilahtaa</Note>
                <DoodleArrow className="pl-annot__arrow" />
              </span>
              <span className="pl-annot pl-annot--sales">
                <DoodleArrow className="pl-annot__arrow" flip />
                <Note>myynti näkyy heti</Note>
              </span>
            </Reveal>

            <Reveal className="pl-resto__text" delay={120}>
              <span className="pl-kicker">Ravintoloille</span>
              <h2 className="pl-title">
                Enemmän tilauksia,{' '}
                <span className="pl-mark">
                  ei provisiota
                  <DoodleUnderline className="pl-mark__line" />
                </span>
                .
              </h2>
              <p className="pl-lead">
                Bidrop on suomalainen tilausalusta. Asiakkaat löytävät ravintolasi, tilaukset tulevat suoraan
                laitteelle ja kotiinkuljetus hoituu Bidropin kuljettajilla.
              </p>
              <ul className="pl-points">
                {RESTAURANT_POINTS.map(({ Icon, text }) => (
                  <li key={text}>
                    <span className="pl-points__icon" aria-hidden="true">
                      <Icon size={18} strokeWidth={2.2} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
              <Link to="/kumppani/rekisteroidy" className="pl-btn">
                Jätä hakemus
              </Link>
            </Reveal>
          </div>

          <div className="pl-container">
            <ol className="pl-onboard">
              {ONBOARDING.map((step, index) => (
                <Reveal as="li" delay={index * 120} key={step.title}>
                  <span className="pl-onboard__num">0{index + 1}</span>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section className="pl-section pl-section--menu" id="hinnoittelu">
          <div className="pl-container pl-menu-wrap">
            <Reveal className="pl-menu">
              <div className="pl-menu__head">
                <span className="pl-kicker">Hinnasto</span>
                <h2>Ravintolan paketit</h2>
                <Note className="pl-menu__note">ei provisiota, vain kuukausimaksu!</Note>
              </div>

              <ul className="pl-menu__items">
                {PARTNER_PLANS.map((plan) => {
                  const featured = plan.key === FEATURED_PLAN
                  return (
                    <li className={`pl-menu__item${featured ? ' pl-menu__item--featured' : ''}`} key={plan.key}>
                      <div className="pl-menu__row">
                        <span className="pl-menu__name">
                          {plan.name}
                          {featured && <span className="pl-menu__tag">suosituin</span>}
                        </span>
                        <span className="pl-menu__dots" aria-hidden="true" />
                        <span className="pl-menu__price">
                          {formatPrice(plan.priceCents)}
                          <small> / kk + alv</small>
                        </span>
                      </div>
                      <p className="pl-menu__fee">{planOrdersLabel(plan)}</p>
                      <p className="pl-menu__desc">{plan.features.join(' · ')}</p>
                    </li>
                  )
                })}
              </ul>

              <div className="pl-menu__extras">
                <div className="pl-menu__row">
                  <span>Kuljetustilaukset yli paketin</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{formatPrice(EXTRA_DELIVERY_CENTS)} / kpl</span>
                </div>
                <div className="pl-menu__row">
                  <span>Aloitus: asennus + koulutus (tabletti tarvittaessa)</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{formatWholePrice(DEVICE_SETUP_CENTS)}</span>
                </div>
                <div className="pl-menu__row">
                  <span>Sitoutumisaika</span>
                  <span className="pl-menu__dots" aria-hidden="true" />
                  <span className="pl-menu__price">{COMMITMENT_MONTHS} kk</span>
                </div>
              </div>

              <p className="pl-menu__included">
                Kaikissa paketeissa: ravintolan profiili ja ruokalista Bidropissa sekä oma kojelauta. Koko
                tilauksen summa jää ravintolalle. Kaikki hinnat + alv.
              </p>
              <Link to="/kumppani/rekisteroidy" className="pl-btn">
                Jätä hakemus
              </Link>
            </Reveal>

            <div className="pl-menu__photos" aria-hidden="true">
              {POLAROIDS.map((photo, index) => (
                <figure className={`pl-polaroid pl-polaroid--${'abc'[index]}`} key={photo.image}>
                  <img src={photo.image} alt="" loading="lazy" />
                  <figcaption>
                    <Note>{photo.caption}</Note>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="pl-section" id="ehdot">
          <div className="pl-container pl-container--narrow">
            <Reveal>
              <span className="pl-kicker">Ravintoloille</span>
              <h2 className="pl-title">Vaatimukset ja ehdot</h2>
              <p className="pl-lead pl-terms__lead">
                Tilauksen koko ruokasumma kuuluu ravintolalle. Asiakas maksaa lisäksi kuljetushinnan, josta hän sopii
                kuljettajan kanssa ({DELIVERY_PRICE_RANGE}), ja palvelumaksun {formatPrice(SERVICE_FEE_CENTS)} - ne
                eivät vähennä ravintolan ruokasummaa. Kotiinkuljetustilaus tulee sinulle vasta, kun kuljetuksesta on
                sovittu.
              </p>
            </Reveal>

            <h3 className="pl-terms__subtitle">Mitä tarvitset</h3>
            <ul className="pl-terms__notes pl-terms__notes--plain">
              {RESTAURANT_REQUIREMENTS.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>

            <div className="pl-terms__list">
              {TERMS.map((term) => (
                <TermsItem key={term.title} {...term} />
              ))}
            </div>

            <p className="pl-terms__fineprint">
              Nämä ovat tiivistelmä. Sitova sopimus tehdään kirjallisesti ennen yhteistyön alkua.
            </p>
          </div>
        </section>

        <section className="pl-dark" id="kuljettajille">
          <div className="pl-container pl-courier">
            <Reveal className="pl-courier__media">
              <img
                className="pl-courier__photo"
                src="/partner/bike-courier.jpg"
                alt="Lähetti polkupyörällä ruokalaukku selässä kaupungin kadulla"
                loading="lazy"
              />
            </Reveal>

            <Reveal className="pl-courier__body" delay={120}>
              <span className="pl-kicker pl-kicker--light">Kuljettajille</span>
              <h2 className="pl-title">Aja silloin kun sinulle sopii.</h2>
              <Note className="pl-courier__note">ei vuorolistoja!</Note>

              <ul className="pl-courier__benefits">
                {COURIER_BENEFITS.map(({ Icon, title, body }) => (
                  <li key={title}>
                    <Icon size={22} strokeWidth={2} aria-hidden="true" />
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </li>
                ))}
              </ul>

              <p className="pl-courier__entrepreneur">
                <BriefcaseBusiness size={20} strokeWidth={2} aria-hidden="true" />
                <span>
                  Kuljettajana toimit <strong>yrittäjänä</strong> omalla Y-tunnuksella tai{' '}
                  <strong>kevytyrittäjänä</strong> laskutuspalvelun kautta.
                </span>
              </p>

              <div className="pl-courier__cta">
                <Link to="/kumppani/kuljettajaksi" className="ph-btn">
                  Hae kuljettajaksi
                </Link>
                <p>
                  Lisäksi vähintään 18 v, älypuhelin (Android tai iPhone) ja polkupyörä, sähköpyörä, mopo tai auto.{' '}
                  <a href="#kuljettajien-ehdot" className="pl-courier__terms-link">
                    Lue kuljettajien ehdot
                  </a>
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="pl-section" id="kuljettajien-ehdot">
          <div className="pl-container pl-container--narrow">
            <Reveal>
              <span className="pl-kicker">Kuljettajille</span>
              <h2 className="pl-title">Kuljettajan ehdot</h2>
              <p className="pl-lead pl-terms__lead">
                Kuljettajana toimit yrittäjänä tai kevytyrittäjänä ja päätät itse, milloin ajat. Tässä tärkeimmät
                käytännöt ansioista, dokumenteista ja keikoista.
              </p>
            </Reveal>

            <div className="pl-terms__list">
              {COURIER_TERMS.map((term) => (
                <TermsItem key={term.title} {...term} />
              ))}
            </div>

            <p className="pl-terms__fineprint">
              Nämä ovat tiivistelmä. Sitova kuljettajasopimus tehdään ennen ensimmäistä keikkaa.
            </p>
          </div>
        </section>

        <section className="pl-section" id="ukk">
          <div className="pl-container pl-container--narrow">
            <Reveal className="pl-chat-head">
              <h2 className="pl-title">Kysy meiltä</h2>
              <Note className="pl-chat-head__note">vastaamme heti</Note>
            </Reveal>
            <ChatFaq />
            <p className="pl-chat-contact">
              Eikö vastausta löytynyt? Kirjoita meille: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            </p>
          </div>
        </section>

        <section className="pl-final">
          <Link to="/kumppani/rekisteroidy" className="pl-final__half">
            <span>Ravintola?</span>
            <strong>
              Jätä hakemus <ArrowRight size={36} strokeWidth={2.2} aria-hidden="true" />
            </strong>
          </Link>
          <Link to="/kumppani/kuljettajaksi" className="pl-final__half">
            <span>Kuljettaja?</span>
            <strong>
              Hae kuljettajaksi <ArrowRight size={36} strokeWidth={2.2} aria-hidden="true" />
            </strong>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default PartnerLanding

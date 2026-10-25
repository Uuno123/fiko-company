// Uuden kumppanisivun (24.10.2026) tekstit suomeksi ja englanniksi. Sisältö
// käyttäjän päätösten mukaan (ks. muistiinpano partner_page_rebuild_plan):
// ravintolat ensin, "Ei provisiota", julkiset hinnat, 1. kuukausi 0 €,
// vertailu Woltiin (Foodora lopetti Suomessa 27.2.2026), nosto 49 €/vko,
// kampanjasäännöt, lyhyt hakemus. Hinnat ja määrät tulevat partnerPlans.js:stä
// ja delivery.js:stä, jotta sivu ei voi poiketa kojelaudasta tai kassasta.

import { DELIVERY_BID } from '../../lib/deliveryTime.js'
import { formatPrice } from '../../lib/format.js'
import {
  COMMITMENT_MONTHS,
  DEVICE_SETUP_CENTS,
  EXTRA_DELIVERY_CENTS,
  findPlan,
  monthlyPlanCharges,
} from '../../lib/partnerPlans.js'

export const PARTNER_EMAIL = 'kumppanit@bidrop.fi'
// Kovimmat tarjoukset -nosto (käyttäjän päätös 24.10.2026).
export const BOOST_WEEK_CENTS = 4900

// Rahasummat kielen mukaan: "39,99 €" / "€39.99", tasaeurot ilman senttejä.
export function money(cents, lang, { whole = false } = {}) {
  const isWhole = whole && cents % 100 === 0
  if (lang === 'en') {
    const value = isWhole
      ? (cents / 100).toLocaleString('en-GB')
      : (cents / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })
    return `€${value}`
  }
  if (isWhole) return `${(cents / 100).toLocaleString('fi-FI')} €`
  return formatPrice(cents)
}

const DELIVERY = findPlan('kuljetus')
const PICKUP = findPlan('nouto')
const LARGE = findPlan('iso')

// Vertailun esimerkki: 10 000 € kotiinkuljetusmyynti kuukaudessa, keskiostos 25 €.
const EXAMPLE_SALES_CENTS = 1_000_000
const EXAMPLE_AVG_ORDER_CENTS = 2500
const EXAMPLE_ORDERS = EXAMPLE_SALES_CENTS / EXAMPLE_AVG_ORDER_CENTS
const EXAMPLE_BIDROP = monthlyPlanCharges(DELIVERY, EXAMPLE_ORDERS)

const BID_MIN = DELIVERY_BID.minCents
const BID_MAX = DELIVERY_BID.maxCents
const bidRange = (lang) =>
  lang === 'en'
    ? `${money(BID_MIN, 'en')}–${money(BID_MAX, 'en')}`
    : `${(BID_MIN / 100).toFixed(2).replace('.', ',')}–${(BID_MAX / 100).toFixed(2).replace('.', ',')} €`

export const COMPARISON_SOURCES = [
  {
    label:
      'MTV Uutiset 15.1.2020: Jopa 30 prosenttia! Näin muhkean siivun ruoanvälityspalvelut Foodora ja Wolt veloittavat ravintoloilta',
    url: 'https://www.mtvuutiset.fi/artikkeli/mtv-uutiset-selvitti-jopa-30-prosenttia-nain-muhkean-siivun-ruoanvalityspalvelut-foodora-ja-wolt-veloittavat-ravintoloilta/7691324',
  },
  {
    label: 'Salon Seudun Sanomat 27.2.2026: Foodora lähtee, Wolt valtaa markkinat Salossa',
    url: 'https://www.sss.fi/2026/02/foodora-lahtee-wolt-valtaa-markkinat-salossa-muutama-ravintola-uuden-edessa/',
  },
]

// ── Yhteiset (header, footer, lomakkeet) ──────────────────────────────────

const SHARED = {
  fi: {
    brandSuffix: 'Kumppanit',
    nav: {
      restaurants: 'Ravintoloille',
      how: 'Miten toimii',
      pricing: 'Hinnat',
      couriers: 'Kuljettajille',
      earnings: 'Ansiot',
      faq: 'UKK',
      applyRestaurant: 'Hae kumppaniksi',
      applyCourier: 'Hae kuljettajaksi',
      openMenu: 'Avaa valikko',
      closeMenu: 'Sulje valikko',
      language: 'Kieli',
    },
    footer: {
      tagline: 'Kuopiolainen tilausalusta ravintoloille ja kuljettajille.',
      contactTitle: 'Yhteys',
      linksTitle: 'Kumppaneille',
      orderFood: 'Tilaa ruokaa Bidropista',
      terms: 'Kumppaniehdot',
      login: 'Ravintolan kirjautuminen',
    },
    faqTitle: 'Usein kysytyt kysymykset',
    form: {
      required: 'Täytä kaikki kentät.',
      invalidEmail: 'Tarkista sähköpostiosoite.',
      sending: 'Lähetetään…',
      error: `Lähetys epäonnistui. Yritä uudelleen tai lähetä sähköpostia osoitteeseen ${PARTNER_EMAIL}.`,
      privacy: 'Käytämme tietoja vain hakemuksen käsittelyyn.',
    },
    termsLink: 'Lue kaikki ehdot',
  },
  en: {
    brandSuffix: 'Partners',
    nav: {
      restaurants: 'For restaurants',
      how: 'How it works',
      pricing: 'Pricing',
      couriers: 'For couriers',
      earnings: 'Earnings',
      faq: 'FAQ',
      applyRestaurant: 'Become a partner',
      applyCourier: 'Apply to drive',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      language: 'Language',
    },
    footer: {
      tagline: 'A food ordering platform from Kuopio for restaurants and couriers.',
      contactTitle: 'Contact',
      linksTitle: 'For partners',
      orderFood: 'Order food on Bidrop',
      terms: 'Partner terms',
      login: 'Restaurant login',
    },
    faqTitle: 'Frequently asked questions',
    form: {
      required: 'Please fill in all fields.',
      invalidEmail: 'Please check the email address.',
      sending: 'Sending…',
      error: `Sending failed. Please try again or email us at ${PARTNER_EMAIL}.`,
      privacy: 'We only use your details to process your application.',
    },
    termsLink: 'Read the full terms',
  },
}

// ── Ravintolat (/kumppanina) ──────────────────────────────────────────────

function restaurantPlans(lang) {
  const en = lang === 'en'
  return [
    {
      key: PICKUP.key,
      name: en ? 'Pickup' : PICKUP.name,
      priceCents: PICKUP.priceCents,
      orders: en ? 'Pickup orders only' : 'Vain noutotilaukset',
      features: en
        ? [
            'Unlimited pickup orders',
            'Customers order and pay on Bidrop and collect themselves',
            'Dashboard, menu and reports',
          ]
        : [
            'Rajattomasti noutotilauksia',
            'Asiakas tilaa ja maksaa Bidropissa ja hakee itse',
            'Kojelauta, ruokalista ja raportit',
          ],
    },
    {
      key: DELIVERY.key,
      name: en ? 'Delivery' : DELIVERY.name,
      priceCents: DELIVERY.priceCents,
      popular: true,
      orders: en
        ? `${DELIVERY.includedDeliveries} delivery orders / month`
        : `${DELIVERY.includedDeliveries} kuljetustilausta / kk`,
      features: en
        ? [
            'Pickup and home delivery by Bidrop couriers',
            'Customers follow the courier on a map',
            'Dashboard, menu and reports',
          ]
        : [
            'Nouto ja kotiinkuljetus Bidropin kuljettajilla',
            'Asiakas seuraa kuljettajaa kartalla',
            'Kojelauta, ruokalista ja raportit',
          ],
    },
    {
      key: LARGE.key,
      name: en ? 'Large restaurant' : LARGE.name,
      priceCents: LARGE.priceCents,
      orders: en
        ? `${LARGE.includedDeliveries.toLocaleString('en-GB')} delivery orders / month`
        : `${LARGE.includedDeliveries.toLocaleString('fi-FI')} kuljetustilausta / kk`,
      features: en
        ? [
            'Everything in Delivery',
            'Higher visibility on the front page and in search',
            'More detailed sales data and a dedicated contact person',
          ]
        : [
            'Kaikki Kuljetus-paketin ominaisuudet',
            'Nostettu näkyvyys etusivulla ja haussa',
            'Tarkempi myyntidata ja oma yhteyshenkilö',
          ],
    },
  ]
}

const RESTAURANT = {
  fi: {
    title: 'Bidrop ravintoloille – ei provisiota',
    hero: {
      kicker: 'Bidrop ravintoloille · Kuopio',
      title: 'Ei provisiota.',
      lead: 'Kiinteä kuukausimaksu, ja koko ruokasumma jää ravintolalle. Bidrop tuo uudet asiakkaat ja hoitaa kotiinkuljetuksen.',
      primary: 'Hae kumppaniksi',
      secondary: 'Katso hinnat',
      offer: 'Ensimmäinen kuukausi 0 €',
      facts: ['0 % provisiota', 'Aloitus alle viikossa', 'Tilitys kahden viikon välein'],
      imageAlt: 'Bidropin kojelauta: uudet tilaukset, keittiössä ja valmiina',
    },
    benefits: {
      kicker: 'Miksi Bidrop',
      title: 'Kaikki mitä tarvitset, ilman provisiota',
      items: [
        {
          icon: 'percent',
          title: 'Ei provisiota',
          body: 'Maksat vain kiinteän kuukausimaksun. Tilausten koko ruokasumma tilitetään sinulle.',
        },
        {
          icon: 'bike',
          title: 'Kuljetus hoidettu',
          body: 'Bidropin kuljettajat vievät tilaukset asiakkaille. Omia kuljettajia ei tarvita, ja asiakas maksaa kuljetuksen.',
        },
        {
          icon: 'users',
          title: 'Uusia asiakkaita',
          body: 'Ravintolasi näkyy Bidropissa kuopiolaisille, jotka etsivät ruokaa juuri nyt.',
        },
        {
          icon: 'wallet',
          title: 'Nopea tilitys',
          body: 'Ruokasummat maksetaan tilillesi kahden viikon välein, ja jokaisesta tilityksestä saat yhteenvedon.',
        },
      ],
    },
    how: {
      kicker: 'Miten toimii',
      title: 'Näin tilaus kulkee',
      steps: [
        { title: 'Asiakas tilaa', body: 'Asiakas valitsee ruoat ja maksaa kortilla Bidropissa.' },
        {
          title: 'Kuljetuksesta sovitaan',
          body: 'Kotiinkuljetuksessa asiakas ja lähellä oleva kuljettaja sopivat kuljetuksen hinnasta.',
        },
        {
          title: 'Sinä hyväksyt',
          body: 'Tilaus tulee kojelaudalle. Hyväksyt sen ja valitset valmistusajan 90 sekunnin sisällä.',
        },
        {
          title: 'Kuljettaja noutaa',
          body: 'Kuljettaja hakee tilauksen, kun ruoka on valmis, ja asiakas seuraa sitä kartalla.',
        },
      ],
      note: 'Kuljetushinnasta sovitaan asiakkaan ja kuljettajan kesken ennen kuin tilaus tulee sinulle. Sinä et maksa kuljetuksesta mitään, eikä se vähennä ruokasummaasi.',
    },
    dashboard: {
      kicker: 'Kojelauta',
      title: 'Kaikki yhdessä kojelaudassa',
      lead: 'Kojelauta toimii tabletilla, puhelimella ja tietokoneella selaimessa. Asennettavia ohjelmia ei tarvita.',
      tabs: [
        {
          key: 'orders',
          label: 'Tilaukset',
          title: 'Tilaukset reaaliajassa',
          body: 'Uudet, keittiössä olevat ja valmiit tilaukset yhdellä silmäyksellä. Valmistusajat, tauot ja aukioloajat hallitset samasta paikasta.',
          image: '/partner/screens/dashboard-orders.jpg',
          alt: 'Tilaukset-näkymä: uudet, keittiössä ja valmiina',
        },
        {
          key: 'stats',
          label: 'Myynti ja raportit',
          title: 'Myynti ja raportit',
          body: 'Päivittäinen myynti, myydyimmät tuotteet ja kiireisimmät ajat. Näet heti, mikä toimii.',
          image: '/partner/screens/dashboard-stats.jpg',
          alt: 'Tilastot-näkymä: myynti päivittäin ja myydyimmät tuotteet',
        },
        {
          key: 'reviews',
          label: 'Arviot',
          title: 'Arviot ja vastaukset',
          body: 'Asiakkaat arvioivat tilauksensa, ja sinä voit vastata jokaiseen arvioon.',
          image: '/partner/screens/dashboard-reviews.jpg',
          alt: 'Arviot-näkymä: asiakasarviot ja ravintolan vastaus',
        },
        {
          key: 'finance',
          label: 'Talous',
          title: 'Talous ja tilitykset',
          body: 'Kuukauden myynti, kuukausimaksu ja arvioitu tilitys tilauskohtaisella erittelyllä.',
          image: '/partner/screens/dashboard-finance.jpg',
          alt: 'Talous-näkymä: myynti, kuukausimaksu ja arvioitu tilitys',
        },
      ],
      extras: [
        'Ruokalista, kuvat ja hinnat muokattavissa itse',
        'Tauko tai tilausten sulkeminen yhdellä painalluksella',
        'Äänimerkki uudesta tilauksesta',
      ],
    },
    pricing: {
      kicker: 'Hinnat',
      title: 'Selkeät hinnat, ei provisiota',
      lead: 'Valitse paketti tilausmääriesi mukaan. Ei piilokuluja.',
      offer: 'Ensimmäinen kuukausi 0 € kaikissa paketeissa',
      perMonth: '/ kk',
      vat: '+ alv',
      popular: 'Suosituin',
      choose: 'Hae kumppaniksi',
      extrasTitle: 'Lisäksi',
      extras: [
        ['Kuljetustilaukset paketin ylittävältä osalta', `${formatPrice(EXTRA_DELIVERY_CENTS)} / kpl`],
        [
          'Käyttöönotto: asennus, koulutus ja tarvittaessa tabletti',
          `${money(DEVICE_SETUP_CENTS, 'fi', { whole: true })} kertamaksu`,
        ],
        ['Sitoutumisaika', `${COMMITMENT_MONTHS} kk`],
      ],
      note: 'Kaikki hinnat ilman arvonlisäveroa. Ensimmäisen kuukauden kuukausimaksu on 0 €; käyttöönotto laskutetaan normaalisti.',
    },
    comparison: {
      kicker: 'Vertailu',
      title: 'Bidrop vs. Wolt',
      lead: 'Mitä kotiinkuljetus maksaa ravintolalle.',
      head: ['', 'Bidrop', 'Wolt'],
      rows: [
        ['Provisio tilauksista', '0 %', 'tyypillisesti 25–30 % ¹'],
        [
          'Kuukausimaksu',
          `${money(PICKUP.priceCents, 'fi')}–${money(LARGE.priceCents, 'fi')} + alv`,
          'ei julkista hinnastoa',
        ],
        ['Kuljetus', 'Bidropin kuljettajat, asiakas maksaa kuljetuksen', 'Woltin kuljettajat'],
        [
          'Esimerkki: 10 000 € kotiinkuljetusmyynti kuukaudessa',
          `${money(EXAMPLE_BIDROP.totalCents, 'fi')} + alv ²`,
          '2 500–3 000 € ¹',
        ],
      ],
      footnotes: [
        '¹ Woltin Suomen maajohtaja kertoi Woltin komission olevan 30 % (MTV Uutiset 15.1.2020). Ravintoloitsija kertoi Woltin provision olevan hänen ravintolallaan 25–30 % (Salon Seudun Sanomat 27.2.2026). Provisio vaihtelee sopimuksittain.',
        `² Kuljetus-paketti ${money(DELIVERY.priceCents, 'fi')} ja ${EXAMPLE_BIDROP.extraDeliveries} paketin ylittävää kuljetustilausta × ${formatPrice(EXTRA_DELIVERY_CENTS)}, kun keskiostos on 25 € (${EXAMPLE_ORDERS} tilausta).`,
      ],
      sourcesTitle: 'Lähteet',
    },
    marketing: {
      kicker: 'Markkinointi',
      title: 'Lisää näkyvyyttä, kun haluat',
      boost: {
        tag: 'Lisäpalvelu',
        title: 'Kovimmat tarjoukset -nosto',
        body: 'Ravintolasi nostetaan Bidropin etusivun Kovimmat tarjoukset -riville, jonka asiakas näkee heti etusivun alussa. Nosto merkitään asiakkaalle mainokseksi.',
        price: `${money(BOOST_WEEK_CENTS, 'fi', { whole: true })} / viikko`,
        vat: '+ alv · kaikkiin paketteihin',
      },
      campaigns: {
        title: 'Kampanjat',
        lead: 'Bidrop voi tehdä ravintolasi tuotteisiin tarjouksia tuodakseen lisää tilauksia. Alennuksen kustannus kuuluu ravintolalle, joten Bidrop sitoutuu näihin rajoihin:',
        rules: [
          'Enintään 20 % alennus tuotteen normaalihinnasta.',
          'Enintään 2 kampanjaa kuukaudessa, ja yksi kampanja kestää enintään 7 päivää.',
          'Alennusten yhteiskustannus ravintolalle on enintään 150 € kuukaudessa, ellei ravintola itse hyväksy enempää.',
          'Bidrop ilmoittaa kampanjasta vähintään 7 päivää etukäteen: tuotteet, alennus ja ajankohta.',
          'Voit kieltäytyä kampanjasta ennen sen alkua ilman seuraamuksia, tai kieltää kampanjat kokonaan.',
          'Alennus ei koske alkoholijuomia eikä tuotteita, jotka olet merkinnyt kampanjoiden ulkopuolelle.',
          'Bidropin omat alennuskoodit asiakkaille (esim. ensimmäinen tilaus) maksaa Bidrop, ei ravintola.',
        ],
      },
    },
    start: {
      kicker: 'Aloitus',
      title: 'Aloitus alle viikossa',
      steps: [
        {
          title: 'Jätä hakemus',
          body: 'Lyhyt hakemus vie minuutin. Otamme sinuun yhteyttä sähköpostilla tai puhelimella.',
        },
        {
          title: 'Sopimus ja asennus',
          body: 'Sovimme paketin, teemme kirjallisen sopimuksen ja otamme kojelaudan käyttöön tabletillasi – tai tuomme tabletin.',
        },
        { title: 'Lisää ruokalista', body: 'Lisäät ruokalistan, kuvat ja hinnat kojelaudalla. Autamme tarvittaessa.' },
        { title: 'Tilaukset alkavat', body: 'Ravintolasi näkyy asiakkaille, ja ensimmäiset tilaukset tulevat.' },
      ],
      requirementsTitle: 'Mitä tarvitset',
      requirements: [
        'Y-tunnus ja ravintola Kuopiossa – kotiinkuljetus noin 8 km säteellä ravintolasta',
        'Ilmoitus elintarvikehuoneistosta ja omavalvontasuunnitelma',
        'Ruokalista hintoineen ja allergeenitietoineen – kuvat suositeltavia',
        'Tabletti tai puhelin, jossa kojelauta on auki aukioloaikoina (tai tuomme tabletin)',
      ],
    },
    terms: {
      kicker: 'Ehdot',
      title: 'Ehdot lyhyesti',
      items: [
        `Sopimus on ${COMMITMENT_MONTHS} kuukauden määräaikainen, sen jälkeen voimassa toistaiseksi kuukauden irtisanomisajalla.`,
        'Isompaan pakettiin voit siirtyä milloin tahansa, pienempään seuraavan laskutuskauden alusta.',
        'Ruokasummat tilitetään kahden viikon välein. Kuukausimaksu laskutetaan kuukauden alussa, maksuaika 14 päivää.',
        'Hinnat eivät nouse ensimmäisen 12 kuukauden aikana, ja muutoksista ilmoitetaan vähintään 30 päivää etukäteen.',
        'Ravintolan virheistä johtuvat hyvitykset vähennetään tilityksestä. Kuljetuksen ja Bidropin virheistä vastaa Bidrop.',
      ],
    },
    faq: [
      {
        q: 'Paljonko Bidrop maksaa?',
        a: `Vain kiinteän kuukausimaksun, provisiota ei ole: Nouto ${money(PICKUP.priceCents, 'fi')}/kk, Kuljetus ${money(DELIVERY.priceCents, 'fi')}/kk (${DELIVERY.includedDeliveries} kuljetustilausta) tai Iso ravintola ${money(LARGE.priceCents, 'fi')}/kk (${LARGE.includedDeliveries.toLocaleString('fi-FI')} kuljetustilausta). Käyttöönotto ${money(DEVICE_SETUP_CENTS, 'fi', { whole: true })} kertaalleen. Ensimmäinen kuukausi on 0 €. Kaikki hinnat + alv.`,
      },
      {
        q: 'Mitä jos kuljetustilauksia tulee yli paketin?',
        a: `Paketin ylittävistä kuljetustilauksista peritään ${formatPrice(EXTRA_DELIVERY_CENTS)} kappaleelta, ei prosenttia. Jos tilauksia tulee säännöllisesti paljon yli, Iso ravintola -paketti tulee edullisemmaksi.`,
      },
      {
        q: 'Kauanko aloitus kestää?',
        a: 'Yleensä alle viikon hakemuksesta: teemme sopimuksen, otamme kojelaudan käyttöön ja sinä lisäät ruokalistan.',
      },
      {
        q: 'Tarvitsenko oman tabletin?',
        a: `Et välttämättä. Kojelauta toimii tabletilla, puhelimella tai tietokoneella selaimessa. Jos sopivaa laitetta ei ole, tuomme tabletin – se sisältyy käyttöönottoon.`,
      },
      {
        q: 'Kuka lisää ruokalistan?',
        a: 'Sinä lisäät ruokalistan, kuvat ja hinnat itse kojelaudalla, ja voit muuttaa niitä milloin tahansa. Autamme alussa tarvittaessa.',
      },
      {
        q: 'Hoidatteko kuljetuksen?',
        a: 'Kyllä, Kuljetus- ja Iso ravintola -paketeissa. Asiakas ja Bidropin kuljettaja sopivat kuljetuksen hinnasta ennen kuin tilaus tulee sinulle, ja kuljettaja hakee ruoan kun se on valmis. Omia kuljettajia ei tarvita.',
      },
      {
        q: 'Milloin saan rahat?',
        a: 'Asiakkaiden maksamat ruokasummat tilitetään tilillesi kahden viikon välein yhteenvedon kera.',
      },
      {
        q: 'Mitä jos en ehdi hyväksyä tilausta?',
        a: 'Tilaus peruuntuu automaattisesti 90 sekunnin jälkeen, eikä asiakasta veloiteta. Kiireessä voit pitää tauon, jolloin uusia tilauksia ei tule.',
      },
      {
        q: 'Onko sopimuksessa sitoutumisaikaa?',
        a: `Kyllä, ${COMMITMENT_MONTHS} kuukautta, minkä jälkeen sopimuksen voi irtisanoa kuukauden irtisanomisajalla.`,
      },
      {
        q: 'Miten saan ravintolani näkyvämmäksi?',
        a: `Kovimmat tarjoukset -nosto (${money(BOOST_WEEK_CENTS, 'fi', { whole: true })}/viikko + alv) nostaa ravintolasi etusivun alkuun. Iso ravintola -paketissa ravintolasi nostetaan lisäksi etusivulla ja haussa.`,
      },
      {
        q: 'Kuka vastaa, jos jokin menee pieleen?',
        a: 'Jos virhe on ravintolan (esim. väärä tai puuttuva annos), hyvitys vähennetään seuraavasta tilityksestä. Jos virhe on kuljetuksen tai Bidropin, Bidrop vastaa hyvityksestä.',
      },
    ],
    apply: {
      kicker: 'Hakemus',
      title: 'Hae kumppaniksi',
      lead: 'Jätä yhteystietosi, niin otamme yhteyttä ja sovimme aloituksesta. Hakemus ei sido sinua mihinkään.',
      fields: {
        name: 'Nimesi',
        restaurant: 'Ravintolan nimi',
        phone: 'Puhelin',
        email: 'Sähköposti',
        orders: 'Tilauksia kuukaudessa (arvio)',
      },
      ordersHint: 'Arvio kaikista myyntikanavista, esim. viime tilikaudelta.',
      orderOptions: [
        ['under_100', 'Alle 100'],
        ['100_300', '100–300'],
        ['300_1000', '300–1 000'],
        ['over_1000', 'Yli 1 000'],
      ],
      ordersPlaceholder: 'Valitse',
      submit: 'Lähetä hakemus',
      successTitle: 'Kiitos! Hakemus on vastaanotettu.',
      successBody: `Otamme yhteyttä pian. Kysyttävää? ${PARTNER_EMAIL}`,
      contact: 'Kysyttävää ennen hakemusta? Kirjoita meille:',
    },
  },
  en: {
    title: 'Bidrop for restaurants – no commission',
    hero: {
      kicker: 'Bidrop for restaurants · Kuopio',
      title: 'No commission.',
      lead: 'A fixed monthly fee, and the full food total stays with your restaurant. Bidrop brings new customers and handles home delivery.',
      primary: 'Become a partner',
      secondary: 'See pricing',
      offer: 'First month €0',
      facts: ['0% commission', 'Start in under a week', 'Payouts every two weeks'],
      imageAlt: 'Bidrop dashboard: new orders, in the kitchen and ready',
    },
    benefits: {
      kicker: 'Why Bidrop',
      title: 'Everything you need, without commission',
      items: [
        {
          icon: 'percent',
          title: 'No commission',
          body: 'You only pay a fixed monthly fee. The full food total of every order is paid to you.',
        },
        {
          icon: 'bike',
          title: 'Delivery handled',
          body: 'Bidrop couriers deliver your orders. No couriers of your own needed, and the customer pays for delivery.',
        },
        {
          icon: 'users',
          title: 'New customers',
          body: 'Your restaurant is visible on Bidrop to people in Kuopio looking for food right now.',
        },
        {
          icon: 'wallet',
          title: 'Fast payouts',
          body: 'Food totals are paid to your account every two weeks, with a summary of every payout.',
        },
      ],
    },
    how: {
      kicker: 'How it works',
      title: 'How an order flows',
      steps: [
        { title: 'Customer orders', body: 'The customer picks the food and pays by card on Bidrop.' },
        {
          title: 'Delivery is agreed',
          body: 'For home delivery, the customer and a nearby courier agree on the delivery price.',
        },
        {
          title: 'You accept',
          body: 'The order arrives on your dashboard. You accept it and choose a preparation time within 90 seconds.',
        },
        {
          title: 'Courier picks up',
          body: 'The courier collects the order when the food is ready, and the customer follows it on a map.',
        },
      ],
      note: 'The delivery price is agreed between the customer and the courier before the order reaches you. You pay nothing for delivery, and it never reduces your food total.',
    },
    dashboard: {
      kicker: 'Dashboard',
      title: 'Everything in one dashboard',
      lead: 'The dashboard works in the browser on a tablet, phone or computer. No software to install.',
      tabs: [
        {
          key: 'orders',
          label: 'Orders',
          title: 'Orders in real time',
          body: 'New, in-progress and ready orders at a glance. Manage preparation times, pauses and opening hours in the same place.',
          image: '/partner/screens/dashboard-orders.jpg',
          alt: 'Orders view: new, in the kitchen and ready',
        },
        {
          key: 'stats',
          label: 'Sales & reports',
          title: 'Sales and reports',
          body: 'Daily sales, best-selling items and busiest hours. See instantly what works.',
          image: '/partner/screens/dashboard-stats.jpg',
          alt: 'Statistics view: daily sales and best-selling items',
        },
        {
          key: 'reviews',
          label: 'Reviews',
          title: 'Reviews and replies',
          body: 'Customers review their orders, and you can reply to every review.',
          image: '/partner/screens/dashboard-reviews.jpg',
          alt: 'Reviews view: customer reviews and the restaurant reply',
        },
        {
          key: 'finance',
          label: 'Finance',
          title: 'Finance and payouts',
          body: 'Monthly sales, the monthly fee and the estimated payout, itemised order by order.',
          image: '/partner/screens/dashboard-finance.jpg',
          alt: 'Finance view: sales, monthly fee and estimated payout',
        },
      ],
      extras: [
        'Edit your menu, photos and prices yourself',
        'Pause or close orders with one tap',
        'Sound alert for new orders',
      ],
    },
    pricing: {
      kicker: 'Pricing',
      title: 'Clear pricing, no commission',
      lead: 'Choose a plan based on your order volume. No hidden fees.',
      offer: 'First month €0 on every plan',
      perMonth: '/ month',
      vat: '+ VAT',
      popular: 'Most popular',
      choose: 'Become a partner',
      extrasTitle: 'In addition',
      extras: [
        ['Delivery orders above the plan', `${money(EXTRA_DELIVERY_CENTS, 'en')} each`],
        [
          'Setup: installation, training and a tablet if needed',
          `${money(DEVICE_SETUP_CENTS, 'en', { whole: true })} one-off`,
        ],
        ['Commitment period', `${COMMITMENT_MONTHS} months`],
      ],
      note: 'All prices exclude VAT. The monthly fee for the first month is €0; setup is invoiced as usual.',
    },
    comparison: {
      kicker: 'Comparison',
      title: 'Bidrop vs. Wolt',
      lead: 'What home delivery costs a restaurant.',
      head: ['', 'Bidrop', 'Wolt'],
      rows: [
        ['Commission on orders', '0%', 'typically 25–30% ¹'],
        [
          'Monthly fee',
          `${money(PICKUP.priceCents, 'en')}–${money(LARGE.priceCents, 'en')} + VAT`,
          'no public price list',
        ],
        ['Delivery', 'Bidrop couriers, the customer pays for delivery', 'Wolt couriers'],
        [
          'Example: €10,000 home delivery sales per month',
          `${money(EXAMPLE_BIDROP.totalCents, 'en')} + VAT ²`,
          '€2,500–3,000 ¹',
        ],
      ],
      footnotes: [
        '¹ Wolt’s Finland country manager stated Wolt’s commission is 30% (MTV Uutiset, 15 Jan 2020). A restaurateur reported a Wolt commission of 25–30% for his restaurant (Salon Seudun Sanomat, 27 Feb 2026). Commission varies by contract.',
        `² Delivery plan ${money(DELIVERY.priceCents, 'en')} plus ${EXAMPLE_BIDROP.extraDeliveries} delivery orders above the plan × ${money(EXTRA_DELIVERY_CENTS, 'en')}, with an average order of €25 (${EXAMPLE_ORDERS} orders).`,
      ],
      sourcesTitle: 'Sources',
    },
    marketing: {
      kicker: 'Marketing',
      title: 'More visibility when you want it',
      boost: {
        tag: 'Add-on',
        title: 'Top deals boost',
        body: 'Your restaurant is featured in the Top deals row at the top of the Bidrop front page. The boost is labelled as an advertisement to customers.',
        price: `${money(BOOST_WEEK_CENTS, 'en', { whole: true })} / week`,
        vat: '+ VAT · available on every plan',
      },
      campaigns: {
        title: 'Campaigns',
        lead: 'Bidrop may run offers on your products to bring you more orders. The cost of the discount is borne by the restaurant, so Bidrop commits to these limits:',
        rules: [
          'A discount of at most 20% of the product’s normal price.',
          'At most 2 campaigns per month, each lasting at most 7 days.',
          'The total cost of discounts to the restaurant is at most €150 per month, unless the restaurant agrees to more.',
          'Bidrop announces a campaign at least 7 days in advance: products, discount and timing.',
          'You can decline a campaign before it starts without consequences, or opt out of campaigns entirely.',
          'Discounts never apply to alcoholic drinks or products you have excluded from campaigns.',
          'Bidrop’s own discount codes for customers (e.g. first order) are paid by Bidrop, not the restaurant.',
        ],
      },
    },
    start: {
      kicker: 'Getting started',
      title: 'Up and running in under a week',
      steps: [
        { title: 'Apply', body: 'The short application takes a minute. We will contact you by email or phone.' },
        {
          title: 'Agreement and setup',
          body: 'We agree on a plan, sign a written agreement and set up the dashboard on your tablet – or bring you one.',
        },
        { title: 'Add your menu', body: 'You add your menu, photos and prices in the dashboard. We help if needed.' },
        { title: 'Orders start', body: 'Your restaurant is visible to customers, and the first orders come in.' },
      ],
      requirementsTitle: 'What you need',
      requirements: [
        'A Finnish business ID and a restaurant in Kuopio – home delivery within about 8 km',
        'A food premises notification and an in-house control plan',
        'A menu with prices and allergen information – photos recommended',
        'A tablet or phone with the dashboard open during opening hours (or we bring a tablet)',
      ],
    },
    terms: {
      kicker: 'Terms',
      title: 'Terms in brief',
      items: [
        `The agreement is fixed-term for ${COMMITMENT_MONTHS} months, then continues until further notice with one month’s notice.`,
        'You can move to a larger plan at any time, and to a smaller one from the next billing period.',
        'Food totals are paid out every two weeks. The monthly fee is invoiced at the start of the month, payment term 14 days.',
        'Prices will not rise during the first 12 months, and changes are announced at least 30 days in advance.',
        'Refunds caused by the restaurant are deducted from the payout. Bidrop covers errors caused by delivery or by Bidrop.',
      ],
    },
    faq: [
      {
        q: 'How much does Bidrop cost?',
        a: `Only a fixed monthly fee, no commission: Pickup ${money(PICKUP.priceCents, 'en')}/month, Delivery ${money(DELIVERY.priceCents, 'en')}/month (${DELIVERY.includedDeliveries} delivery orders) or Large restaurant ${money(LARGE.priceCents, 'en')}/month (${LARGE.includedDeliveries.toLocaleString('en-GB')} delivery orders). Setup ${money(DEVICE_SETUP_CENTS, 'en', { whole: true })} once. The first month is €0. All prices + VAT.`,
      },
      {
        q: 'What if I get more delivery orders than my plan includes?',
        a: `Delivery orders above the plan cost ${money(EXTRA_DELIVERY_CENTS, 'en')} each, not a percentage. If you regularly go well over, the Large restaurant plan becomes cheaper.`,
      },
      {
        q: 'How long does it take to get started?',
        a: 'Usually under a week from your application: we sign the agreement, set up the dashboard and you add your menu.',
      },
      {
        q: 'Do I need my own tablet?',
        a: 'Not necessarily. The dashboard works in the browser on a tablet, phone or computer. If you have no suitable device, we bring a tablet – it is included in the setup.',
      },
      {
        q: 'Who adds the menu?',
        a: 'You add your menu, photos and prices yourself in the dashboard and can change them at any time. We help at the start if needed.',
      },
      {
        q: 'Do you handle delivery?',
        a: 'Yes, on the Delivery and Large restaurant plans. The customer and a Bidrop courier agree on the delivery price before the order reaches you, and the courier collects the food when it is ready. No couriers of your own needed.',
      },
      {
        q: 'When do I get paid?',
        a: 'The food totals paid by customers are transferred to your account every two weeks with a summary.',
      },
      {
        q: 'What if I don’t accept an order in time?',
        a: 'The order is cancelled automatically after 90 seconds, and the customer is not charged. When busy, you can pause so that no new orders come in.',
      },
      {
        q: 'Is there a commitment period?',
        a: `Yes, ${COMMITMENT_MONTHS} months, after which the agreement can be terminated with one month’s notice.`,
      },
      {
        q: 'How can I make my restaurant more visible?',
        a: `The Top deals boost (${money(BOOST_WEEK_CENTS, 'en', { whole: true })}/week + VAT) features your restaurant at the top of the front page. On the Large restaurant plan your restaurant is also boosted on the front page and in search.`,
      },
      {
        q: 'Who is responsible if something goes wrong?',
        a: 'If the error is the restaurant’s (e.g. a wrong or missing dish), the refund is deducted from the next payout. If the error is caused by delivery or by Bidrop, Bidrop covers the refund.',
      },
    ],
    apply: {
      kicker: 'Application',
      title: 'Become a partner',
      lead: 'Leave your contact details and we will get in touch to agree on the start. The application does not commit you to anything.',
      fields: {
        name: 'Your name',
        restaurant: 'Restaurant name',
        phone: 'Phone',
        email: 'Email',
        orders: 'Orders per month (estimate)',
      },
      ordersHint: 'An estimate across all sales channels, e.g. from the last financial year.',
      orderOptions: [
        ['under_100', 'Under 100'],
        ['100_300', '100–300'],
        ['300_1000', '300–1,000'],
        ['over_1000', 'Over 1,000'],
      ],
      ordersPlaceholder: 'Select',
      submit: 'Send application',
      successTitle: 'Thank you! Your application has been received.',
      successBody: `We will be in touch soon. Questions? ${PARTNER_EMAIL}`,
      contact: 'Questions before applying? Email us:',
    },
  },
}

// ── Kuljettajat (/kumppanina/kuljettajat) ─────────────────────────────────

const COURIER = {
  fi: {
    title: 'Bidrop kuljettajille – aja silloin kun sinulle sopii',
    hero: {
      kicker: 'Bidrop kuljettajille · Kuopio',
      title: 'Aja silloin kun sinulle sopii.',
      lead: 'Tarjoat keikoille oman hintasi, ja koko sovittu hinta on sinun. Ei vuorolistoja.',
      primary: 'Hae kuljettajaksi',
      secondary: 'Miten keikka etenee',
      facts: [`${bidRange('fi')} / keikka`, '100 % sinulle', 'Maksu kahden viikon välein'],
      imageAlt: 'Bidrop kuljettajasovellus: viikon ansiot ja keikat',
    },
    benefits: {
      kicker: 'Miksi Bidrop',
      title: 'Sinun aikasi, sinun hintasi',
      items: [
        {
          icon: 'clock',
          title: 'Omat työajat',
          body: 'Mene online-tilaan silloin kun haluat ja lopeta kun haluat. Vuorolistoja ei ole.',
        },
        {
          icon: 'tag',
          title: 'Sinä hinnoittelet',
          body: `Tarjoat jokaiseen keikkaan hinnan väliltä ${bidRange('fi')}, ja koko sovittu hinta on sinun.`,
        },
        {
          icon: 'wallet',
          title: 'Maksu kahden viikon välein',
          body: 'Ansiot maksetaan tilillesi kahden viikon välein, ja näet jokaisen tilityksen sovelluksessa.',
        },
        {
          icon: 'receipt',
          title: 'Ei laskutusta itse',
          body: 'Bidrop tekee laskun puolestasi (itselaskutus). Kevytyrittäjänä laskutuspalvelu hoitaa verot.',
        },
      ],
    },
    how: {
      kicker: 'Miten toimii',
      title: 'Näin keikka etenee',
      steps: [
        {
          title: 'Mene online-tilaan',
          body: 'Liu’uta online-tilaan, kun haluat ajaa. Näet, kuinka kiireistä alueella on.',
        },
        { title: 'Näe kuljetuspyyntö', body: 'Näet lähellä olevat tilaukset: ravintolan, ruoan summan ja matkan.' },
        {
          title: 'Tarjoa hintasi',
          body: 'Asiakas hyväksyy tarjouksesi tai tarjoaa omaa hintaansa, jonka voit hyväksyä.',
        },
        {
          title: 'Nouda ravintolasta',
          body: 'Sovellus kertoo, milloin lähteä. Kuittaat noudon ravintolan noutokoodilla.',
        },
        {
          title: 'Toimita asiakkaalle',
          body: 'Navigoi perille omalla karttasovelluksellasi. Sijaintisi kuittaa toimituksen.',
        },
        { title: 'Saat maksun', body: 'Ansio kirjautuu heti, ja maksu tulee tilillesi kahden viikon välein.' },
      ],
    },
    app: {
      kicker: 'Sovellus',
      title: 'Ansiot ja tilitykset aina näkyvissä',
      lead: 'Näet sovelluksesta viikon ansiot, jokaisen keikan maksutilan ja tilitysraportit kahden viikon jaksoilta.',
      items: [
        'Ansiot päivittäin ja viikoittain',
        'Tilitysraportti jokaiselta jaksolta',
        'Ilmoitus uusista kuljetuspyynnöistä',
        'Suomeksi ja englanniksi',
      ],
      images: [
        { src: '/partner/screens/app-earnings.jpg', alt: 'Ansiot-näkymä: viikon ansiot ja keikat' },
        { src: '/partner/screens/app-payouts.jpg', alt: 'Tilitykset-näkymä: kahden viikon jaksot ja maksutila' },
      ],
    },
    requirements: {
      kicker: 'Vaatimukset',
      title: 'Mitä tarvitset',
      items: [
        'Vähintään 18 vuotta',
        'Älypuhelin (Android tai iPhone) ja mobiilidata',
        'Polkupyörä, sähköpyörä, mopo tai auto',
        'Y-tunnus tai kevytyrittäjyys (esim. UKKO.fi tai Eezy)',
        'Henkilökortti tai passi – autolla ja mopolla myös ajokortti',
        'Puhdas, lämpöä pitävä kuljetuslaukku',
      ],
    },
    terms: {
      kicker: 'Ehdot',
      title: 'Ehdot lyhyesti',
      items: [
        'Toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä. Ikäraja on 18 vuotta.',
        'Pääset online-tilaan, kun Bidrop on hyväksynyt dokumenttisi – yleensä 1–2 arkipäivässä.',
        'Koko sovittu kuljetushinta on sinun. Bidrop ei ota siitä osuutta.',
        'Kaksi vastaamatonta keikkatarjousta peräkkäin siirtää sinut offline-tilaan.',
        'Sijaintiasi käytetään vain, kun olet online-tilassa tai keikalla.',
      ],
    },
    faq: [
      {
        q: 'Paljonko kuljettaja tienaa?',
        a: `Tarjoat jokaiseen keikkaan oman hintasi (${bidRange('fi')}). Kun asiakas hyväksyy, koko hinta on sinun – Bidrop ei ota siitä osuutta.`,
      },
      {
        q: 'Pitääkö minulla olla yritys?',
        a: 'Kyllä. Toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä laskutuspalvelun kautta (esim. UKKO.fi tai Eezy).',
      },
      {
        q: 'Milloin minulle maksetaan?',
        a: 'Kahden viikon välein. Bidrop laskee ansiot sovelluksen keikoista ja tekee laskun puolestasi.',
      },
      {
        q: 'Voinko ajaa vain iltaisin tai viikonloppuisin?',
        a: 'Kyllä. Vuorolistoja ei ole: menet online-tilaan silloin kun haluat ja lopetat milloin haluat.',
      },
      {
        q: 'Miten keikat jaetaan?',
        a: `Kotiinkuljetustilaus näkyy online-tilassa oleville kuljettajille noin 8 km säteellä. Kukin tarjoaa hintansa, ja asiakas valitsee. Jos hinnasta ei sovita ${DELIVERY_BID.biddingMinutes} minuutissa, tilaus perutaan.`,
      },
      {
        q: 'Mitä asiakas näkee minusta?',
        a: 'Tarjouksessa asiakas näkee nimesi muodossa "Janne K.", profiilikuvasi, tähtiarviosi ja kulkuneuvosi.',
      },
      {
        q: 'Millä puhelimella sovellus toimii?',
        a: 'Android- ja iPhone-puhelimilla. Saat latausohjeet, kun hakemuksesi on hyväksytty.',
      },
    ],
    apply: {
      kicker: 'Hakemus',
      title: 'Hae kuljettajaksi',
      lead: 'Jätä hakemus, niin otamme yhteyttä ja lähetämme ohjeet sovelluksen lataamiseen.',
      fields: { name: 'Nimesi', phone: 'Puhelin', email: 'Sähköposti', vehicle: 'Kulkuneuvo', billing: 'Laskutustapa' },
      placeholder: 'Valitse',
      vehicles: [
        ['polkupyora', 'Polkupyörä'],
        ['sahkopyora', 'Sähköpyörä'],
        ['mopo', 'Mopo'],
        ['auto', 'Auto'],
      ],
      billing: [
        ['own_company', 'Oma yritys (Y-tunnus)'],
        ['light_entrepreneur', 'Kevytyrittäjä (esim. UKKO.fi tai Eezy)'],
      ],
      submit: 'Lähetä hakemus',
      successTitle: 'Kiitos! Hakemus on vastaanotettu.',
      successBody: 'Otamme yhteyttä ja lähetämme ohjeet sovelluksen lataamiseen.',
      contact: 'Kysyttävää? Kirjoita meille:',
    },
  },
  en: {
    title: 'Bidrop for couriers – drive when it suits you',
    hero: {
      kicker: 'Bidrop for couriers · Kuopio',
      title: 'Drive when it suits you.',
      lead: 'You set your own price for each delivery, and the whole agreed price is yours. No shift schedules.',
      primary: 'Apply to drive',
      secondary: 'How a delivery works',
      facts: [`${bidRange('en')} / delivery`, '100% yours', 'Paid every two weeks'],
      imageAlt: 'Bidrop courier app: weekly earnings and deliveries',
    },
    benefits: {
      kicker: 'Why Bidrop',
      title: 'Your time, your price',
      items: [
        {
          icon: 'clock',
          title: 'Your own hours',
          body: 'Go online whenever you want and stop whenever you want. There are no shift schedules.',
        },
        {
          icon: 'tag',
          title: 'You set the price',
          body: `You offer a price between ${bidRange('en')} for each delivery, and the whole agreed price is yours.`,
        },
        {
          icon: 'wallet',
          title: 'Paid every two weeks',
          body: 'Earnings are paid to your account every two weeks, and you see every payout in the app.',
        },
        {
          icon: 'receipt',
          title: 'No invoicing yourself',
          body: 'Bidrop invoices on your behalf (self-billing). As a light entrepreneur, your invoicing service handles taxes.',
        },
      ],
    },
    how: {
      kicker: 'How it works',
      title: 'How a delivery works',
      steps: [
        { title: 'Go online', body: 'Slide online when you want to drive. You see how busy the area is.' },
        {
          title: 'See a delivery request',
          body: 'You see nearby orders: the restaurant, the food total and the distance.',
        },
        {
          title: 'Offer your price',
          body: 'The customer accepts your offer or offers their own price, which you can accept.',
        },
        {
          title: 'Pick up',
          body: 'The app tells you when to leave. You confirm the pickup with the restaurant’s pickup code.',
        },
        { title: 'Deliver', body: 'Navigate with your own map app. Your location confirms the delivery.' },
        {
          title: 'Get paid',
          body: 'Earnings are recorded instantly, and payment reaches your account every two weeks.',
        },
      ],
    },
    app: {
      kicker: 'App',
      title: 'Earnings and payouts always in view',
      lead: 'The app shows your weekly earnings, the payment status of every delivery and payout statements for each two-week period.',
      items: [
        'Daily and weekly earnings',
        'A payout statement for every period',
        'Notifications for new delivery requests',
        'In Finnish and English',
      ],
      images: [
        { src: '/partner/screens/app-earnings.jpg', alt: 'Earnings view: weekly earnings and deliveries' },
        { src: '/partner/screens/app-payouts.jpg', alt: 'Payouts view: two-week periods and payment status' },
      ],
    },
    requirements: {
      kicker: 'Requirements',
      title: 'What you need',
      items: [
        'At least 18 years old',
        'A smartphone (Android or iPhone) with mobile data',
        'A bicycle, e-bike, moped or car',
        'A Finnish business ID or light entrepreneurship (e.g. UKKO.fi or Eezy)',
        'An ID card or passport – a driving licence too for a car or moped',
        'A clean, insulated delivery bag',
      ],
    },
    terms: {
      kicker: 'Terms',
      title: 'Terms in brief',
      items: [
        'You work as an entrepreneur with your own business ID or as a light entrepreneur. The minimum age is 18.',
        'You can go online once Bidrop has approved your documents – usually within 1–2 business days.',
        'The whole agreed delivery price is yours. Bidrop takes no share of it.',
        'Two unanswered delivery offers in a row set you offline.',
        'Your location is only used while you are online or on a delivery.',
      ],
    },
    faq: [
      {
        q: 'How much can a courier earn?',
        a: `You offer your own price for each delivery (${bidRange('en')}). When the customer accepts, the whole price is yours – Bidrop takes no share.`,
      },
      {
        q: 'Do I need a company?',
        a: 'Yes. You work as an entrepreneur with your own business ID or as a light entrepreneur through an invoicing service (e.g. UKKO.fi or Eezy).',
      },
      {
        q: 'When am I paid?',
        a: 'Every two weeks. Bidrop calculates your earnings from the deliveries in the app and invoices on your behalf.',
      },
      {
        q: 'Can I drive only in the evenings or at weekends?',
        a: 'Yes. There are no shift schedules: go online whenever you want and stop whenever you want.',
      },
      {
        q: 'How are deliveries assigned?',
        a: `A home delivery order is shown to online couriers within about 8 km. Each offers a price and the customer chooses. If no price is agreed within ${DELIVERY_BID.biddingMinutes} minutes, the order is cancelled.`,
      },
      {
        q: 'What does the customer see about me?',
        a: 'With your offer, the customer sees your name as "Janne K.", your profile photo, your star rating and your vehicle.',
      },
      {
        q: 'Which phones does the app work on?',
        a: 'Android phones and iPhones. You receive download instructions once your application has been approved.',
      },
    ],
    apply: {
      kicker: 'Application',
      title: 'Apply to drive',
      lead: 'Send your application and we will contact you with instructions for downloading the app.',
      fields: { name: 'Your name', phone: 'Phone', email: 'Email', vehicle: 'Vehicle', billing: 'Invoicing' },
      placeholder: 'Select',
      vehicles: [
        ['polkupyora', 'Bicycle'],
        ['sahkopyora', 'E-bike'],
        ['mopo', 'Moped'],
        ['auto', 'Car'],
      ],
      billing: [
        ['own_company', 'Own company (business ID)'],
        ['light_entrepreneur', 'Light entrepreneur (e.g. UKKO.fi or Eezy)'],
      ],
      submit: 'Send application',
      successTitle: 'Thank you! Your application has been received.',
      successBody: 'We will contact you and send instructions for downloading the app.',
      contact: 'Questions? Email us:',
    },
  },
}

export function sharedCopy(lang) {
  return SHARED[lang] ?? SHARED.fi
}

export function restaurantCopy(lang) {
  const copy = RESTAURANT[lang] ?? RESTAURANT.fi
  return { ...copy, plans: restaurantPlans(lang) }
}

export function courierCopy(lang) {
  return COURIER[lang] ?? COURIER.fi
}

// ── Erilliset hakusivut (käyttäjän pyyntö 25.10.2026) ────────────────────
// /kumppanina/hae ja /kumppanina/kuljettajat/hae: lomake omalla sivullaan,
// pääsivujen lopussa kaista, josta pääsee hakemukseen.

const APPLY_PAGE = {
  restaurant: {
    fi: {
      title: 'Hae Bidropin kumppaniksi',
      documentTitle: 'Hae kumppaniksi – Bidrop',
      nextTitle: 'Mitä tapahtuu seuraavaksi',
      next: [
        'Otamme yhteyttä ja kerromme paketeista tarkemmin.',
        'Teemme kirjallisen sopimuksen ja otamme kojelaudan käyttöön.',
        'Lisäät ruokalistan, ja tilaukset alkavat – yleensä alle viikossa.',
      ],
      back: 'Takaisin ravintolasivulle',
      band: {
        title: 'Valmis aloittamaan?',
        body: 'Ensimmäinen kuukausi 0 €. Hakemus vie minuutin.',
        button: 'Hae kumppaniksi',
      },
    },
    en: {
      title: 'Become a Bidrop partner',
      documentTitle: 'Become a partner – Bidrop',
      nextTitle: 'What happens next',
      next: [
        'We contact you and tell you more about the plans.',
        'We sign a written agreement and set up the dashboard.',
        'You add your menu and orders start – usually in under a week.',
      ],
      back: 'Back to the restaurant page',
      band: {
        title: 'Ready to start?',
        body: 'First month €0. The application takes a minute.',
        button: 'Become a partner',
      },
    },
  },
  courier: {
    fi: {
      title: 'Hae Bidropin kuljettajaksi',
      documentTitle: 'Hae kuljettajaksi – Bidrop',
      nextTitle: 'Mitä tapahtuu seuraavaksi',
      next: [
        'Otamme yhteyttä ja lähetämme ohjeet sovelluksen lataamiseen.',
        'Lisäät dokumentit sovelluksessa, ja Bidrop tarkistaa ne yleensä 1–2 arkipäivässä.',
        'Menet online-tilaan ja otat ensimmäiset keikat.',
      ],
      back: 'Takaisin kuljettajasivulle',
      band: {
        title: 'Valmis ajamaan?',
        body: 'Omat työajat, oma hinta. Hakemus vie minuutin.',
        button: 'Hae kuljettajaksi',
      },
    },
    en: {
      title: 'Apply to drive with Bidrop',
      documentTitle: 'Apply to drive – Bidrop',
      nextTitle: 'What happens next',
      next: [
        'We contact you and send instructions for downloading the app.',
        'You add your documents in the app, and Bidrop usually checks them within 1–2 business days.',
        'You go online and take your first deliveries.',
      ],
      back: 'Back to the courier page',
      band: {
        title: 'Ready to drive?',
        body: 'Your own hours, your own price. The application takes a minute.',
        button: 'Apply to drive',
      },
    },
  },
}

export const APPLY_PATHS = { restaurant: '/kumppanina/hae', courier: '/kumppanina/kuljettajat/hae' }

export function applyPageCopy(kind, lang) {
  const base = kind === 'courier' ? courierCopy(lang) : restaurantCopy(lang)
  const extra = APPLY_PAGE[kind][lang] ?? APPLY_PAGE[kind].fi
  return { ...base.apply, ...extra, facts: base.hero.facts, offer: base.hero.offer }
}

// Yläpalkin linkit ja päätoiminto sivutyypin mukaan (ravintolat / kuljettajat).
export function partnerNav(kind, lang) {
  const t = sharedCopy(lang).nav
  if (kind === 'courier') {
    return {
      links: [
        { to: '/kumppanina', label: t.restaurants },
        { to: '/kumppanina/kuljettajat#miten-toimii', label: t.how },
        { to: '/kumppanina/kuljettajat#sovellus', label: t.earnings },
        { to: '/kumppanina/kuljettajat#ukk', label: t.faq },
      ],
      cta: { to: APPLY_PATHS.courier, label: t.applyCourier },
    }
  }
  return {
    links: [
      { to: '/kumppanina#miten-toimii', label: t.how },
      { to: '/kumppanina#hinnat', label: t.pricing },
      { to: '/kumppanina/kuljettajat', label: t.couriers },
      { to: '/kumppanina#ukk', label: t.faq },
    ],
    cta: { to: APPLY_PATHS.restaurant, label: t.applyRestaurant },
  }
}

// Kumppaniehdot (/kumppanina/ehdot) suomeksi ja englanniksi. Pohjana vanhan
// kumppanisivun ehtotiivistelmät (luonnos 22.10.2026) ja uuden sivun päätökset
// (24.10.2026: 1. kuukausi 0 €, Kovimmat tarjoukset -nosto). Kohta on joko
// tekstirivi tai { lead, text }. Sitova sopimus tehdään aina kirjallisesti.

import { formatPrice } from '../../lib/format.js'
import { COMMITMENT_MONTHS, DEVICE_SETUP_CENTS, EXTRA_DELIVERY_CENTS } from '../../lib/partnerPlans.js'
import { DELIVERY_BID } from '../../lib/deliveryTime.js'
import { BOOST_WEEK_CENTS, money } from './copy.js'

const bid = (lang) => `${money(DELIVERY_BID.minCents, lang)}–${money(DELIVERY_BID.maxCents, lang)}`

const TERMS = {
  fi: {
    title: 'Kumppaniehdot',
    lead: 'Tiivistelmä Bidropin ravintola- ja kuljettajakumppanuuden ehdoista. Sitova sopimus tehdään kirjallisesti ennen yhteistyön alkua.',
    tabs: { restaurants: 'Ravintolat', couriers: 'Kuljettajat' },
    restaurants: [
      {
        title: 'Hinnat ja edut',
        items: [
          'Kuukausimaksu paketin mukaan, ei provisiota tilauksista. Kaikki hinnat + alv.',
          'Ensimmäisen kuukauden kuukausimaksu on 0 € kaikissa paketeissa. Etu on voimassa toistaiseksi.',
          `Käyttöönotto (asennus, koulutus ja tarvittaessa tabletti) ${money(DEVICE_SETUP_CENTS, 'fi', { whole: true })} kertamaksuna.`,
          `Paketin ylittävät kuljetustilaukset ${formatPrice(EXTRA_DELIVERY_CENTS)} kappaleelta.`,
          `Kovimmat tarjoukset -nosto ${money(BOOST_WEEK_CENTS, 'fi', { whole: true })} viikossa + alv. Nosto merkitään asiakkaalle mainokseksi.`,
        ],
      },
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
          'Bidrop voi tehdä ravintolan tuotteisiin tarjouksia ja alennuksia tuodakseen ravintolalle lisää tilauksia. Alennuksen kustannus kuuluu ravintolalle, eli ravintola saa tilauksesta alennetun hinnan. Bidrop sitoutuu näihin rajoihin:',
        ordered: [
          'Enintään 20 % alennus tuotteen normaalihinnasta.',
          'Enintään 2 kampanjaa kuukaudessa, ja yksi kampanja kestää enintään 7 päivää.',
          'Ravintolan alennusten yhteiskustannus on enintään 150 € kuukaudessa, ellei ravintola itse hyväksy enempää.',
          'Bidrop ilmoittaa kampanjasta vähintään 7 päivää etukäteen (tuotteet, alennus, ajankohta).',
          'Ravintola voi kieltäytyä kampanjasta ilmoittamalla siitä ennen kampanjan alkua, ilman seuraamuksia. Ravintola voi myös kieltää kampanjat kokonaan.',
          'Alennus ei koske alkoholijuomia eikä tuotteita, jotka ravintola on merkinnyt kampanjoiden ulkopuolelle.',
          'Jos Bidrop itse jakaa asiakkaalle alennuskoodin (esim. "ensimmäinen tilaus –5 €"), Bidrop maksaa sen, ei ravintola.',
        ],
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
          'Hinnat, tuotetiedot ja allergeenitiedot pidetään ajan tasalla.',
          'Aukioloajat ovat oikein, ja ravintola sulkee tilausten vastaanoton, jos ei pysty valmistamaan tilauksia.',
          'Ruoka pakataan niin, että se kestää kuljetuksen.',
          'Ravintolalla on voimassa olevat elintarvikeluvat (omavalvonta, ilmoitus elintarvikehuoneistosta).',
        ],
      },
      {
        title: 'Tietojen muutokset ja arvostelut',
        items: [
          'Ruokalistan, hinnat, kuvat ja aukioloajat ravintola muuttaa itse kojelaudalla milloin tahansa.',
          'Ravintolan nimi, osoite, Y-tunnus, tilinumero ja paketti muuttuvat muutospyynnöllä, johon liitetään dokumentti. Bidrop käsittelee pyynnön yleensä 1–2 arkipäivässä.',
          'Asiakas voi arvostella ravintolan vain valmiin tilauksen jälkeen. Ravintola voi vastata arvosteluihin, mutta ei poistaa niitä. Asiattomat arvostelut Bidrop poistaa.',
        ],
      },
    ],
    couriers: [
      {
        title: 'Ansiot ja maksut',
        items: [
          `Tarjoat jokaiseen keikkaan hinnan (${bid('fi')}). Asiakas hyväksyy tarjouksesi tai tarjoaa omaa hintaansa, jonka voit hyväksyä. Koko sovittu hinta on sinun – Bidrop ei ota siitä osuutta.`,
          'Ansiot maksetaan kahden viikon välein. Bidrop laskee ne sovelluksen keikoista ja tekee laskun puolestasi (itselaskutus).',
          'Yrittäjänä hoidat itse tuloverosi ja mahdollisen arvonlisäveron. Kevytyrittäjänä laskutuspalvelu (esim. UKKO.fi tai Eezy) hoitaa ne puolestasi.',
        ],
      },
      {
        title: 'Aloitus ja dokumentit',
        items: [
          'Toimit yrittäjänä omalla Y-tunnuksella tai kevytyrittäjänä. Ikäraja on 18 vuotta.',
          'Lisää sovelluksessa henkilöllisyystodistus. Autolla tai mopolla ajaessa tarvitaan myös ajokortti, ja omalla yrityksellä laskuttaessa pankkitodiste tilinumerosta.',
          'Pääset online-tilaan, kun Bidrop on hyväksynyt dokumentit – yleensä 1–2 arkipäivässä.',
        ],
      },
      {
        title: 'Keikat',
        items: [
          'Mene online-tilaan silloin kun haluat – vuorolistoja ei ole.',
          'Näet kotiinkuljetustilaukset noin 8 km säteellä: ravintolan, ruoan summan, matkan ja asiakkaan mahdollisen hintatarjouksen. Tarkka osoite näkyy, kun asiakas on valinnut sinut.',
          'Voit tehdä yhden hintatarjouksen kerrallaan. Kun asiakas valitsee sinut, keikka on sinun.',
          'Jos toinen kuljettaja luopuu keikasta, se tarjotaan suoraan lähimmälle samalla hinnalla – sinulla on 60 sekuntia aikaa vastata. Kaksi vastaamatonta peräkkäin siirtää sinut offline-tilaan.',
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
          'Ruoka kuljetetaan puhtaassa, lämpöä pitävässä laukussa.',
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
    ],
  },
  en: {
    title: 'Partner terms',
    lead: 'A summary of the terms for Bidrop restaurant and courier partners. The binding agreement is always made in writing before the partnership starts.',
    tabs: { restaurants: 'Restaurants', couriers: 'Couriers' },
    restaurants: [
      {
        title: 'Prices and benefits',
        items: [
          'A monthly fee based on the plan, no commission on orders. All prices + VAT.',
          'The monthly fee for the first month is €0 on every plan. The offer is valid until further notice.',
          `Setup (installation, training and a tablet if needed) ${money(DEVICE_SETUP_CENTS, 'en', { whole: true })} as a one-off fee.`,
          `Delivery orders above the plan ${money(EXTRA_DELIVERY_CENTS, 'en')} each.`,
          `Top deals boost ${money(BOOST_WEEK_CENTS, 'en', { whole: true })} per week + VAT. The boost is labelled as an advertisement to customers.`,
        ],
      },
      {
        title: 'Commitment and termination',
        items: [
          `The agreement is fixed-term for ${COMMITMENT_MONTHS} months.`,
          `After ${COMMITMENT_MONTHS} months the agreement continues until further notice and can be terminated with 1 month’s notice.`,
          'Either party may terminate the agreement immediately if the other materially breaches the terms and does not remedy it within 14 days of notice.',
          'You can upgrade to a larger plan at any time. Moving to a smaller plan takes effect from the next billing period.',
          'Bidrop announces price changes at least 30 days in advance. Prices will not rise during the first 12 months.',
        ],
      },
      {
        title: 'Payouts and invoicing',
        items: [
          'Food totals paid by customers are transferred to the restaurant’s account every two weeks with a summary.',
          'The monthly fee is invoiced at the start of the month, payment term 14 days.',
          'If the restaurant’s payouts and Bidrop’s invoices relate to the same period, they can be agreed to be offset against each other.',
        ],
      },
      {
        title: 'Campaigns and offers',
        intro:
          'Bidrop may run offers and discounts on the restaurant’s products to bring the restaurant more orders. The cost of the discount is borne by the restaurant, i.e. the restaurant receives the discounted price for the order. Bidrop commits to these limits:',
        ordered: [
          'A discount of at most 20% of the product’s normal price.',
          'At most 2 campaigns per month, each lasting at most 7 days.',
          'The total cost of the restaurant’s discounts is at most €150 per month, unless the restaurant agrees to more.',
          'Bidrop announces a campaign at least 7 days in advance (products, discount, timing).',
          'The restaurant may decline a campaign by giving notice before it starts, without consequences. The restaurant may also opt out of campaigns entirely.',
          'Discounts never apply to alcoholic drinks or products the restaurant has excluded from campaigns.',
          'If Bidrop itself gives customers a discount code (e.g. "first order –€5"), Bidrop pays for it, not the restaurant.',
        ],
      },
      {
        title: 'Cancellations and complaints',
        items: [
          {
            lead: 'Restaurant error (item sold out, wrong or incomplete dish, quality issue):',
            text: 'the amount refunded to the customer is deducted from the restaurant’s next payout.',
          },
          {
            lead: 'Delivery or Bidrop error (delay caused by the courier, food damaged in transit, technical fault):',
            text: 'Bidrop covers the refund.',
          },
          {
            lead: 'The customer cancels before the restaurant has accepted the order:',
            text: 'no cost to the restaurant. After acceptance, the order cannot be cancelled without the restaurant’s consent.',
          },
          'The restaurant responds to a complaint received through Bidrop within 24 hours. In unclear cases, Bidrop investigates and explains its decision.',
        ],
      },
      {
        title: 'Restaurant responsibilities',
        items: [
          'Prices, product details and allergen information are kept up to date.',
          'Opening hours are correct, and the restaurant closes ordering if it cannot prepare orders.',
          'Food is packed so that it survives delivery.',
          'The restaurant holds valid food permits (in-house control, food premises notification).',
        ],
      },
      {
        title: 'Changes to details and reviews',
        items: [
          'The restaurant changes its menu, prices, photos and opening hours itself in the dashboard at any time.',
          'The restaurant’s name, address, business ID, bank account and plan are changed by a change request with a supporting document. Bidrop usually processes requests within 1–2 business days.',
          'Customers can review a restaurant only after a completed order. The restaurant can reply to reviews but not remove them. Bidrop removes inappropriate reviews.',
        ],
      },
    ],
    couriers: [
      {
        title: 'Earnings and payments',
        items: [
          `You offer a price for each delivery (${bid('en')}). The customer accepts your offer or offers their own price, which you can accept. The whole agreed price is yours – Bidrop takes no share.`,
          'Earnings are paid every two weeks. Bidrop calculates them from the deliveries in the app and invoices on your behalf (self-billing).',
          'As an entrepreneur you handle your own income tax and any VAT. As a light entrepreneur, the invoicing service (e.g. UKKO.fi or Eezy) handles them for you.',
        ],
      },
      {
        title: 'Getting started and documents',
        items: [
          'You work as an entrepreneur with your own business ID or as a light entrepreneur. The minimum age is 18.',
          'Add an ID document in the app. When driving a car or moped, a driving licence is also required, and when invoicing through your own company, proof of your bank account.',
          'You can go online once Bidrop has approved your documents – usually within 1–2 business days.',
        ],
      },
      {
        title: 'Deliveries',
        items: [
          'Go online whenever you want – there are no shift schedules.',
          'You see home delivery orders within about 8 km: the restaurant, the food total, the distance and any price offered by the customer. The exact address is shown once the customer has chosen you.',
          'You can make one price offer at a time. When the customer chooses you, the delivery is yours.',
          'If another courier gives up a delivery, it is offered directly to the nearest courier at the same price – you have 60 seconds to respond. Two unanswered offers in a row set you offline.',
          'You can cancel an accepted delivery before pickup, and it then moves to another courier.',
        ],
      },
      {
        title: 'Pickup and delivery',
        items: [
          'The restaurant gives you a pickup code, which you use to confirm the pickup in the app.',
          'Delivery is confirmed in the app at the destination, and your location is checked against the delivery address.',
          'If the customer cannot be reached, the address is wrong or the food is damaged in transit, contact support from the app.',
        ],
      },
      {
        title: 'Equipment and insurance',
        items: [
          'Food is carried in a clean, insulated bag.',
          'As an entrepreneur you are not covered by an employer’s statutory accident insurance, so your own accident insurance is recommended. Light entrepreneur services often include it.',
          'You are responsible for the condition and insurance of your vehicle.',
        ],
      },
      {
        title: 'App and location',
        items: [
          'The courier app works on Android phones and iPhones.',
          'Your location is only used while you are online or on a delivery: to choose the nearest courier, to confirm delivery and to let the customer follow the delivery.',
          'When you are offline, your location is not tracked.',
        ],
      },
      {
        title: 'Changes to details and closing your account',
        items: [
          'Your name, email, vehicle, business ID and bank account are changed by a change request in the app. You change your phone number and app settings yourself.',
          'Bidrop may close your account if your documents are not valid or the terms are materially breached.',
        ],
      },
    ],
  },
}

export function termsCopy(lang) {
  return TERMS[lang] ?? TERMS.fi
}

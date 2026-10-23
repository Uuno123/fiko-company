import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, FileText, Mail } from 'lucide-react'
import { Card, PageHeader } from '../ui.jsx'

// Kumppanisivun ehdot ja hinnasto (/kumppanina).
const SUPPORT_LINKS = [
  { to: '/kumppanina#ehdot', label: 'Ravintolaehdot' },
  { to: '/kumppanina#hinnoittelu', label: 'Paketit ja hinnasto' },
]

const TOPICS = [
  {
    q: 'Miten hyväksyn tilauksen?',
    a: 'Uusi tilaus soittaa äänimerkin ja näkyy Tilaukset-sivun Uudet-sarakkeessa. Avaa tilaus, valitse valmistumisaika ja paina Hyväksy. Hyväksymätön tilaus peruuntuu automaattisesti 90 sekunnin kuluttua. Kotiinkuljetuksessa kuljettaja on jo sovittu, kun tilaus tulee sinulle.',
  },
  {
    q: 'Tilaus myöhästyy - mitä teen?',
    a: 'Avaa tilaus ja valitse "Myöhästyykö tilaus?" -kohdasta +5, +10 tai +15 min. Uusi aika näkyy asiakkaalle heti.',
  },
  {
    q: 'Keittiössä on ruuhka',
    a: 'Valitse yläpalkin tilavalikosta "+10 min" tai "+20 min valmistusaikaan", jolloin asiakkaat näkevät pidemmän arvion. Jos tilauksia tulee liikaa, pidä 15-60 minuutin tauko - ravintola avautuu automaattisesti tauon jälkeen.',
  },
  {
    q: 'Tuote loppui kesken päivän',
    a: 'Kytke tuotteen Myynnissä-kytkin pois Ruokalista-sivulla tai paina "Loppui" suoraan tilauksen tuoterivillä. Tuote näkyy asiakkaille loppuneena, kunnes palautat sen.',
  },
  {
    q: 'Miten ääni saadaan toimimaan tabletilla?',
    a: 'Selaimet sallivat äänen vasta ensimmäisen napautuksen jälkeen. Napauta kojelautaa kerran avaamisen jälkeen ja kokeile ääntä Asetukset → Tilauslaite → Soita testiääni. Pidä laitteen äänenvoimakkuus ylhäällä.',
  },
  {
    q: 'Mistä myyntiluvut lasketaan?',
    a: 'Luvut ovat ravintolan osuus: tuotteiden hinta alennuksen jälkeen. Kuljetus- ja palvelumaksu eivät kuulu ravintolalle, joten ne eivät ole mukana.',
  },
]

function Topic({ topic }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`pd-faq__item${open ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {topic.q}
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open && <p>{topic.a}</p>}
    </li>
  )
}

export default function SupportView() {
  return (
    <div className="pd-view">
      <PageHeader title="Tuki" description="Ohjeet yleisimpiin tilanteisiin ja yhteys Bidropin kumppanitukeen." />
      <div className="pd-two-col pd-two-col--narrow-right">
        <Card title="Usein kysyttyä">
          <ul className="pd-faq">
            {TOPICS.map((topic) => (
              <Topic key={topic.q} topic={topic} />
            ))}
          </ul>
        </Card>
        <div className="pd-stack">
          <Card title="Ota yhteyttä">
            <a className="pd-contact" href="mailto:tuki@bidrop.fi?subject=Kumppanituki">
              <Mail size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>
                <strong>Sähköposti</strong>
                <span className="pd-muted">tuki@bidrop.fi · vastaamme arkisin saman päivän aikana</span>
              </span>
            </a>
          </Card>
          <Card title="Sopimukset">
            <ul className="pd-list">
              {SUPPORT_LINKS.map((link) => (
                <li key={link.to}>
                  <Link className="pd-inline" to={link.to}>
                    <FileText size={17} strokeWidth={1.75} aria-hidden="true" /> {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

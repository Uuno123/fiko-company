import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import DelivoLogo from './DelivoLogo.jsx'
import PromoCarousel from './PromoCarousel.jsx'
import RestaurantCard from './RestaurantCard.jsx'
import './HomeDesktopGrid.css'

// Työpöydän etusivu Uber Eatsin mallikuvan asettelulla (käyttäjän pyyntö
// 10.11.2026, ilman kategorioita): otsikkoteksti, ravintoloiden kuvapromot ja
// otsikkorivit (myös tarjousosiot). Bidropin omat värit ja tekstit. Näkyy vain
// leveillä näytöillä (HomeDesktopGrid.css).
// Otsikkorivi mallikuvan tapaan (10.11.2026): iso otsikko, "Näytä kaikki",
// nuolet ja neljä korttia rinnakkain vieritettävänä.
function GridRow({ title, seeAllTo, items, deal, hot, favoriteIds, onToggleFavorite }) {
  const scrollRef = useRef(null)

  function scroll(direction) {
    const scroller = scrollRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' })
  }

  return (
    // deal: tarjousosio persikkapaneelina Bidrop-logolla kuten puhelimella.
    <section className={`hgrid-row${deal ? ' hgrid-row--deal' : ''}${hot ? ' hgrid-row--hot' : ''}`}>
      <div className="hgrid-row__head">
        <div className="hgrid-row__title">
          {deal && <DelivoLogo className="hgrid-row__logo" />}
          <h2>{title}</h2>
        </div>
        <div className="hgrid-row__actions">
          {seeAllTo && (
            <Link to={seeAllTo} className="hgrid-row__all">
              Näytä kaikki
            </Link>
          )}
          <button type="button" className="hgrid-row__nav" aria-label="Edelliset" onClick={() => scroll(-1)}>
            <ArrowLeft size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <button type="button" className="hgrid-row__nav" aria-label="Seuraavat" onClick={() => scroll(1)}>
            <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="hgrid-row__scroll" ref={scrollRef}>
        {items.map((r) => (
          // Sama ravintolakortti kuin puhelimella (käyttäjän pyyntö 10.11.2026).
          <RestaurantCard
            key={r.id}
            restaurant={r}
            disabled={r.isPlaceholder}
            isFavorite={favoriteIds?.has(r.id)}
            onToggleFavorite={r.isPlaceholder ? undefined : onToggleFavorite}
          />
        ))}
      </div>
    </section>
  )
}

// groups: [{ key, title, seeAllTo, items }] - etusivun rivit otsikoineen.
// Ylhäällä iso otsikkoteksti ja promokortti (käyttäjän pyyntö 10.11.2026,
// suodatinpainikkeiden tilalla), sen alla otsikkorivit.
export default function HomeDesktopGrid({ groups = [], promoItems = [], favoriteIds, onToggleFavorite }) {
  return (
    <section className="hgrid" aria-label="Ravintolat">
      <div className="hgrid-hero">
        <div className="hgrid-hero__text">
          <h1>
            Nälkä? <span>Hoidetaan.</span>
          </h1>
          <p>Kuopion ravintolat ovelle. Kuljettajat tarjoavat hinnan, sinä valitset.</p>
        </div>
        {/* Ravintoloiden kuvapromot kuten puhelimella (käyttäjän pyyntö 10.11.2026). */}
        <div className="hgrid-hero__promo">
          <PromoCarousel items={promoItems} ariaLabel="Tarjoukset" />
        </div>
      </div>

      <div className="hgrid__rows">
        {groups
          .filter((group) => group.items.length > 0)
          .map((group) => (
            <GridRow
              key={group.key}
              title={group.title}
              deal={group.deal}
              hot={group.key === 'deals-row'}
              seeAllTo={group.seeAllTo}
              items={group.items}
              favoriteIds={favoriteIds}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
      </div>
    </section>
  )
}

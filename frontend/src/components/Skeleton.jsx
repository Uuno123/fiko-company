import './Skeleton.css'

// Skeleton-lataus pyörivän pallon tilalle (käyttäjän pyyntö 2.11.2026): sivun
// muoto harmaina laatikoina, jotka vilkkuvat hitaasti.
//   variant="rows"       etusivun ravintolarivit (otsikko + vaakarivi kortteja)
//   variant="grid"       kategoria- ja hakusivun korttiruudukko
//   variant="restaurant" ravintolasivu (kuva, tiedot ja tuotelista)
// Ruudunlukijalle kerrotaan lataus label-tekstillä.

function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <span className="skeleton skeleton-card__media" />
      <span className="skeleton skeleton-line skeleton-line--title" />
      <span className="skeleton skeleton-line skeleton-line--meta" />
    </div>
  )
}

function Skeleton({ variant = 'rows', label = 'Ladataan…' }) {
  return (
    <div className={`skeleton-page skeleton-page--${variant}`} role="status" aria-live="polite">
      <span className="skeleton-page__label">{label}</span>

      {variant === 'rows' &&
        [0, 1].map((row) => (
          <div key={row} className="skeleton-row" aria-hidden="true">
            <span className="skeleton skeleton-line skeleton-line--heading" />
            <div className="skeleton-row__cards">
              {[0, 1, 2, 3, 4].map((card) => (
                <CardSkeleton key={card} />
              ))}
            </div>
          </div>
        ))}

      {variant === 'grid' && (
        <div className="skeleton-grid" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((card) => (
            <CardSkeleton key={card} />
          ))}
        </div>
      )}

      {variant === 'restaurant' && (
        <div className="skeleton-restaurant" aria-hidden="true">
          <span className="skeleton skeleton-restaurant__banner" />
          <span className="skeleton skeleton-restaurant__logo" />
          <span className="skeleton skeleton-line skeleton-line--heading" />
          <span className="skeleton skeleton-line skeleton-line--meta" />
          <div className="skeleton-restaurant__items">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton-item">
                <div className="skeleton-item__text">
                  <span className="skeleton skeleton-line skeleton-line--title" />
                  <span className="skeleton skeleton-line skeleton-line--meta" />
                  <span className="skeleton skeleton-line skeleton-line--short" />
                </div>
                <span className="skeleton skeleton-item__media" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Skeleton

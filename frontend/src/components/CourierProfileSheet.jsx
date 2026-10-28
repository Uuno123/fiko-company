import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import { CourierAvatar, ReviewScore } from './CourierAvatar.jsx'
import { ScoreSmiley } from './Smiley.jsx'
import { formatPrice } from '../lib/format.js'
import { VEHICLE_LABELS, fetchBidCourierProfile } from '../lib/deliveryBids.js'
import { formatReviewScore, formatScore } from '../lib/score.js'
import './CourierProfileSheet.css'

const MONTH_FORMAT = { month: 'numeric', year: 'numeric' }

// Kuljettajan koko profiili, kun asiakas napauttaa tarjousta (käyttäjän pyyntö
// 24.10.2026): kuva, nimi, kulkuneuvo, tähtiarvio ja jakauma, toimitukset,
// aloitusaika ja uusimmat kirjoitetut arviot. Alhaalla hinta ja hyväksyntä.
// Puhelimella alhaalta liukuva paneeli, työpöydällä keskitetty ikkuna.
// Tiedot tulevat bid_courier_profile-funktiosta (0063); ennen sitä näkyy se,
// mitä tarjouksessa on (kuva, arvio, määrä).
export default function CourierProfileSheet({ bid, distance, disabled, onAccept, onClose }) {
  const [profile, setProfile] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchBidCourierProfile(bid.id).then(
      (data) => {
        if (cancelled) return
        if (data) setProfile(data)
        else setFailed(true)
      },
      () => !cancelled && setFailed(true),
    )
    return () => {
      cancelled = true
    }
  }, [bid.id])

  const rating = profile?.rating ?? bid.courier_rating
  const count = profile?.review_count ?? bid.courier_review_count ?? 0
  const hasRating = count > 0 && rating != null
  const distribution = profile?.distribution ?? {}
  const reviews = profile?.reviews ?? []

  return (
    <BottomSheet
      onClose={onClose}
      labelledBy="courier-profile-title"
      footer={
        <div className="courier-profile__footer">
          <span>
            Kuljetus
            <strong>{formatPrice(bid.price_cents)}</strong>
          </span>
          <button type="button" className="courier-profile__accept" disabled={disabled} onClick={() => onAccept(bid)}>
            Hyväksy
          </button>
        </div>
      }
    >
      <div className="courier-profile">
        <header className="courier-profile__head">
          <CourierAvatar
            name={bid.courier_name}
            photoPath={profile?.photo_path ?? bid.courier_photo_path}
            vehicle={bid.vehicle}
            large
          />
          <h2 id="courier-profile-title">{bid.courier_name}</h2>
          <p>
            {VEHICLE_LABELS[bid.vehicle] ?? 'Kuljettaja'}
            {distance ? ` · ${distance} ravintolasta` : ''}
          </p>
          {!hasRating && <span className="courier-profile__new">Uusi kuljettaja</span>}
        </header>

        <dl className="courier-profile__stats">
          <div>
            <dt>Arvio</dt>
            <dd>
              {hasRating ? (
                <>
                  <ScoreSmiley rating={rating} size={18} />
                  {formatScore(rating)}
                </>
              ) : (
                '–'
              )}
            </dd>
          </div>
          <div>
            <dt>Arviot</dt>
            <dd>{count}</dd>
          </div>
          {profile?.since && (
            <>
              <div>
                <dt>Toimitukset</dt>
                <dd>{profile.deliveries}</dd>
              </div>
              <div>
                <dt>Kuljettajana</dt>
                <dd>{new Date(profile.since).toLocaleDateString('fi-FI', MONTH_FORMAT)} alkaen</dd>
              </div>
            </>
          )}
        </dl>

        {profile?.distribution && hasRating && (
          <ul className="courier-profile__bars" aria-label="Arvioiden jakauma">
            {[5, 4, 3, 2, 1].map((stars) => {
              const n = distribution[stars] ?? 0
              return (
                <li key={stars}>
                  <span>{formatReviewScore(stars)}</span>
                  <ScoreSmiley rating={stars} size={14} />
                  <span className="courier-profile__bar">
                    <span style={{ width: `${(n / count) * 100}%` }} />
                  </span>
                  <span className="courier-profile__bar-count">{n}</span>
                </li>
              )
            })}
          </ul>
        )}

        <section className="courier-profile__reviews" aria-labelledby="courier-profile-reviews">
          <h3 id="courier-profile-reviews">Asiakkaiden arviot</h3>
          {!profile && !failed ? (
            <p className="courier-profile__muted">Ladataan…</p>
          ) : reviews.length ? (
            <ul>
              {reviews.map((review) => (
                <li key={review.created_at} className="courier-profile__review">
                  <span className="courier-profile__review-head">
                    <ReviewScore stars={review.stars} />
                    <time dateTime={review.created_at}>
                      {new Date(review.created_at).toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' })}
                    </time>
                  </span>
                  <p>{review.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="courier-profile__muted">
              {failed
                ? 'Arvioita ei saatu ladattua.'
                : hasRating
                  ? 'Asiakkaat ovat antaneet vain arvosanoja, ei kirjoitettuja arvioita.'
                  : 'Ei vielä arvioita. Asiakkaat arvioivat kuljettajan toimituksen jälkeen.'}
            </p>
          )}
        </section>
      </div>
    </BottomSheet>
  )
}

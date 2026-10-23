import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  finishedAtLabel,
  findOrderToReview,
  markRestaurantOrdersReviewed,
  markReviewPromptHandled,
  submitReview,
} from '../lib/reviews.js'
import { supabase } from '../lib/supabaseClient.js'
import ReviewForm from './ReviewForm.jsx'
import './ReviewPrompt.css'

const THANKS_VISIBLE_MS = 2200
const LEAVE_ANIMATION_MS = 300
// Näin paljon alas vedetty paneeli sulkeutuu (vetokahvasta).
const DRAG_CLOSE_PX = 90

// Arviointipyyntö: kun asiakkaan tilaus merkitään toimitetuksi tai noudetuksi,
// näytön alareunasta liukuu paneeli "Miten tilaus onnistui?" (käyttäjä:
// alhaalta liukuva), jossa tähdet ja tekstilaatikko ovat samassa näkymässä.
// Paneelin voi vetää kahvasta alas tai sulkea taustasta. Pyyntö tulee
// jokaisesta tilauksesta - jos ravintola on jo arvosteltu, uusi arvio
// päivittää vanhan. Suljettua tilausta ei kysytä uudelleen. Tilan muutos tulee
// realtimella, joten paneeli näkyy heti kun ravintola tai kuljettaja kuittaa
// tilauksen.
function ReviewPrompt() {
  const { session } = useAuth()
  const location = useLocation()
  const customerId = session?.user?.id ?? null
  const [order, setOrder] = useState(null)
  const [stage, setStage] = useState('ask') // 'ask' | 'thanks'
  const [leaving, setLeaving] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef(null)

  useEffect(() => {
    if (!customerId || !supabase) return undefined
    let cancelled = false
    function check() {
      findOrderToReview(customerId).then((found) => {
        // Avoinna olevaa pyyntöä ei vaihdeta kesken kirjoituksen.
        if (!cancelled && found) setOrder((current) => current ?? found)
      })
    }
    check()
    const channel = supabase
      .channel(`review-prompt-${customerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `customer_id=eq.${customerId}` },
        check,
      )
      .subscribe()
    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [customerId])

  // Kiitos näkyy hetken, sitten kortti liukuu pois.
  useEffect(() => {
    if (stage !== 'thanks') return undefined
    const timer = setTimeout(() => setLeaving(true), THANKS_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [stage])

  // Poistumisanimaation jälkeen kortti pois näkyvistä.
  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(() => {
      setOrder(null)
      setStage('ask')
      setLeaving(false)
      setDragY(0)
    }, LEAVE_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  const hiddenHere =
    location.pathname.startsWith('/kumppani') ||
    location.pathname.startsWith('/__preview') ||
    location.pathname === '/login' ||
    location.pathname === '/register'

  // Esc sulkee kyselyn kuten muutkin modaalit (työpöydällä keskellä näyttöä).
  const openOrderId = customerId && order && !hiddenHere ? order.id : null
  useEffect(() => {
    if (!openOrderId || leaving) return undefined
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      markReviewPromptHandled(openOrderId)
      setLeaving(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openOrderId, leaving])

  if (!customerId || !order || hiddenHere) return null

  function dismiss() {
    markReviewPromptHandled(order.id)
    setLeaving(true)
  }

  // Vetokahva: paneeli seuraa sormea alaspäin, ja riittävä veto sulkee sen.
  function startDrag(e) {
    dragStart.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function moveDrag(e) {
    if (dragStart.current == null) return
    setDragY(Math.max(0, e.clientY - dragStart.current))
  }

  function endDrag() {
    if (dragStart.current == null) return
    dragStart.current = null
    if (dragY > DRAG_CLOSE_PX) dismiss()
    else setDragY(0)
  }

  async function handleSubmit(stars, comment) {
    await submitReview(order.restaurant_id, stars, comment)
    markReviewPromptHandled(order.id)
    markRestaurantOrdersReviewed(customerId, order.restaurant_id)
    setStage('thanks')
  }

  const delivered = order.delivery_method === 'delivery' || order.courier_status === 'delivered'
  const restaurantName = order.restaurants?.name ?? 'Ravintola'
  const className = ['review-prompt', stage === 'thanks' && 'review-prompt--thanks', leaving && 'is-leaving']
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={`review-prompt__backdrop${leaving ? ' is-leaving' : ''}`} onClick={dismiss} aria-hidden="true" />
      <aside
        className={className}
        aria-label="Arvioi tilaus"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          className="review-prompt__handle"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          aria-hidden="true"
        >
          <span />
        </div>
        <button type="button" className="review-prompt__close" aria-label="Sulje" onClick={dismiss}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        {stage === 'thanks' ? (
          <div className="review-prompt__thanks" role="status">
            <svg className="review-prompt__check" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="21" />
              <path d="M14.5 24.5l6.5 6.5 13-13" />
            </svg>
            <span>
              <strong>Kiitos arvostelustasi!</strong>
              <span>Se auttaa muita valitsemaan.</span>
            </span>
          </div>
        ) : (
          <>
            <p className="review-prompt__kicker">
              {restaurantName} · {delivered ? 'toimitettu' : 'noudettu'} {finishedAtLabel(order.delivered_at ?? order.updated_at)}
            </p>
            <h2 className="review-prompt__title">Miten tilaus onnistui?</h2>
            {order.hasReview && <p className="review-prompt__hint">Uusi arvio päivittää aiemman arvostelusi.</p>}
            <ReviewForm cancelLabel="Ei nyt" onCancel={dismiss} onSubmit={handleSubmit} />
          </>
        )}
      </aside>
    </>
  )
}

export default ReviewPrompt

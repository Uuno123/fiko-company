import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import './BottomSheet.css'

const LEAVE_MS = 280
// Näin pitkä veto alas (tai nopea pyyhkäisy) sulkee paneelin.
const CLOSE_DRAG_PX = 120
const CLOSE_VELOCITY = 0.5 // px/ms
// Liike, jonka jälkeen tiedetään, vetääkö käyttäjä paneelia vai vierittääkö sisältöä.
const DRAG_SLOP_PX = 6

// Alhaalta liukuva paneeli (käyttäjän pyyntö 23.10.2026, kirjautuminen):
// puhelimella lähes koko näytön korkuinen - ylhäällä näkyy himmennettynä sivu,
// jonka päällä paneeli on. Paneelin saa kiinni pyyhkäisemällä alas (kahvasta
// tai mistä tahansa, kun sisältö on vieritetty ylös), taustaa napauttamalla,
// ✕:llä tai Escillä. Työpöydällä keskitetty ikkuna. footer: aina näkyvä
// alapalkki (esim. hinta ja hyväksyntä), joka ei vierity sisällön mukana.
// compact: puhelimella sisällön korkuinen (lyhyet lomakkeet, esim. nimen muokkaus).
// children voi olla funktio, joka saa close-funktion: tallennuksen jälkeen
// paneeli sulkeutuu animaation kautta.
function BottomSheet({ onClose, labelledBy, footer, compact = false, children }) {
  const [leaving, setLeaving] = useState(false)
  const sheetRef = useRef(null)
  const bodyRef = useRef(null)
  const contentRef = useRef(null)
  const handleRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const close = useCallback(() => setLeaving(true), [])

  // Sulkeutumisanimaatio ensin, sitten varsinainen sulkeminen.
  useEffect(() => {
    if (!leaving) return undefined
    const timer = setTimeout(() => onCloseRef.current(), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') close()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [close])

  // Korkeuden muutos animoidaan (käyttäjän pyyntö 27.10.2026): kun sisältö
  // muuttuu (esim. lomakkeeseen tulee kenttiä tai virheviesti), ikkuna kasvaa
  // tai kutistuu pehmeästi eikä hyppää. CSS ei osaa siirtymää height: auto
  // -arvoon, joten korkeus pidetään pikseleinä: luonnollinen korkeus mitataan
  // hetkeksi auto-arvolla (max-height huomioiden) ja asetetaan uudeksi
  // kohteeksi, jolloin CSS-siirtymä hoitaa liikkeen. Koskee työpöydän ikkunaa ja
  // compact-paneelia; puhelimen täyskorkea paneeli on aina saman korkuinen.
  useEffect(() => {
    const sheet = sheetRef.current
    const content = contentRef.current
    if (!sheet || !content || typeof ResizeObserver === 'undefined') return undefined
    const desktop = window.matchMedia('(min-width: 640px)')
    let measured = false

    function fit() {
      if (!desktop.matches && !compact) {
        sheet.style.height = ''
        measured = false
        return
      }
      const current = sheet.style.height
      sheet.style.height = 'auto'
      const target = sheet.offsetHeight
      sheet.style.height = current
      if (!measured || !current) {
        // Ensimmäinen mitta ilman siirtymää - avautumisella on oma animaationsa.
        sheet.style.transition = 'none'
        sheet.style.height = `${target}px`
        void sheet.offsetHeight
        sheet.style.transition = ''
        measured = true
        return
      }
      if (current === `${target}px`) return
      void sheet.offsetHeight
      sheet.style.height = `${target}px`
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(content)
    window.addEventListener('resize', fit)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [compact])

  // Pyyhkäisy alas. Paneeli seuraa sormea suoraan tyylin kautta (ei uudelleen-
  // piirtoa joka liikkeellä). Kosketus: mistä kohtaa tahansa, kun sisältö on
  // ylimmillään - muuten sormi vierittää sisältöä. Hiiri: vetokahvasta.
  useEffect(() => {
    const sheet = sheetRef.current
    const body = bodyRef.current
    const handle = handleRef.current
    // Työpöydän keskitettyä ikkunaa ei vedetä (sama raja kuin CSS:ssä).
    const phone = window.matchMedia('(max-width: 639px)')
    let start = null
    let dragging = false
    let offset = 0

    function begin(y, time, fromHandle) {
      if (!phone.matches) return
      start = { y, time, fromHandle }
      dragging = false
      offset = 0
    }

    function move(y, event) {
      if (!start) return
      const dy = y - start.y
      if (!dragging) {
        if (dy > DRAG_SLOP_PX && (start.fromHandle || body.scrollTop <= 0)) {
          dragging = true
        } else if (Math.abs(dy) > DRAG_SLOP_PX) {
          start = null
          return
        } else {
          return
        }
      }
      if (event.cancelable) event.preventDefault()
      offset = Math.max(0, dy)
      sheet.style.transition = 'none'
      sheet.style.transform = `translateY(${offset}px)`
    }

    function end(time) {
      if (!start) return
      const wasDragging = dragging
      const velocity = offset / Math.max(1, time - start.time)
      start = null
      dragging = false
      if (!wasDragging) return
      sheet.style.transition = ''
      if (offset > Math.min(CLOSE_DRAG_PX, sheet.offsetHeight / 3) || velocity > CLOSE_VELOCITY) close()
      else sheet.style.transform = ''
    }

    const onTouchStart = (e) => {
      if (e.touches.length === 1) begin(e.touches[0].clientY, e.timeStamp, handle.contains(e.target))
    }
    const onTouchMove = (e) => move(e.touches[0].clientY, e)
    const onTouchEnd = (e) => end(e.timeStamp)
    const onMouseMove = (e) => move(e.clientY, e)
    const onMouseUp = (e) => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      end(e.timeStamp)
    }
    const onMouseDown = (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      begin(e.clientY, e.timeStamp, true)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    sheet.addEventListener('touchstart', onTouchStart, { passive: true })
    sheet.addEventListener('touchmove', onTouchMove, { passive: false })
    sheet.addEventListener('touchend', onTouchEnd)
    sheet.addEventListener('touchcancel', onTouchEnd)
    handle.addEventListener('mousedown', onMouseDown)
    return () => {
      sheet.removeEventListener('touchstart', onTouchStart)
      sheet.removeEventListener('touchmove', onTouchMove)
      sheet.removeEventListener('touchend', onTouchEnd)
      sheet.removeEventListener('touchcancel', onTouchEnd)
      handle.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [close])

  return (
    <>
      <div className={`bottom-sheet__backdrop${leaving ? ' is-leaving' : ''}`} onClick={close} aria-hidden="true" />
      <div
        ref={sheetRef}
        className={`bottom-sheet${compact ? ' bottom-sheet--compact' : ''}${leaving ? ' is-leaving' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <div ref={handleRef} className="bottom-sheet__handle" aria-hidden="true">
          <span />
        </div>
        <button type="button" className="bottom-sheet__close" aria-label="Sulje" onClick={close}>
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <div ref={bodyRef} className="bottom-sheet__body">
          <div ref={contentRef} className="bottom-sheet__content">
            {typeof children === 'function' ? children(close) : children}
          </div>
        </div>
        {footer ? <div className="bottom-sheet__footer">{footer}</div> : null}
      </div>
    </>
  )
}

export default BottomSheet

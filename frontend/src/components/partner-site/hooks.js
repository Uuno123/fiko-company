import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Kumppanisivujen yhteiset koukut: kieli (FI/EN), #-ankkurit ja kevyt
// esiintulo vieritettäessä.

const LANG_KEY = 'bidrop-partner-lang'

function initialLang() {
  const param = new URLSearchParams(window.location.search).get('lang')
  if (param === 'fi' || param === 'en') return param
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'fi' || saved === 'en') return saved
  } catch {
    // Selaimen tallennus estetty: oletuskieli.
  }
  return 'fi'
}

// Valittu kieli säilyy kumppanisivujen välillä (localStorage). ?lang=en
// linkissä avaa sivun suoraan englanniksi.
export function usePartnerLang() {
  const [lang, setLangState] = useState(initialLang)
  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      // Ei tallennusta: valinta pätee tällä sivulla.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    return () => {
      document.documentElement.lang = 'fi'
    }
  }, [lang])

  return [lang, setLang]
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// #-linkit (esim. /kumppanina#hinnat) vierittävät osioon. Viive: App vierittää
// ensin sivun alkuun sivun vaihtuessa.
export function useHashScroll() {
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return undefined
    const timer = setTimeout(() => {
      document
        .getElementById(decodeURIComponent(location.hash.slice(1)))
        ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    }, 60)
    return () => clearTimeout(timer)
  }, [location.pathname, location.hash])
}

// [data-reveal]-elementit nousevat esiin, kun ne vieritetään näkyviin
// (PartnerSite.css: .is-visible). Ilman IntersectionObserveria tai liikettä
// vähentäessä kaikki näkyy heti.
export function useReveal(deps = []) {
  const ref = useRef(null)
  // Ennen piirtoa, ettei sisältö välähdä näkyvissä ennen piilotusta. Piilotus
  // (.ps-reveal-on) vasta kun tarkkailija on käytössä, joten ilman JavaScriptiä
  // kaikki näkyy.
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const elements = [...root.querySelectorAll('[data-reveal]:not(.is-visible)')]
    if (typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) {
      elements.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }
    root.classList.add('ps-reveal-on')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // Kielen vaihtuessa sisältö renderöidään uudelleen samoihin elementteihin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

import { useEffect, useState } from 'react'

// Sama raja kuin SettingsLayout.css:n asettelunvaihdossa (860 px).
const QUERY = '(max-width: 860px)'

// Asetussivut piirtävät mobiilissa eri rakenteen (oma topbar + listanäkymä)
// kuin työpöydällä, joten valinta tehdään JS:ssä eikä CSS:n display:none:lla -
// muuten sama lomake olisi DOM:ssa kahdesti ja input-id:t menisivät päällekkäin.
// Muu raja annetaan parametrina (esim. kirjautumispaneeli puhelimella, 639 px).
export function useIsMobile(query = QUERY) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    function update(event) {
      setIsMobile(event.matches)
    }
    setIsMobile(mql.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return isMobile
}

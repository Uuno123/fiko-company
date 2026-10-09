import { useEffect, useState } from 'react'

// Sama raja kuin SettingsLayout.css:n asettelunvaihdossa (860 px).
const QUERY = '(max-width: 860px)'

// Asetussivut piirtävät mobiilissa eri rakenteen (oma topbar + listanäkymä)
// kuin työpöydällä, joten valinta tehdään JS:ssä eikä CSS:n display:none:lla -
// muuten sama lomake olisi DOM:ssa kahdesti ja input-id:t menisivät päällekkäin.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    function update(event) {
      setIsMobile(event.matches)
    }
    setIsMobile(mql.matches)
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return isMobile
}

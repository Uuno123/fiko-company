import { useEffect } from 'react'

// Lomakkeiden apurit tallennuspalkille (ui.jsx SaveBar).

// Varoittaa, jos sivun sulkee tai lataa uudelleen tallentamattomin muutoksin.
export function useUnsavedWarning(dirty) {
  useEffect(() => {
    if (!dirty) return undefined
    function warn(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
}

// Onko lomake muuttunut tallennetusta (vertailu sisällön, ei olion mukaan).
export function isChanged(current, saved) {
  return JSON.stringify(current) !== JSON.stringify(saved)
}

import { createContext, useContext } from 'react'

// Kojelaudan yhteinen tila: aktiivinen ravintola, sen päivitys, tilaukset (yksi
// reaaliaikainen tilaus koko kojelaudalle) ja laiteasetukset.
export const DashboardContext = createContext(null)

export function useDashboard() {
  return useContext(DashboardContext)
}

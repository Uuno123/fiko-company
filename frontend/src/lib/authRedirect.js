// Paluuosoite kirjautumisen jälkeen, kun kirjautuminen kulkee sivun ulkopuolelta:
// sähköpostin vahvistuslinkki ja Google-kirjautuminen palaavat /register-sivulle,
// joka ohjaa tänne talletettuun osoitteeseen. Linkki avautuu usein uuteen
// välilehteen, joten osoite talletetaan selaimeen eikä sivun tilaan.
const REDIRECT_KEY = 'delivo-register-redirect'

export function rememberAuthRedirect(path) {
  try {
    localStorage.setItem(REDIRECT_KEY, path || '/')
  } catch {
    // Ei tallennustilaa - kirjautumisen jälkeen palataan etusivulle.
  }
}

export function readAuthRedirect() {
  try {
    return localStorage.getItem(REDIRECT_KEY) || '/'
  } catch {
    return '/'
  }
}

export function forgetAuthRedirect() {
  try {
    localStorage.removeItem(REDIRECT_KEY)
  } catch {
    // Ei tallennustilaa - ei mitään poistettavaa.
  }
}

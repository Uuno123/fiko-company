// Evästesuostumus. Tallennetaan selaimeen, koska päätös koskee laitetta eikä
// käyttäjätiliä - banneri näytetään ennen kirjautumista.
//
// Sivustolla ei tällä hetkellä ole yhtään analytiikka- tai markkinointiskriptiä.
// Kun sellainen lisätään, se ladataan VAIN jos getCookieConsent()?.analytics
// (tai .marketing) on true - ja kuunnellaan CONSENT_CHANGED_EVENT, jotta
// myöhemmin annettu suostumus otetaan käyttöön ilman sivun latausta.
const STORAGE_KEY = 'delivo-cookie-consent'

// Nosta versiota, jos evästekategoriat muuttuvat: vanha päätös ei silloin enää
// kata uusia käyttötarkoituksia ja banneri kysyy uudelleen.
const CONSENT_VERSION = 1

export const OPEN_COOKIE_SETTINGS_EVENT = 'delivo:open-cookie-settings'
export const CONSENT_CHANGED_EVENT = 'delivo:cookie-consent-changed'

export function getCookieConsent() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored?.version === CONSENT_VERSION ? stored : null
  } catch {
    return null
  }
}

export function saveCookieConsent({ analytics, marketing }) {
  const consent = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    decidedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  } catch {
    // Yksityinen selaustila tms. - päätös pätee silloin vain tämän käynnin ajan.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: consent }))
  return consent
}

// Suostumuksen pitää olla perutavissa yhtä helposti kuin se annettiin, joten
// footerin "Evästeasetukset" avaa bannerin uudelleen asetusnäkymään.
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
}

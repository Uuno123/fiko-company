const KNOWN_ERRORS = [
  { match: /already registered|user already exists/i, message: 'Tämä sähköposti on jo käytössä. Kirjaudu sisään tai käytä toista sähköpostia.' },
  { match: /password should be at least|password.*too short/i, message: 'Salasana on liian lyhyt. Käytä vähintään 6 merkkiä.' },
  { match: /invalid login credentials/i, message: 'Väärä sähköposti tai salasana.' },
  { match: /email not confirmed/i, message: 'Vahvista ensin sähköpostiosoitteesi - tarkista saapunut-kansio.' },
  { match: /invalid email/i, message: 'Sähköpostiosoite ei kelpaa.' },
  { match: /rate limit|too many requests/i, message: 'Liikaa yrityksiä lyhyessä ajassa. Yritä hetken kuluttua uudelleen.' },
]

export function translateAuthError(error) {
  if (!error) return ''
  const found = KNOWN_ERRORS.find(({ match }) => match.test(error.message))
  return found ? found.message : 'Jokin meni pieleen. Yritä hetken kuluttua uudelleen.'
}

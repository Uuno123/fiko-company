import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './RankingInfo.css'

// "Miten järjestys määräytyy?" -linkki hakutulosten alle. Maksettu näkyvyys ja
// järjestyksen pääperusteet pitää kertoa asiakkaalle selvästi (EU:n
// alustasäännöt ja kuluttajansuoja): hakutuloksista tiedon on oltava helposti
// saatavilla. Etusivulta ja kategoriasivulta linkki poistettiin 28.10.2026
// (käyttäjän päätös) - niillä ei ole hakua. Sisältö vastaa lib/ranking.js:n sääntöjä -
// jos painot muuttuvat siellä, päivitä myös tämä.
function RankingInfo() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <>
      <button type="button" className="ranking-info__link" onClick={() => setOpen(true)}>
        Miten järjestys määräytyy?
      </button>

      {open &&
        createPortal(
          <div
            className="ranking-info-backdrop"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false)
            }}
          >
            <div className="ranking-info" role="dialog" aria-modal="true" aria-labelledby="ranking-info-title">
              <h2 id="ranking-info-title">Miten järjestys määräytyy</h2>

              <h3>Sponsoroidut ravintolat</h3>
              <p>
                "Sponsoroitu"-merkityt ravintolat ovat maksaneet näkyvyydestä. Niitä on listassa enintään kaksi
                (paikat 1 ja 4), ja ne näytetään vain, jos ravintola on auki ja toimittaa osoitteeseesi. Jos
                sponsoreita on enemmän, ne vuorottelevat päivittäin.
              </p>

              <h3>Muut ravintolat</h3>
              <p>Auki olevat ravintolat järjestetään pisteiden mukaan. Pisteisiin vaikuttavat:</p>
              <ul>
                <li>
                  <strong>Etäisyys</strong> osoitteestasi (35 %)
                </li>
                <li>
                  <strong>Arvosana</strong> asiakkailta (25 %) - uusi ravintola saa neutraalin arvion, kunnes
                  arvosteluja on tarpeeksi
                </li>
                <li>
                  <strong>Suosio</strong> viimeisen 30 päivän tilauksissa (15 %)
                </li>
                <li>
                  <strong>Uutuus</strong>: uusi ravintola saa nostetta kahden ensimmäisen kuukauden ajan (15 %)
                </li>
                <li>
                  <strong>Päivittäinen kierto</strong> (10 %), jotta myös pienemmät ravintolat pääsevät esiin
                </li>
              </ul>
              <p>Kiinni olevat ravintolat näytetään viimeisenä, aikaisimmin aukeava ensin.</p>

              <h3>Oma järjestys</h3>
              <p>
                Kun valitset järjestyksen itse (esim. "Lähin"), lista järjestetään valintasi mukaan. Ylimpänä voi
                silloin olla yksi sponsoroitu ravintola.
              </p>

              <button type="button" className="ranking-info__close" onClick={() => setOpen(false)}>
                Sulje
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default RankingInfo

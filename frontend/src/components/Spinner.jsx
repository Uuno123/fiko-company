import './Spinner.css'

// Latausindikaattori. role="status" + aria-live kertoo ruudunlukijalle että
// jotain on kesken; teksti on piilossa mutta luetaan ääneen, ja se tulee
// näkyviin jos käyttäjä on estänyt animaatiot (ks. Spinner.css).
function Spinner({ label = 'Ladataan…' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span className="loading-state__label">{label}</span>
    </div>
  )
}

export default Spinner

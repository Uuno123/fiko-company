import { useState } from 'react'

// Facebook-kirjautuminen ei ole vielä käytössä (vain Google toimii, ks.
// GoogleAuthButton). Nappi näkyy, mutta painallus kertoo että se on tulossa.
function FacebookAuthButton({ label = 'Jatka Facebookilla' }) {
  const [notice, setNotice] = useState(false)
  return (
    <>
      <button type="button" className="oauth-btn oauth-btn--facebook" onClick={() => setNotice(true)}>
        <svg className="oauth-btn__icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="10" fill="currentColor" />
          <path
            d="M11.9 16v-5.1h1.72l.26-1.99h-1.98V7.61c0-.58.16-.97 1-.97h1.06V4.86c-.18-.02-.82-.08-1.55-.08-1.53 0-2.58.93-2.58 2.65v1.48H8.1v1.99h1.73V16h2.07Z"
            fill="#1877f2"
          />
        </svg>
        {label}
      </button>
      {notice && (
        <p className="oauth-note" role="status">
          Facebook-kirjautuminen on tulossa pian. Käytä toistaiseksi Googlea tai sähköpostia.
        </p>
      )}
    </>
  )
}

export default FacebookAuthButton

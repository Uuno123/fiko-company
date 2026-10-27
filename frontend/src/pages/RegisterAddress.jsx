import { Navigate, useNavigate } from 'react-router-dom'
import DeliveryAddressForm from '../components/DeliveryAddressForm.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { forgetAuthRedirect, readAuthRedirect } from '../lib/authRedirect.js'
import './AuthForm.css'
import './RegisterAddress.css'

// Rekisteröitymisen viimeinen vaihe omana sivunaan, kuten Woltissa (käyttäjän
// pyyntö 27.10.2026): asunnon tyyppi, tarkka osoite, lisätiedot ja ohjeet
// kuljettajalle (DeliveryAddressForm, sama lomake kuin asetuksissa).
// Tallennuksen jälkeen takaisin sivulle, jolta rekisteröityminen alkoi.

// Lomake näytetään vasta kun asiakasrivi on ladattu, jotta aiemmat tiedot
// saadaan suoraan alkuarvoiksi.
function RegisterAddress() {
  const { session, customer, status: authStatus } = useAuth()
  if (authStatus === 'loading') return null
  if (!session) return <Navigate to="/register" replace />
  if (!customer) return null
  return <AddressStepForm customer={customer} userId={session.user.id} />
}

// preview: { onNext } vain esikatselusivulta (pages/__PreviewRegister.jsx).
export function AddressStepForm({ customer, userId, preview }) {
  const navigate = useNavigate()

  function done() {
    const target = readAuthRedirect()
    forgetAuthRedirect()
    navigate(target, { replace: true })
  }

  return (
    <div className="page">
      <main className="auth-page auth-page--full-height register-address">
        <div className="auth-card">
          <h1 id="auth-title">Minne tilaukset tuodaan?</h1>
          <DeliveryAddressForm
            customer={customer}
            userId={userId}
            submitLabel="Tallenna ja jatka"
            onDone={done}
            preview={preview}
          />
        </div>
      </main>
    </div>
  )
}

export default RegisterAddress

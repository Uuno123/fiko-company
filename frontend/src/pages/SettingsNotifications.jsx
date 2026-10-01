import { useState } from 'react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import './Settings.css'

function SettingsNotifications() {
  const { customer, refreshCustomer } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleToggleMarketing() {
    if (saving || !customer) return
    setError('')
    setSaving(true)

    const next = !customer.marketing_opt_in
    const { error: updateError } = await supabase
      .from('customers')
      .update({ marketing_opt_in: next })
      .eq('id', customer.id)

    if (updateError) {
      setError('Tallennus epäonnistui. Yritä hetken kuluttua uudelleen.')
      setSaving(false)
      return
    }

    await refreshCustomer()
    setSaving(false)
  }

  const marketingOptIn = Boolean(customer?.marketing_opt_in)

  return (
    <SettingsLayout title="Ilmoitukset" description="Valitse, mistä haluat kuulla sähköpostilla.">
      <section className="auth-card">
        <h2>Sähköposti-ilmoitukset</h2>
        {error && <p className="auth-error">{error}</p>}

        <div className="toggle-row">
          <div className="toggle-row__text">
            <p className="toggle-row__title">Tilausvahvistukset ja -päivitykset</p>
            <p className="toggle-row__hint">
              Kuittaus tilauksesta ja ilmoitus kun se on valmis - lähetetään aina, jotta pysyt kartalla.
            </p>
          </div>
          <span className="toggle-row__fixed">Aina päällä</span>
        </div>

        <div className="toggle-row">
          <div className="toggle-row__text">
            <p className="toggle-row__title">Tarjoukset ja uutiset</p>
            <p className="toggle-row__hint">Satunnaisia etuja ja uutuuksia delivon ravintoloilta.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={marketingOptIn}
            aria-label="Tarjoukset ja uutiset sähköpostitse"
            className={`toggle-switch${marketingOptIn ? ' toggle-switch--on' : ''}`}
            onClick={handleToggleMarketing}
            disabled={saving}
          >
            <span className="toggle-switch__thumb" />
          </button>
        </div>
      </section>
    </SettingsLayout>
  )
}

export default SettingsNotifications

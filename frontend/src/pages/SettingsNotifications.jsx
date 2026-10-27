import { useState } from 'react'
import { Megaphone, Receipt } from 'lucide-react'
import SettingsLayout from '../components/SettingsLayout.jsx'
import { SettingsRow } from '../components/SettingsRow.jsx'
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
      {error && <p className="auth-error">{error}</p>}

      <section className="settings-section">
        <div className="settings-section__head">
          <h2>Sähköposti-ilmoitukset</h2>
        </div>
        <div className="settings-panel">
          <SettingsRow
            icon={Receipt}
            label="Tilausvahvistukset ja -päivitykset"
            hint="Kuittaus tilauksesta ja ilmoitus kun se on valmis - lähetetään aina, jotta pysyt kartalla."
            trailing={<span className="toggle-row__fixed">Aina päällä</span>}
          />
          <SettingsRow
            icon={Megaphone}
            label="Tarjoukset ja uutiset"
            hint="Satunnaisia etuja ja uutuuksia Bidropin ravintoloilta."
            trailing={
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
            }
          />
        </div>
      </section>
    </SettingsLayout>
  )
}

export default SettingsNotifications

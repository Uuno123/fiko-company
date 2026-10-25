import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { courierCopy, restaurantCopy, sharedCopy } from './copy.js'

// Kumppanisivun lyhyet hakemukset (käyttäjän päätös 24.10.2026).
// Ravintola: restaurant_leads (migraatio 0065). Kuljettaja: driver_applications
// (0027 + 0065:n laskutustapa ja kieli).

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function Field({ id, label, hint, children }) {
  return (
    <div className="ps-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <p className="ps-field__hint">{hint}</p> : null}
    </div>
  )
}

function Success({ title, body }) {
  return (
    <div className="ps-form__success" role="status">
      <CircleCheck size={36} strokeWidth={2} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  )
}

function useForm(initial) {
  const [values, setValues] = useState(initial)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const bind = (name) => ({
    id: `apply-${name}`,
    name,
    value: values[name],
    onChange: (e) => {
      setValues((current) => ({ ...current, [name]: e.target.value }))
      setError('')
    },
  })
  return { values, status, setStatus, error, setError, bind }
}

function validate(values, t) {
  if (Object.values(values).some((value) => !String(value).trim())) return t.required
  if (!EMAIL_PATTERN.test(values.email.trim())) return t.invalidEmail
  return ''
}

export function RestaurantApplyForm({ lang }) {
  const t = restaurantCopy(lang).apply
  const s = sharedCopy(lang).form
  const form = useForm({ name: '', restaurant: '', phone: '', email: '', orders: '' })

  async function submit(e) {
    e.preventDefault()
    const problem = validate(form.values, s)
    if (problem) {
      form.setError(problem)
      return
    }
    form.setStatus('sending')
    const { values } = form
    const { error } = supabase
      ? await supabase.from('restaurant_leads').insert({
          contact_name: values.name.trim(),
          restaurant_name: values.restaurant.trim(),
          phone: values.phone.trim(),
          email: values.email.trim(),
          monthly_orders: values.orders,
          language: lang,
        })
      : { error: new Error('Supabase not configured') }
    if (error) {
      form.setStatus('idle')
      form.setError(s.error)
      return
    }
    form.setStatus('sent')
  }

  if (form.status === 'sent') return <Success title={t.successTitle} body={t.successBody} />

  return (
    <form className="ps-form" onSubmit={submit} noValidate>
      <div className="ps-form__row">
        <Field id="apply-name" label={t.fields.name}>
          <input {...form.bind('name')} autoComplete="name" />
        </Field>
        <Field id="apply-restaurant" label={t.fields.restaurant}>
          <input {...form.bind('restaurant')} autoComplete="organization" />
        </Field>
      </div>
      <div className="ps-form__row">
        <Field id="apply-phone" label={t.fields.phone}>
          <input {...form.bind('phone')} type="tel" autoComplete="tel" />
        </Field>
        <Field id="apply-email" label={t.fields.email}>
          <input {...form.bind('email')} type="email" autoComplete="email" />
        </Field>
      </div>
      <Field id="apply-orders" label={t.fields.orders} hint={t.ordersHint}>
        <select {...form.bind('orders')}>
          <option value="" disabled>
            {t.ordersPlaceholder}
          </option>
          {t.orderOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {form.error ? (
        <p className="ps-form__error" role="alert">
          {form.error}
        </p>
      ) : null}
      <button type="submit" className="ps-btn ps-btn--orange ps-btn--block" disabled={form.status === 'sending'}>
        {form.status === 'sending' ? s.sending : t.submit}
      </button>
      <p className="ps-form__privacy">{s.privacy}</p>
    </form>
  )
}

export function CourierApplyForm({ lang }) {
  const t = courierCopy(lang).apply
  const s = sharedCopy(lang).form
  const form = useForm({ name: '', phone: '', email: '', vehicle: '', billing: '' })

  async function submit(e) {
    e.preventDefault()
    const problem = validate(form.values, s)
    if (problem) {
      form.setError(problem)
      return
    }
    form.setStatus('sending')
    const { values } = form
    const base = {
      full_name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      city: 'Kuopio',
      vehicle_type: values.vehicle,
    }
    let error = supabase ? null : new Error('Supabase not configured')
    if (supabase) {
      ;({ error } = await supabase
        .from('driver_applications')
        .insert({ ...base, billing_method: values.billing, language: lang }))
      // Migraatio 0065 ajamatta: laskutustapa viestiin.
      if (error?.code === '42703' || error?.code === 'PGRST204') {
        ;({ error } = await supabase
          .from('driver_applications')
          .insert({ ...base, message: `Laskutustapa: ${values.billing}, kieli: ${lang}` }))
      }
    }
    if (error) {
      form.setStatus('idle')
      form.setError(s.error)
      return
    }
    form.setStatus('sent')
  }

  if (form.status === 'sent') return <Success title={t.successTitle} body={t.successBody} />

  return (
    <form className="ps-form" onSubmit={submit} noValidate>
      <Field id="apply-name" label={t.fields.name}>
        <input {...form.bind('name')} autoComplete="name" />
      </Field>
      <div className="ps-form__row">
        <Field id="apply-phone" label={t.fields.phone}>
          <input {...form.bind('phone')} type="tel" autoComplete="tel" />
        </Field>
        <Field id="apply-email" label={t.fields.email}>
          <input {...form.bind('email')} type="email" autoComplete="email" />
        </Field>
      </div>
      <div className="ps-form__row">
        <Field id="apply-vehicle" label={t.fields.vehicle}>
          <select {...form.bind('vehicle')}>
            <option value="" disabled>
              {t.placeholder}
            </option>
            {t.vehicles.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="apply-billing" label={t.fields.billing}>
          <select {...form.bind('billing')}>
            <option value="" disabled>
              {t.placeholder}
            </option>
            {t.billing.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {form.error ? (
        <p className="ps-form__error" role="alert">
          {form.error}
        </p>
      ) : null}
      <button type="submit" className="ps-btn ps-btn--orange ps-btn--block" disabled={form.status === 'sending'}>
        {form.status === 'sending' ? s.sending : t.submit}
      </button>
      <p className="ps-form__privacy">{s.privacy}</p>
    </form>
  )
}

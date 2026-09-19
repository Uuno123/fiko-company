import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

export const isStripeConfigured = Boolean(publishableKey)

if (!isStripeConfigured) {
  console.warn(
    '[delivo-frontend] VITE_STRIPE_PUBLISHABLE_KEY puuttuu .env-tiedostosta.\n' +
      '  -> Maksaminen ei toimi ennen kuin tämä on asetettu.',
  )
}

export const stripePromise = isStripeConfigured ? loadStripe(publishableKey) : null

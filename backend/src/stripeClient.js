import 'dotenv/config'
import Stripe from 'stripe'

// Yksi Stripe-asiakas maksun aloitukselle (routes/payments.js) ja veloituksille
// (settlement.js). Ilman avainta maksut eivät ole käytössä.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

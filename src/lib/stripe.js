import Stripe from 'stripe'

// Initialize Stripe only if secret key is available
// This allows the app to build without the key being set
export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2024-12-18.acacia',
      })
    : null

// Helper to ensure stripe is initialized before use
export function getStripe() {
    if (!stripe) {
        throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    return stripe
}

// Price IDs from environment
export const STRIPE_PRICES = {
    MONTHLY: process.env.STRIPE_MONTHLY_PRICE_ID,
    ANNUAL: process.env.STRIPE_ANNUAL_PRICE_ID,
}

// Subscription plans
export const PLANS = {
    EXPLORER: 'explorer',
    TRAILBLAZER: 'trailblazer',
}

// Subscription statuses
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    TRIALING: 'trialing',
    CANCELED: 'canceled',
    PAST_DUE: 'past_due',
}

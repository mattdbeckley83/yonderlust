'use server'

import { auth } from '@clerk/nextjs/server'
import { getStripe, STRIPE_PRICES } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function createCheckoutSession(priceType = 'monthly') {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Not authenticated' }
    }

    // Get the price ID based on type
    const priceId = priceType === 'annual' ? STRIPE_PRICES.ANNUAL : STRIPE_PRICES.MONTHLY

    if (!priceId) {
        return { error: 'Price ID not configured' }
    }

    try {
        // Get user from database
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, stripe_customer_id')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            return { error: 'User not found' }
        }

        let customerId = user.stripe_customer_id

        const stripe = getStripe()

        // Create Stripe customer if doesn't exist
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    userId: user.id,
                },
            })

            customerId = customer.id

            // Save customer ID to database
            await supabaseAdmin
                .from('users')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId)
        }

        // Get the base URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Create checkout session with 7-day free trial
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 7,
                metadata: {
                    userId: user.id,
                },
            },
            success_url: `${baseUrl}/profile?subscription=success`,
            cancel_url: `${baseUrl}/profile?subscription=canceled`,
            metadata: {
                userId: user.id,
            },
        })

        return { url: session.url }
    } catch (error) {
        console.error('Error creating checkout session:', error)
        return { error: 'Failed to create checkout session' }
    }
}

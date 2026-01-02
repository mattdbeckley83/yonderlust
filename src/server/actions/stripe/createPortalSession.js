'use server'

import { auth } from '@clerk/nextjs/server'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function createPortalSession() {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get user's stripe_customer_id from database
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single()

        if (userError || !user) {
            return { error: 'User not found' }
        }

        if (!user.stripe_customer_id) {
            return { error: 'No subscription found' }
        }

        const stripe = getStripe()

        // Get the base URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Create billing portal session
        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripe_customer_id,
            return_url: `${baseUrl}/profile`,
        })

        return { url: session.url }
    } catch (error) {
        console.error('Error creating portal session:', error)
        return { error: 'Failed to create portal session' }
    }
}

import { headers } from 'next/headers'
import { getStripe, PLANS, SUBSCRIPTION_STATUS } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req) {
    const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is not set')
        return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await req.text()
    const headerPayload = await headers()
    const signature = headerPayload.get('stripe-signature')

    if (!signature) {
        return new Response('Missing stripe-signature header', { status: 400 })
    }

    const stripe = getStripe()
    let event

    try {
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object
                await handleSubscriptionChange(subscription)
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object
                await handleSubscriptionDeleted(subscription)
                break
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object
                if (invoice.subscription) {
                    await handlePaymentSucceeded(invoice)
                }
                break
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object
                if (invoice.subscription) {
                    await handlePaymentFailed(invoice)
                }
                break
            }

            case 'customer.subscription.trial_will_end': {
                // Optional: Send email reminder about trial ending
                const subscription = event.data.object
                console.log(`Trial ending soon for customer: ${subscription.customer}`)
                break
            }

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return new Response('Webhook processed', { status: 200 })
    } catch (error) {
        console.error('Error processing webhook:', error)
        return new Response('Webhook processing failed', { status: 500 })
    }
}

async function handleSubscriptionChange(subscription) {
    const customerId = subscription.customer
    const subscriptionId = subscription.id
    const status = subscription.status
    const trialEnd = subscription.trial_end
    const currentPeriodEnd = subscription.current_period_end

    // Map Stripe status to our status
    let subscriptionStatus
    if (status === 'trialing') {
        subscriptionStatus = SUBSCRIPTION_STATUS.TRIALING
    } else if (status === 'active') {
        subscriptionStatus = SUBSCRIPTION_STATUS.ACTIVE
    } else if (status === 'past_due') {
        subscriptionStatus = SUBSCRIPTION_STATUS.PAST_DUE
    } else if (status === 'canceled' || status === 'unpaid') {
        subscriptionStatus = SUBSCRIPTION_STATUS.CANCELED
    } else {
        subscriptionStatus = SUBSCRIPTION_STATUS.ACTIVE
    }

    const updateData = {
        subscription_plan: PLANS.TRAILBLAZER,
        subscription_status: subscriptionStatus,
        stripe_subscription_id: subscriptionId,
        trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
        subscription_ends_at: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    }

    const { error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('stripe_customer_id', customerId)

    if (error) {
        console.error('Error updating subscription:', error)
        throw error
    }

    console.log(`Subscription updated for customer ${customerId}: ${subscriptionStatus}`)
}

async function handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer

    const { error } = await supabaseAdmin
        .from('users')
        .update({
            subscription_plan: PLANS.EXPLORER,
            subscription_status: SUBSCRIPTION_STATUS.CANCELED,
            stripe_subscription_id: null,
            trial_ends_at: null,
            subscription_ends_at: null,
        })
        .eq('stripe_customer_id', customerId)

    if (error) {
        console.error('Error handling subscription deletion:', error)
        throw error
    }

    console.log(`Subscription deleted for customer ${customerId}, reverted to explorer`)
}

async function handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer

    const { error } = await supabaseAdmin
        .from('users')
        .update({
            subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        })
        .eq('stripe_customer_id', customerId)

    if (error) {
        console.error('Error handling payment success:', error)
        throw error
    }

    console.log(`Payment succeeded for customer ${customerId}`)
}

async function handlePaymentFailed(invoice) {
    const customerId = invoice.customer

    const { error } = await supabaseAdmin
        .from('users')
        .update({
            subscription_status: SUBSCRIPTION_STATUS.PAST_DUE,
        })
        .eq('stripe_customer_id', customerId)

    if (error) {
        console.error('Error handling payment failure:', error)
        throw error
    }

    console.log(`Payment failed for customer ${customerId}, marked as past_due`)
}

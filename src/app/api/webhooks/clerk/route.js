import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        throw new Error('Please add CLERK_WEBHOOK_SECRET to environment variables')
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return new Response('Missing svix headers', { status: 400 })
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Verify the webhook
    const wh = new Webhook(WEBHOOK_SECRET)
    let evt

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        })
    } catch (err) {
        console.error('Webhook verification failed:', err)
        return new Response('Webhook verification failed', { status: 400 })
    }

    const eventType = evt.type

    if (eventType === 'user.created') {
        const { id, email_addresses, first_name, last_name } = evt.data
        const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address

        // Calculate trial end date (7 days from now)
        const trialEndsAt = new Date()
        trialEndsAt.setDate(trialEndsAt.getDate() + 7)

        // Calculate first conversation reset date (first of next month)
        const conversationResetAt = new Date()
        conversationResetAt.setMonth(conversationResetAt.getMonth() + 1)
        conversationResetAt.setDate(1)
        conversationResetAt.setHours(0, 0, 0, 0)

        const { error } = await supabaseAdmin
            .from('users')
            .insert({
                id,
                email: primaryEmail,
                first_name: first_name || null,
                last_name: last_name || null,
                // Give new users a 7-day Trailblazer trial
                subscription_plan: 'trailblazer',
                subscription_status: 'trialing',
                trial_ends_at: trialEndsAt.toISOString(),
                monthly_carlo_conversations: 0,
                carlo_conversation_reset_at: conversationResetAt.toISOString(),
            })

        if (error) {
            console.error('Error creating user in Supabase:', error)
            return new Response('Error creating user', { status: 500 })
        }

        console.log(`User ${id} created in Supabase with 7-day Trailblazer trial`)
    }

    return new Response('Webhook processed', { status: 200 })
}

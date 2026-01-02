import { supabaseAdmin } from '@/lib/supabase-admin'
import { PLANS, SUBSCRIPTION_STATUS } from '@/lib/stripe'

const EXPLORER_MONTHLY_LIMIT = 5

/**
 * Check if a user can use Carlo chat
 * @param {string} userId - The user's ID
 * @returns {Promise<{allowed: boolean, reason: string, remaining: number}>}
 */
export async function canUseCarloChat(userId) {
    if (!userId) {
        return {
            allowed: false,
            reason: 'Not authenticated',
            remaining: 0,
        }
    }

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('subscription_plan, subscription_status, monthly_carlo_conversations, carlo_conversation_reset_at')
        .eq('id', userId)
        .single()

    if (error || !user) {
        return {
            allowed: false,
            reason: 'User not found',
            remaining: 0,
        }
    }

    const { subscription_plan, subscription_status, monthly_carlo_conversations, carlo_conversation_reset_at } = user

    // Check if we need to reset the monthly counter
    const now = new Date()
    const resetAt = carlo_conversation_reset_at ? new Date(carlo_conversation_reset_at) : null

    let currentConversations = monthly_carlo_conversations || 0

    // Reset counter if it's a new month
    if (!resetAt || now >= resetAt) {
        currentConversations = 0
        // Set next reset to first day of next month
        const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
        await supabaseAdmin
            .from('users')
            .update({
                monthly_carlo_conversations: 0,
                carlo_conversation_reset_at: nextReset.toISOString(),
            })
            .eq('id', userId)
    }

    // Trailblazer with active or trialing status: unlimited access
    if (
        subscription_plan === PLANS.TRAILBLAZER &&
        (subscription_status === SUBSCRIPTION_STATUS.ACTIVE || subscription_status === SUBSCRIPTION_STATUS.TRIALING)
    ) {
        return {
            allowed: true,
            reason: 'Trailblazer subscription active',
            remaining: -1, // -1 means unlimited
        }
    }

    // Explorer or canceled/past_due Trailblazer: check monthly limit
    const remaining = Math.max(0, EXPLORER_MONTHLY_LIMIT - currentConversations)

    if (currentConversations >= EXPLORER_MONTHLY_LIMIT) {
        return {
            allowed: false,
            reason: 'Monthly conversation limit reached. Upgrade to Trailblazer for unlimited conversations.',
            remaining: 0,
        }
    }

    return {
        allowed: true,
        reason: 'Explorer plan',
        remaining,
    }
}

/**
 * Increment the monthly conversation counter for a user
 * @param {string} userId - The user's ID
 */
export async function incrementCarloConversation(userId) {
    if (!userId) return

    const { data: user } = await supabaseAdmin
        .from('users')
        .select('monthly_carlo_conversations')
        .eq('id', userId)
        .single()

    const currentCount = user?.monthly_carlo_conversations || 0

    await supabaseAdmin
        .from('users')
        .update({
            monthly_carlo_conversations: currentCount + 1,
        })
        .eq('id', userId)
}

/**
 * Get subscription info for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<object>}
 */
export async function getSubscriptionInfo(userId) {
    if (!userId) {
        return null
    }

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('subscription_plan, subscription_status, trial_ends_at, subscription_ends_at, monthly_carlo_conversations')
        .eq('id', userId)
        .single()

    if (error || !user) {
        return null
    }

    return {
        plan: user.subscription_plan || PLANS.EXPLORER,
        status: user.subscription_status || SUBSCRIPTION_STATUS.ACTIVE,
        trialEndsAt: user.trial_ends_at,
        subscriptionEndsAt: user.subscription_ends_at,
        monthlyConversations: user.monthly_carlo_conversations || 0,
        conversationLimit: user.subscription_plan === PLANS.TRAILBLAZER ? -1 : EXPLORER_MONTHLY_LIMIT,
    }
}

'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function updateAiContext(aiContext) {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Unauthorized' }
    }

    // Validate length (max 1000 characters)
    if (aiContext && aiContext.length > 1000) {
        return { error: 'Context too long (max 1000 characters)' }
    }

    try {
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                ai_context: aiContext?.trim() || null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

        if (updateError) {
            console.error('Error updating ai_context:', updateError)
            return { error: 'Failed to update context' }
        }

        revalidatePath('/profile')
        revalidatePath('/carlo')
        return { success: true }
    } catch (error) {
        console.error('Error in updateAiContext:', error)
        return { error: 'An unexpected error occurred' }
    }
}

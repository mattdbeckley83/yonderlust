'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

export async function deleteItem(itemId) {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Unauthorized' }
    }

    if (!itemId) {
        return { error: 'Item ID is required' }
    }

    // Verify user owns this item
    const { data: existingItem, error: fetchError } = await supabaseAdmin
        .from('items')
        .select('id, user_id, name')
        .eq('id', itemId)
        .single()

    if (fetchError || !existingItem) {
        return { error: 'Item not found' }
    }

    if (existingItem.user_id !== userId) {
        return { error: 'Unauthorized' }
    }

    // Check if item is used in any trips
    const { count: tripCount } = await supabaseAdmin
        .from('trip_items')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId)

    // Delete from trip_items first (if any)
    if (tripCount > 0) {
        const { error: tripItemsError } = await supabaseAdmin
            .from('trip_items')
            .delete()
            .eq('item_id', itemId)

        if (tripItemsError) {
            console.error('Error deleting trip_items:', tripItemsError)
            return { error: 'Failed to remove item from trips' }
        }
    }

    // Delete the item
    const { error: deleteError } = await supabaseAdmin
        .from('items')
        .delete()
        .eq('id', itemId)

    if (deleteError) {
        console.error('Error deleting item:', deleteError)
        return { error: 'Failed to delete item' }
    }

    revalidatePath('/items')
    revalidatePath('/trips')
    return { success: true, tripCount: tripCount || 0 }
}

export async function getItemTripCount(itemId) {
    const { userId } = await auth()

    if (!userId || !itemId) {
        return { count: 0 }
    }

    const { count } = await supabaseAdmin
        .from('trip_items')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', itemId)

    return { count: count || 0 }
}

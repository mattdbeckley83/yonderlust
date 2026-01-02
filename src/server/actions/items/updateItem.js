'use server'

import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { getCategoryColor } from '@/lib/constants/colors'

export async function updateItem(formData) {
    const { userId } = await auth()

    if (!userId) {
        return { error: 'Unauthorized' }
    }

    const itemId = formData.get('item_id')
    const name = formData.get('name')
    const itemTypeId = formData.get('item_type_id')
    const brand = formData.get('brand') || null
    const categoryId = formData.get('category_id') || null
    const newCategoryName = formData.get('new_category_name') || null
    const weight = formData.get('weight') ? parseFloat(formData.get('weight')) : null
    const weightUnit = formData.get('weight_unit') || 'oz'
    const description = formData.get('description') || null
    const caloriesRaw = formData.get('calories')
    const calories = caloriesRaw ? parseInt(caloriesRaw, 10) : null

    if (!itemId) {
        return { error: 'Item ID is required' }
    }

    if (!name || name.trim() === '') {
        return { error: 'Name is required' }
    }

    if (!itemTypeId) {
        return { error: 'Type is required' }
    }

    // Verify user owns this item
    const { data: existingItem, error: fetchError } = await supabaseAdmin
        .from('items')
        .select('id, user_id')
        .eq('id', itemId)
        .single()

    if (fetchError || !existingItem) {
        return { error: 'Item not found' }
    }

    if (existingItem.user_id !== userId) {
        return { error: 'Unauthorized' }
    }

    // Handle new category creation if provided
    let finalCategoryId = categoryId
    if (newCategoryName && newCategoryName.trim()) {
        // Count user's existing categories to determine color index
        const { count, error: countError } = await supabaseAdmin
            .from('categories')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (countError) {
            console.error('Error counting categories:', countError)
            return { error: 'Failed to create category' }
        }

        // Assign color using optimized order for visual distinction
        const assignedColor = getCategoryColor(count || 0)

        const { data: newCategory, error: categoryError } = await supabaseAdmin
            .from('categories')
            .insert({
                user_id: userId,
                name: newCategoryName.trim(),
                color: assignedColor,
            })
            .select()
            .single()

        if (categoryError) {
            console.error('Error creating category:', categoryError)
            return { error: 'Failed to create category' }
        }

        finalCategoryId = newCategory.id
    }

    // Update the item
    const { data: item, error: updateError } = await supabaseAdmin
        .from('items')
        .update({
            item_type_id: itemTypeId,
            category_id: finalCategoryId,
            name: name.trim(),
            brand: brand?.trim() || null,
            weight,
            weight_unit: weightUnit,
            description: description?.trim() || null,
            calories,
            updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single()

    if (updateError) {
        console.error('Error updating item:', updateError)
        return { error: 'Failed to update item' }
    }

    revalidatePath('/gear')
    revalidatePath('/food')
    return { success: true, item }
}
